import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class MessagingService {
  constructor(@Inject('NATS_SERVICE') private nats: ClientProxy) {}
  async sendMessage<T, R>(channel: string, data: T): Promise<R> {
    return lastValueFrom<R>(this.nats.send(channel, data));
  }

  async emit(pattern, data) {
    this.nats.send(pattern, data);
  }
}
