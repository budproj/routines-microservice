import { Controller, Get } from '@nestjs/common';
import { Routine, AnswerGroup } from '@prisma/client';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';

import { RoutineService } from '../services/routines.service';
import { AnswerGroupService } from '../services/answerGroup.service';
import { CronService } from '../services/cron.service';

interface RoutineWithAnswer extends Routine {
  answer: AnswerGroup[];
}

@Controller('/routines/pending')
export class PendingRoutinesController {
  constructor(
    private cron: CronService,
    private routine: RoutineService,
    private answerGroup: AnswerGroupService,
  ) {
    dayjs.extend(utc);
  }

  @Get()
  async getPendingRoutines(): Promise<Routine[]> {
    const userId = 'b159ef12-9062-49c6-8afc-372e8848fb15';
    const routines = await this.routine.routines({});

    const routinesForThisWeek = routines.filter((routine) => {
      const { startDate, cadence } = routine;
      const interval = this.cron.parseFromCadence(cadence, startDate);
      const previousRunningDate = interval.prev().toDate();

      const isExactDayOfRunning = dayjs()
        .utc()
        .isSame(previousRunningDate, 'day');

      if (isExactDayOfRunning) {
        return true;
      }

      const nextRunningDate = interval.next().toDate();
      const differenceInDaysFromToday = dayjs(nextRunningDate)
        .utc()
        .diff(dayjs().utc(), 'day');
      const nextRunInLessThenAWeek = differenceInDaysFromToday <= 7;
      return nextRunInLessThenAWeek;
    });

    const routinesWithAnswerPromises = routinesForThisWeek.map(
      async (routine): Promise<RoutineWithAnswer> => {
        const userAnswerForThisRoutine = await this.answerGroup.answerGroups({
          where: { userId },
          take: 1,
        });

        return {
          ...routine,
          answer: userAnswerForThisRoutine,
        };
      },
    );

    const routinesWithAnswer = await Promise.all(routinesWithAnswerPromises);
    const notAnsweredRoutines = routinesWithAnswer
      .filter((routine) => {
        if (routine.answer.length === 0) {
          return true;
        }

        const [userAnswer] = routine.answer;
        const answerDate = userAnswer.timestamp;
        const differenceInDaysFromToday = dayjs()
          .utc()
          .diff(dayjs(answerDate).utc(), 'day');

        const answeredThisWeek = differenceInDaysFromToday <= 7;
        return !answeredThisWeek;
      })
      .map((routine) => {
        delete routine.answer;
        return routine;
      });

    return notAnsweredRoutines ?? [];
  }
}
