# SPEC: TON (mainnet) + DeDust Router v2

## 0. Жёсткие требования (не обсуждается)

1. **Только mainnet** (никаких devnet/testnet в конфиге/коде).
2. RPC провайдер: **Toncenter API v3**.
3. Авторизация: **`X-API-Key`**.
4. Кошелёк: **Wallet V5R1 (W5R1)**.
5. **Никакого TonConnect**. Gateway подписывает локально (mnemonic/private key), отправляет через Toncenter.

---

## 1. Toncenter API v3 (transport)

### 1.1 Endpoint’ы (v3)

* Broadcast: `POST /api/v3/message` — отправка BOC, получение `message_hash`/`message_hash_norm`. ([TON Docs][3])
* Tracking: `GET /api/v3/transactionsByMessage` (или эквивалентный v3 endpoint) — поиск транзакции по message hash. ([Hummingbot][4])

### 1.2 Auth

* Передавать ключ в заголовке: `X-API-Key: <key>`. (Toncenter принимает API key как header; это стандартно для их API). ([TON Center][5])

### 1.3 Конфигурация (shared config model)

* `conf/apiKeys.yml` — добавить ключ `toncenter` (строка). Это **единственный** источник API key для Toncenter. ([GitHub][2])
* В шаблонах (`src/templates/...`) обеспечить, что setup создаёт `conf/apiKeys.yml` с этим ключом (и что schema это валидирует).

---

## 2. Реализация Chain: TON (`src/chains/ton/`)

### 2.1 Файлы/компоненты (минимум)

* `src/chains/ton/ton.ts` — основной chain class (singleton), реализует стандартные chain операции.
* `src/chains/ton/ton.routes.ts` — REST routes `/chains/ton/*`.
* `src/chains/ton/ton.schema.ts` — TypeBox schemas для запросов/ответов.
* `src/chains/ton/toncenter-service.ts` — RPC provider service (HTTP client) для Toncenter v3:

  * добавляет `X-API-Key`
  * реализует `sendMessage(boc)` и `transactionsByMessage(hash)`.

### 2.2 Адреса

* Внутри Gateway хранить и принимать **Raw format**: `0:<hash>`.
* Любой входной `address` нормализовать в raw на границе API (route layer).
* Никакой base64url “friendly address” внутри бизнес-логики.

### 2.3 Wallet V5R1

* Не хардкодить `wallet_id`.
* Генерировать контракт кошелька через официальные/де-факто стандартные либы TON (например `@ton/core`/`@ton/crypto`), чтобы:

  * корректно строился `External Message`
  * корректно паковались internal messages
* Batching: **до 255 internal messages в одной external-транзакции** (лимит Wallet V5). Если больше — дробить на несколько внешних сообщений.

### 2.4 Отправка транзакции (каноничный поток)

1. Коннектор (DeDust) возвращает набор internal сообщений (адрес, amount, payload cell, stateInit optional, bounce flag).
2. TON chain формирует Wallet V5R1 transfer:

   * `seqno` получает с сети (toncenter v3 account/wallet state).
   * пакует internal messages (<=255).
3. Сериализует external message в BOC (base64).
4. Делает `POST /api/v3/message`.
5. Возвращает вызывающему:

   * `message_hash_norm`
   * `boc` (опционально, для дебага под флагом)

---

## 3. DeDust Router v2 (`src/connectors/dedust/`)

### 3.1 Внешние API DeDust

* Quote: `POST https://api-mainnet.dedust.io/v1/router/quote` ([DeDust][6])
* Swap: `POST https://api-mainnet.dedust.io/v1/router/swap` ([DeDust][7])

### 3.2 Gateway endpoints (Router)

* `POST /connector/dedust/router/quote`
* `POST /connector/dedust/router/swap`

### 3.3 Token mapping

Входные токены должны приниматься в 2 формах:

* **raw master address** (`0:<hash>`) для jetton
* **symbol** (например `USDT`) — резолвить через локальный token list (`conf/tokens/ton/mainnet.json`)

Нативный TON:

* В запросах DeDust передавать как `"native"` (как требует их API). ([DeDust][6])

### 3.4 quote (Price Discovery)

* Принимает `tokenIn`, `tokenOut`, `amountIn`, `slippage` (если нужно).
* Вызывает DeDust `router/quote`.
* Возвращает:

  * `amountOut`
  * `swap_data` (строго как приходит)
  * нормализованные токены (raw / native)

### 3.5 swap (Execution)

* Принимает:

  * `senderAddress` (raw, это адрес Wallet V5R1)
  * `swap_data` (из `quote`)
* Вызывает DeDust `router/swap`.
* Ответ DeDust возвращает **`transactions` (TON Connect format)**. ([DeDust][7])
  Требование: Gateway **не использует TonConnect**, но формат сообщений надо декодировать:

  * `payload` (base64) -> `Cell`
  * `stateInit` (если есть) -> `Cell`/структура init
  * `address` (получатель)
  * `amount` (нанотон)
  * `bounce` (если поле есть — уважать; не перетирай дефолтами)

