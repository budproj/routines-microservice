import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { Stopwatch } from '../decorators/pino.decorator';

@Injectable()
export class MessagingService {
  constructor(private readonly rabbitmq: AmqpConnection) {}

  /**
   * Sends a message to a rabbitmq routingKey and wait for it's response.
   *
   * @param routingKey the rabbitmq routingKey do send the message to
   * @param payload  the payload to be send
   */
  @Stopwatch()
  sendMessage<R>(routingKey: string, payload: unknown): Promise<R> {
    return this.rabbitmq.request<R>({
      exchange: 'bud',
      routingKey: routingKey,
      payload: payload,
    });
  }

  /**
   * Fire and forget a message to a rabbitmq topic.
   *
   * @param routingKey
   * @param data
   */
  @Stopwatch()
  async emit(routingKey, data): Promise<void> {
    await this.rabbitmq.publish('bud', routingKey, data, {
      mandatory: true,
    });
  }
}
