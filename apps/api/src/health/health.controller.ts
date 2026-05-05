import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; timestamp: number } {
    return { status: 'ok', timestamp: Date.now() };
  }
}
