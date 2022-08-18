import { Controller, Inject, Logger } from '@nestjs/common';

import {
  ClientProxy,
  MessagePattern,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { HealthCheckDBService } from './healthcheck.db.service';

@Controller()
export class NatsController {
  constructor(
    private healthCheckDB: HealthCheckDBService,
    @Inject('NATS_SERVICE') private client: ClientProxy,
  ) {}

  private readonly logger = new Logger(NatsController.name);

  @MessagePattern('health-check', Transport.NATS)
  async onHealthCheck(@Payload() data: { id: string; reply: string }) {
    const response = await this.healthCheckDB.patch(data.id);

    this.client.emit(data.reply, true);
  }
}
