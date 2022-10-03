import { Injectable } from '@nestjs/common';
import * as cronParser from 'cron-parser';
import { CronExpression, ParserOptions } from 'cron-parser';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';

export enum Cadence {
  WEEKLY,
}

type Timespan = {
  startDate: Date;
  finishDate: Date;
};

@Injectable()
export class CronService {
  constructor() {
    dayjs.extend(utc);
  }

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

  parse(cron: string, options?: ParserOptions): cronParser.CronExpression {
    return cronParser.parseExpression(cron, { utc: true, ...options });
  }

  prev(expression: CronExpression): cronParser.CronDate {
    return expression.prev();
  }

  parseFromCadence(cadence: Cadence, startDate: Date) {
    const cron = this.getCron(cadence, startDate);
    const interval = this.parse(cron);
    return interval;
  }

  daysOutdated(cronExpression: cronParser.CronExpression): number {
    const previousRun = cronExpression.prev();
    const previousRunDate = dayjs(previousRun.toDate()).utc();
    const currentDate = dayjs().utc().startOf('day');

    const isRunningDate = previousRunDate.diff(currentDate, 'days') === 0;
    if (isRunningDate) {
      return 0;
    }

    const nextRun = cronExpression.next();
    const nextRunDate = dayjs(nextRun.toDate()).utc();
    const daysOutdated = nextRunDate.diff(currentDate, 'days');

    return daysOutdated;
  }

  getTimespan(cronExpression: cronParser.CronExpression): Timespan {
    const startDate = cronExpression.next().toDate();
    const finishDate = dayjs(cronExpression.next().toDate())
      .subtract(1, 'day')
      .toDate();
    cronExpression.prev();
    return {
      startDate,
      finishDate,
    };
  }

  getMultipleTimespan(
    cronExpression: cronParser.CronExpression,
    timesToReturnTime: number,
  ): Timespan[] {
    const multipleTimespans: Timespan[] = [];

    for (let i = timesToReturnTime; i >= 0; i--) {
      cronExpression.prev();
    }

    for (let i = timesToReturnTime; i > 0; i--) {
      const timespan = this.getTimespan(cronExpression);

      multipleTimespans.push(timespan);
    }

    return multipleTimespans;
  }

  getCurrentExecutionDateFromTimestamp(cron: string, date: Date): Date {
    const cronExpression = this.parse(cron, {
      currentDate: date,
    });

    const nextExecutionDate = this.prev(cronExpression).toDate();

    return nextExecutionDate;
  }
}
