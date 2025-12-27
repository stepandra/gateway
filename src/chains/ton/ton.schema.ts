import { Type, Static } from '@sinclair/typebox';

export const TonConfigSchema = Type.Object(
  {
    network: Type.String(),
    rpcProvider: Type.String(),
    baseUrl: Type.String(),
    commissionBuffer: Type.Number(),
    chainId: Type.Number(),
    nativeCurrencySymbol: Type.String(),
    txConfirmationTimeoutSeconds: Type.Optional(Type.Number({ default: 15 })),
    txPollIntervalSeconds: Type.Optional(Type.Number({ default: 3 })),
    useToncenterActions: Type.Optional(Type.Boolean({ default: true })),
  },
  { $id: 'TonConfig' },
);

export type TonConfig = Static<typeof TonConfigSchema>;

export const PollRequest = Type.Object({
  network: Type.Optional(Type.String({ default: 'mainnet' })),
  txHash: Type.Optional(Type.String({ description: 'Transaction hash (TON format)' })),
  signature: Type.Optional(Type.String({ description: 'Alias for txHash (hummingbot-api compatibility)' })),
});

export type PollRequestType = Static<typeof PollRequest>;

export const PollResponse = Type.Object({
  network: Type.String(),
  txHash: Type.String(),
  confirmed: Type.Boolean(),
  success: Type.Boolean(),
  exitCode: Type.Number(),
  receipt: Type.Optional(Type.Any()),
});

export type PollResponseType = Static<typeof PollResponse>;
