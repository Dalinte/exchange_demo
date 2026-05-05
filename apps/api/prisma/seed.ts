// =====================================================================
// Prisma Seed — заполнение торговых пар
// =====================================================================
// Запускается через: npx prisma db seed
// Конфиг "prisma": { "seed": "ts-node prisma/seed.ts" } — в apps/api/package.json.
// =====================================================================

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TRADING_PAIRS = [
  {
    symbol: 'BTCUSDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    pricePrecision: 2,
    quantityPrecision: 5,
    minQuantity: '0.00001',
  },
  {
    symbol: 'ETHUSDT',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    pricePrecision: 2,
    quantityPrecision: 4,
    minQuantity: '0.0001',
  },
  {
    symbol: 'SOLUSDT',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    pricePrecision: 2,
    quantityPrecision: 3,
    minQuantity: '0.001',
  },
  {
    symbol: 'BNBUSDT',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    pricePrecision: 2,
    quantityPrecision: 3,
    minQuantity: '0.001',
  },
  {
    symbol: 'XRPUSDT',
    baseAsset: 'XRP',
    quoteAsset: 'USDT',
    pricePrecision: 4,
    quantityPrecision: 1,
    minQuantity: '1',
  },
];

async function main() {
  console.log('Seeding trading pairs...');

  for (const pair of TRADING_PAIRS) {
    await prisma.tradingPair.upsert({
      where: { symbol: pair.symbol },
      update: pair,
      create: pair,
    });
    console.log(`  ✓ ${pair.symbol}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
