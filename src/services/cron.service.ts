import { Injectable } from '@nestjs/common';
import { Cadence } from '@prisma/client';
import * as cronParser from 'cron-parser';

@Injectable()
export class CronService {
  getCron(cadence: Cadence, startDate: Date): string {
    switch (cadence) {
      case Cadence.WEEKLY:
        return this.getWeeklyCron(startDate);
      default:
        throw new Error(`Cadence ${cadence} not supported`);
    }
  }

  getWeeklyCron(startDate: Date): string {
    const startDay = startDate.getDay();
    return `0 0 * * ${startDay}`;
  }

  parse(cron: string): cronParser.CronExpression {
    return cronParser.parseExpression(cron, { utc: true });
  }

  parseFromCadence(cadence: Cadence, startDate: Date) {
    const cron = this.getCron(cadence, startDate);
    const interval = this.parse(cron);
    return interval;
  }
}
