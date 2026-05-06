import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { BinanceStreamService } from '../binance/binance-stream.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

type HealthCheckStatus = 'connected' | 'disconnected';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly binanceStream: BinanceStreamService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness + readiness probe',
    description:
      'Возвращает статус сервиса и зависимостей (БД, Binance WS). ' +
      'При degraded — HTTP 503, иначе 200.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponseDto> {
    const db = await this.checkDb();
    const binance: HealthCheckStatus = this.binanceStream.isConnected
      ? 'connected'
      : 'disconnected';
    const status: 'ok' | 'degraded' =
      db === 'connected' && binance === 'connected' ? 'ok' : 'degraded';
    if (status === 'degraded') res.status(503);
    return { status, timestamp: Date.now(), checks: { db, binance } };
  }

  private async checkDb(): Promise<HealthCheckStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch {
      return 'disconnected';
    }
  }
}