Далее:

* собрать список internal messages
* передать в `TonChain.sendTransfer(...)`
* отправить через Toncenter v3 `/message`
* вернуть пользователю:

  * `message_hash_norm`
  * краткий `txSummary` (сколько internal messages, total TON out)

---

## 4. Трекинг транзакций (confirmations)

**Источник правды после broadcast**: `message_hash_norm`.

Алгоритм:

1. Сразу после `POST /api/v3/message` взять `message_hash_norm`. ([TON Docs][3])
2. Poll `GET /api/v3/transactionsByMessage?msg_hash=<message_hash_norm>` до нахождения транзакции или таймаута. ([Hummingbot][4])
3. SUCCESS/FAILED определять по результату/статусу исполнения (exit code/compute phase), используя данные v3.

Таймаут: 5 минут.

---

## 5. Safety checks (до отправки)

### 5.1 Балансы TON

* `balanceTON >= totalTonOut + 0.3 TON`
* `0.3 TON` — минимальный “буфер” (константа), но сделать конфигурируемым в chain config.

### 5.2 Jettons

* Проверить баланс jetton wallet пользователя перед swap:

  * вычислить jetton wallet address через master contract метод `get_wallet_address`
* Никаких `approve` в TON.

### 5.3 Bounce

* **Не хардкодить** `bounce=true` “потому что так хочется”.
* Если DeDust транзакция содержит bounce/stateInit — использовать как есть.

---

## 6. Конфиги и шаблоны (что должно появиться в `/conf` после setup)

### 6.1 `conf/apiKeys.yml`

Должно содержать ключ:

* `toncenter: "<TONCENTER_API_KEY>"` ([GitHub][2])

### 6.2 `conf/chains/ton/mainnet.yml` (или эквивалент по текущему шаблону Gateway)

* сеть: mainnet
* `rpcProvider: toncenter`
* `baseUrl: https://toncenter.com` (или полный prefix до `/api/v3`, как принято в реализации)
* параметры буфера комиссии (0.3 TON)

### 6.3 `conf/connectors/dedust.yml`

* дефолтные параметры router:

  * slippage (если требуется на уровне Gateway)
  * base URL DeDust mainnet

### 6.4 Token list

* `conf/tokens/ton/mainnet.json`

  * минимальный набор: TON(native) + ключевые jetton’ы (или оставить пустым, но тогда API должно принимать raw address напрямую).

---

## 7. Error handling (обязательно)

* Все новые routes (TON + DeDust) должны возвращать ошибки в **стандартизированном формате Gateway**, согласованном с 2.11. ([Hummingbot][1])
* Не плодить “свои” структуры ошибок.

---

## 8. Тесты (минимальный обязательный набор)

1. DeDust swap response -> internal messages:

   * base64 payload корректно парсится в Cell
   * stateInit корректно учитывается
2. Wallet V5R1 batching:

   * <=255 сообщений пакуется в один external message
   * > 255 режется на несколько
3. ToncenterService:

   * корректный `X-API-Key`
   * корректная сериализация тела запроса (boc base64)
4. Tracking:

   * корректный polling по `transactionsByMessage(msg_hash)`

---

## 9. Чек-лист “готово к PR”

* [ ] Только mainnet в конфиге и коде
* [ ] Toncenter v3 broadcast через `/api/v3/message`
* [ ] API key берётся только из `conf/apiKeys.yml` (ключ `toncenter`)
* [ ] Wallet только V5R1, без хардкода wallet_id
* [ ] DeDust Router v2: `quote` + `swap` реализованы
* [ ] Нет TonConnect
* [ ] Стандартизированные ошибки (2.11) и нормальные тесты

---

## Вопросы (нужны ответы, чтобы агент не “додумал”)

1. Какие jetton’ы ты хочешь положить в дефолтный `conf/tokens/ton/mainnet.json` (минимум: USDT + что ещё)?
2. Toncenter base URL фиксируем как `https://toncenter.com` (а путь `/api/v3` в коде), или хочешь хранить в конфиге уже полный `https://toncenter.com/api/v3`?

[1]: https://hummingbot.org/release-notes/2.11.0/ "2.11.0 - Hummingbot"
[2]: https://github.com/hummingbot/gateway "GitHub - hummingbot/gateway: Middleware that standardizes DEX API endpoints on different blockchain networks"
[3]: https://docs.ton.org/ecosystem/api/toncenter/v3/legacy-v2-compatible/send-external-message-boc?utm_source=chatgpt.com "Send external message (BoC) - TON Docs"
[4]: https://hummingbot.org/gateway/installation/?utm_source=chatgpt.com "Installation & Setup"
[5]: https://toncenter.com/api/v2/?utm_source=chatgpt.com "TON Center API v2"
[6]: https://hub.dedust.io/apis/router-v2/quote/ "Returns a quote for swapping between two assets | DeDust Developer Hub"
[7]: https://hub.dedust.io/apis/router-v2/swap/ "Builds swap message | DeDust Developer Hub"
