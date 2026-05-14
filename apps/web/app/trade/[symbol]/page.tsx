import { TradeTerminal } from '@/pages/trade';

export default async function TradePage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <TradeTerminal initialSymbol={symbol.toUpperCase()} />;
}
