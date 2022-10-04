import { Injectable } from '@nestjs/common';
import * as cronParser from 'cron-parser';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';

export enum Cadence {
  WEEKLY,
}

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

  parse(cron: string): cronParser.CronExpression {
    return cronParser.parseExpression(cron, { utc: true });
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

  addDaysToCron(cron: string, daysToAdd: number): string {
    const cronData = cron
      .split(' ')
      .map((step, index, steps) => {
        if (index === steps.length - 1) {
          if (step === '*') {
            return step;
          }

          const cronDaysMaxRange = 6;
          const nextStepDay = Number(step) + daysToAdd;

          return nextStepDay > cronDaysMaxRange
            ? nextStepDay - cronDaysMaxRange
            : nextStepDay;
        }

        return step;
      })
      .join(' ');

    return cronData;
  }
}
