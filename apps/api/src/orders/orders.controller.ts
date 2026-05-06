import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserType } from '../auth/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { OrderDto } from './dto/order.dto';
import { OrderListDto } from './dto/order-list.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiCookieAuth('account_id')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'List orders for the current account',
    description:
      'Список ордеров текущего пользователя, отсортированный по `createdAt desc`. ' +
      'Опциональные фильтры: `status`, `symbol` и `limit` (1..200, default 50).',
  })
  @ApiOkResponse({ type: OrderListDto })
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query() query: GetOrdersQueryDto,
  ): Promise<OrderListDto> {
    return this.orders.findForAccount(user.account.id, query);
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Place an order',
    description:
      'Размещение ордера. В MVP поддерживается только `type=MARKET` — ' +
      'исполняется сразу по текущей цене Binance, баланс и сделка ' +
      'обновляются в одной транзакции. Для `type=LIMIT` возвращается ' +
      '501 Not Implemented.',
  })
  @ApiCreatedResponse({ type: OrderDto })
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDto> {
    if (dto.type === 'LIMIT') {
      throw new NotImplementedException('LIMIT orders are not supported yet');
    }
    return this.orders.placeMarketOrder(user.account.id, dto);
  }
}
