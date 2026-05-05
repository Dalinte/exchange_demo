import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Decimal from 'decimal.js';
import { BinancePriceService } from '../binance/binance-price.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

type Tx = {
  balance: {
    updateMany: jest.Mock;
    upsert: jest.Mock;
  };
  order: { create: jest.Mock };
  trade: { create: jest.Mock };
};

const ACCOUNT_ID = 'acc-1';

const PAIR = {
  id: 'pair-1',
  symbol: 'BTCUSDT',
  baseAsset: 'BTC',
  quoteAsset: 'USDT',
  pricePrecision: 2,
  quantityPrecision: 5,
  minQuantity: '0.00001',
  isActive: true,
};

function createTx(): Tx {
  return {
    balance: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      upsert: jest.fn().mockResolvedValue({}),
    },
    order: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'order-1',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          clientOrderId: null,
          price: null,
          ...data,
        }),
      ),
    },
    trade: {
      create: jest.fn().mockResolvedValue({ id: 'trade-1' }),
    },
  };
}

describe('OrdersService.placeMarketOrder', () => {
  let service: OrdersService;
  let prisma: {
    tradingPair: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let binance: { getCurrentPrice: jest.Mock };
  let tx: Tx;

  beforeEach(async () => {
    tx = createTx();
    prisma = {
      tradingPair: { findUnique: jest.fn().mockResolvedValue(PAIR) },
      $transaction: jest.fn(async (fn: (t: Tx) => Promise<unknown>) => fn(tx)),
    };
    binance = {
      getCurrentPrice: jest.fn().mockResolvedValue(new Decimal('50000')),
    };

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: BinancePriceService, useValue: binance },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  it('executes BUY: spends quote, receives base, creates FILLED order + trade', async () => {
    const result = await service.placeMarketOrder(ACCOUNT_ID, {
      type: 'MARKET',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: '0.001',
    });

    expect(tx.balance.updateMany).toHaveBeenCalledWith({
      where: {
        accountId: ACCOUNT_ID,
        asset: 'USDT',
        free: { gte: '50' },
      },
      data: { free: { decrement: '50' } },
    });
    expect(tx.balance.upsert).toHaveBeenCalledWith({
      where: { accountId_asset: { accountId: ACCOUNT_ID, asset: 'BTC' } },
      update: { free: { increment: '0.001' } },
      create: { accountId: ACCOUNT_ID, asset: 'BTC', free: '0.001' },
    });
    expect(tx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: ACCOUNT_ID,
        tradingPairId: 'pair-1',
        side: 'BUY',
        type: 'MARKET',
        status: 'FILLED',
        quantity: '0.001',
        filledQuantity: '0.001',
        averageFillPrice: '50000',
      }),
    });
    expect(tx.trade.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-1',
        accountId: ACCOUNT_ID,
        tradingPairId: 'pair-1',
        side: 'BUY',
        quantity: '0.001',
        price: '50000',
        quoteAmount: '50',
      }),
    });
    expect(result).toMatchObject({ id: 'order-1', status: 'FILLED' });
  });

  it('executes SELL: spends base, receives quote', async () => {
    await service.placeMarketOrder(ACCOUNT_ID, {
      type: 'MARKET',
      symbol: 'BTCUSDT',
      side: 'SELL',
      quantity: '0.002',
    });

    expect(tx.balance.updateMany).toHaveBeenCalledWith({
      where: {
        accountId: ACCOUNT_ID,
        asset: 'BTC',
        free: { gte: '0.002' },
      },
      data: { free: { decrement: '0.002' } },
    });
    expect(tx.balance.upsert).toHaveBeenCalledWith({
      where: { accountId_asset: { accountId: ACCOUNT_ID, asset: 'USDT' } },
      update: { free: { increment: '100' } },
      create: { accountId: ACCOUNT_ID, asset: 'USDT', free: '100' },
    });
  });

  it('throws BadRequest when balance update affects zero rows (insufficient funds)', async () => {
    tx.balance.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.placeMarketOrder(ACCOUNT_ID, {
        type: 'MARKET',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '0.001',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.balance.upsert).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.trade.create).not.toHaveBeenCalled();
  });

  it('throws BadRequest for unknown trading pair without opening transaction', async () => {
    prisma.tradingPair.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.placeMarketOrder(ACCOUNT_ID, {
        type: 'MARKET',
        symbol: 'NONEUSDT',
        side: 'BUY',
        quantity: '0.001',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(binance.getCurrentPrice).not.toHaveBeenCalled();
  });

  it('throws BadRequest for inactive trading pair', async () => {
    prisma.tradingPair.findUnique.mockResolvedValueOnce({
      ...PAIR,
      isActive: false,
    });

    await expect(
      service.placeMarketOrder(ACCOUNT_ID, {
        type: 'MARKET',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '0.001',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws BadRequest when quantity rounds down below minQuantity', async () => {
    await expect(
      service.placeMarketOrder(ACCOUNT_ID, {
        type: 'MARKET',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '0.000001',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rounds quantity DOWN by quantityPrecision before debit/credit', async () => {
    await service.placeMarketOrder(ACCOUNT_ID, {
      type: 'MARKET',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: '0.0019999',
    });

    expect(tx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantity: '0.00199' }),
    });
    expect(tx.balance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { free: { increment: '0.00199' } },
      }),
    );
  });
});
