import { NotImplementedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { CurrentUserType } from '../auth/current-user.decorator';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController.create', () => {
  let controller: OrdersController;
  let service: { placeMarketOrder: jest.Mock; findForAccount: jest.Mock };

  const user = { account: { id: 'acc-1' } } as CurrentUserType;

  beforeEach(async () => {
    service = {
      placeMarketOrder: jest.fn().mockResolvedValue({ id: 'order-1' }),
      findForAccount: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: service }],
    }).compile();
    controller = module.get(OrdersController);
  });

  it('delegates MARKET order to the service', async () => {
    const result = await controller.create(user, {
      type: 'MARKET',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: '0.001',
    });

    expect(service.placeMarketOrder).toHaveBeenCalledWith('acc-1', {
      type: 'MARKET',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: '0.001',
    });
    expect(result).toEqual({ id: 'order-1' });
  });

  it('rejects LIMIT order with 501 Not Implemented', async () => {
    await expect(
      controller.create(user, {
        type: 'LIMIT',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '0.001',
        price: '50000',
      }),
    ).rejects.toBeInstanceOf(NotImplementedException);

    expect(service.placeMarketOrder).not.toHaveBeenCalled();
  });
});
