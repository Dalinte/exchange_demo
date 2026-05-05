import {
  CreateOrderSchema,
  type CreateOrderDto as CreateOrderShape,
} from '@exchange/shared';
import { createZodDto } from 'nestjs-zod';

// createZodDto на discriminated union даёт класс с union-типом инстанса —
// TypeScript запрещает `extends` от такого (TS2509). Экспортируем класс как
// const (рантайм-метатип со static schema для ZodValidationPipe сохраняется),
// а одноимённый type-алиас даёт корректное сужение по type в контроллере.
const Base = createZodDto(CreateOrderSchema);

export const CreateOrderDto = Base as typeof Base &
  (new () => CreateOrderShape);
export type CreateOrderDto = CreateOrderShape;
