import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CreateMarketOrderDto,
  GetOrdersQuery,
  OrderView,
} from '@exchange/shared';
import Decimal from 'decimal.js';
import { Prisma } from '../../generated/prisma/client';
import { BinancePriceService } from '../binance/binance-price.service';
import { OrderMapper } from './order.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly binancePrice: BinancePriceService,
    private readonly orderMapper: OrderMapper,
  ) {}

  async findForAccount(
    accountId: string,
    query: GetOrdersQuery,
  ): Promise<OrderView[]> {
    let tradingPairId: string | undefined;
    if (query.symbol) {
      const pair = await this.prisma.tradingPair.findUnique({
        where: { symbol: query.symbol },
        select: { id: true },
      });
      if (!pair) return [];
      tradingPairId = pair.id;
    }

    const orders = await this.prisma.order.findMany({
      where: {
        accountId,
        ...(tradingPairId ? { tradingPairId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: { tradingPair: true },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return this.orderMapper.toViewList(orders);
  }

  async placeMarketOrder(
    accountId: string,
    dto: CreateMarketOrderDto,
  ): Promise<OrderView> {
    const pair = await this.prisma.tradingPair.findUnique({
      where: { symbol: dto.symbol },
    });
    if (!pair || !pair.isActive) {
      throw new BadRequestException('Trading pair not found or inactive');
    }

    const requestedQuantity = new Decimal(dto.quantity);
    const quantity = requestedQuantity.toDecimalPlaces(
      pair.quantityPrecision,
      Decimal.ROUND_DOWN,
    );
    const minimumQuantity = new Decimal(pair.minQuantity.toString());
    if (quantity.lt(minimumQuantity)) {
      throw new BadRequestException(
        `Quantity below minimum (${pair.minQuantity.toString()})`,
      );
    }

    const price = await this.binancePrice.getCurrentPrice(pair.symbol);
    const quoteAmount = quantity.mul(price);

    const { spendAsset, spendAmount, receiveAsset, receiveAmount } =
      dto.side === 'BUY'
        ? {
            spendAsset: pair.quoteAsset,
            spendAmount: quoteAmount,
            receiveAsset: pair.baseAsset,
            receiveAmount: quantity,
          }
        : {
            spendAsset: pair.baseAsset,
            spendAmount: quantity,
            receiveAsset: pair.quoteAsset,
            receiveAmount: quoteAmount,
          };

    const order = await this.prisma.$transaction(
      async (tx) => {
        const debit = await tx.balance.updateMany({
          where: {
            accountId,
            asset: spendAsset,
            free: { gte: spendAmount.toFixed() },
          },
          data: { free: { decrement: spendAmount.toFixed() } },
        });
        if (debit.count === 0) {
          throw new BadRequestException('Insufficient balance');
        }

        await tx.balance.upsert({
          where: { accountId_asset: { accountId, asset: receiveAsset } },
          update: { free: { increment: receiveAmount.toFixed() } },
          create: {
            accountId,
            asset: receiveAsset,
            free: receiveAmount.toFixed(),
          },
        });

        const now = new Date();
        const created = await tx.order.create({
          data: {
            accountId,
            tradingPairId: pair.id,
            side: dto.side,
            type: 'MARKET',
            status: 'FILLED',
            quantity: quantity.toFixed(),
            filledQuantity: quantity.toFixed(),
            averageFillPrice: price.toFixed(),
            filledAt: now,
          },
          include: { tradingPair: true },
        });

        await tx.trade.create({
          data: {
            orderId: created.id,
            accountId,
            tradingPairId: pair.id,
            side: dto.side,
            quantity: quantity.toFixed(),
            price: price.toFixed(),
            quoteAmount: quoteAmount.toFixed(),
          },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.orderMapper.toView(order);
  }
}
