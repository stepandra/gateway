# AI Agent Instructions (AGENTS.md)

Этот файл — инструкции для AI coding assistants, работающих с репозиторием **hummingbot/gateway (>= v2.11.x)**. Цель: добавить **TON (mainnet)** и коннектор **DeDust Router v2** по существующим паттернам Gateway, без TonConnect и без “новых примитивов” вне стандарта репы.

---

## Build & Command Reference || Fast Iteration (TON + DeDust only)

В этом PR трогаем только:
- `src/chains/ton/**`
- `src/connectors/dedust/**`
- соответствующие `src/templates/**`, `src/schemas/**`, `conf/*` шаблоны
- тесты: `test/chains/ton/**`, `test/connectors/dedust/**`

### Local dev (быстрая проверка руками)
- Start dev server: `pnpm start --passphrase=<PASSPHRASE> --dev`
- Проверять endpoints только для TON и DeDust:
  - `/chains/ton/status`
  - `/chains/ton/balances`
  - `/connector/dedust/router/quote*`
  - `/connector/dedust/router/swap*`

### Tests (запускать только релевантные)
Предпочтительно (точечно по файлам/папкам):
- `GATEWAY_TEST_MODE=dev jest --runInBand test/chains/ton`
- `GATEWAY_TEST_MODE=dev jest --runInBand test/connectors/dedust`

Или строго по файлу:
- `GATEWAY_TEST_MODE=dev jest --runInBand test/chains/ton/ton.test.ts`
- `GATEWAY_TEST_MODE=dev jest --runInBand test/connectors/dedust/*.test.ts`

Или “по связанным тестам” (если jest конфиг это поддерживает):
- `GATEWAY_TEST_MODE=dev jest --runInBand --findRelatedTests src/chains/ton/**/*.ts src/connectors/dedust/**/*.ts`

### Lint/format (по затронутым файлам)
Не гонять весь репо в цикле. Линтить только изменённые файлы:
- `pnpm lint -- src/chains/ton src/connectors/dedust test/chains/ton test/connectors/dedust`
Если `pnpm lint` не принимает пути — использовать:
- `npx eslint src/chains/ton src/connectors/dedust test/chains/ton test/connectors/dedust`

Формат только по затронутым:
- `pnpm format -- src/chains/ton src/connectors/dedust test/chains/ton test/connectors/dedust`
(или `npx prettier -w ...`, если скрипт не принимает пути)

### Full checks (только перед PR)
Перед PR обязательно запустить полный набор:
- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`



## Architecture Overview (Gateway v2)

### Gateway Pattern

* RESTful API gateway providing standardized endpoints for blockchain and DEX interactions
* Built with Fastify framework using TypeBox for schema validation
* Swagger documentation auto-generated at `/docs` ([http://localhost:15888/docs](http://localhost:15888/docs) in dev mode)
* Использовать стандартизированный error handling (см. изменения 2.11). ([Hummingbot][1])

### Module Organization

* **Chains**: blockchain implementations (Ethereum, Solana, + TON)

  * Chains реализуют стандартные методы (balances, tokens, status, и т.п.)
  * Singleton pattern с `getInstance()`
* **Connectors**: DEX/protocol implementations

  * Router / AMM / CLMM разнесены по route-файлам
  * Для DeDust нужен **Router**-стек: `quote` + `swap`

### API Route Structure

* Chain routes: `/chains/{chain}/{operation}`
* Connector routes: `/connectors/{dex}/{type}/{operation}`

  * Router: `/connectors/{dex}/router/quote`, `/connectors/{dex}/router/swap`
* Config routes: `/config/*`
* Wallet routes: `/wallet/*`

---

## Coding Style Guidelines

* TypeScript (ESNext target), CommonJS
* 2-space indentation
* Single quotes, semicolons required
* Error handling: **использовать централизованный/стандартизированный механизм ошибок** (см. 2.11), а не размазывать разные форматы по роутам. ([Hummingbot][1])
* Логи: только через `logger`, никакого `console.log`

---

## Project Structure (ориентир)

* `src/`

  * `chains/`
  * `connectors/`
  * `services/` (config manager, logger, wallet services)
  * `schemas/`
  * `config/` (config routes)
  * `wallet/` (wallet routes)
  * `templates/` (дефолтные конфиги, копируются в `/conf` через setup)
* `conf/` (runtime config, генерится setup-скриптом)

  * **API keys внешних сервисов централизованы в `conf/apiKeys.yml`** (это “shared config model” для external services). ([GitHub][2])
