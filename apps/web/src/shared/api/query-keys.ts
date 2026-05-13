export const queryKeys = {
  account: {
    all: ['account'] as const,
    me: () => [...queryKeys.account.all, 'me'] as const,
  },
  tradingPairs: {
    all: ['tradingPairs'] as const,
    list: () => [...queryKeys.tradingPairs.all, 'list'] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (params: { status?: string; symbol?: string; limit?: number }) =>
      [...queryKeys.orders.all, 'list', params] as const,
  },
  trades: {
    all: ['trades'] as const,
    list: (params: { symbol?: string; limit?: number }) =>
      [...queryKeys.trades.all, 'list', params] as const,
  },
} as const;
