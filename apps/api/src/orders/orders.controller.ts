import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserType } from '../auth/current-user.decorator';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
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
}
