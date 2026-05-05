import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Demo Exchange API')
    .setDescription(
      'Paper-trading exchange API. Anonymous identity is established by an httpOnly cookie `account_id`, ' +
        'created automatically on the first request.',
    )
    .setVersion('0.1.0')
    .addTag('health', 'Liveness probe')
    .addTag('account', 'Anonymous account & balances')
    .addTag('trading-pairs', 'Available markets')
    .addTag('orders', 'Order placement and history')
    .addTag('trades', 'Trade history')
    .addCookieAuth('account_id', { type: 'apiKey', in: 'cookie' }, 'account_id')
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true, withCredentials: true },
  });
}
