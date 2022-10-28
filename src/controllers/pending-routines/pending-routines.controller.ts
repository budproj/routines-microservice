import { Controller, Get, Logger } from '@nestjs/common';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';

import { User } from '../../decorators/user.decorator';
import { User as UserType } from '../../types/User';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { CronService } from '../../services/cron.service';
import { RoutineService } from '../../services/routines.service';
import { RoutineSettingsService } from '../../services/routineSettings.service';

import { pendingRoutineSerializer } from './pending-routines.serializer';

@Controller('/pending')
export class PendingRoutinesController {
  private readonly logger = new Logger(PendingRoutinesController.name);

  constructor(
    private cron: CronService,
    private routine: RoutineService,
    private routineSettings: RoutineSettingsService,
    private answerGroup: AnswerGroupService,
  ) {
    dayjs.extend(utc);
  }

  @Get()
  async getPendingRoutines(@User() user: UserType): Promise<any> {
    const [company] = user.companies;
    const routine = this.routine.routine();
    const companyRoutineSettings = await this.routineSettings.routineSettings({
      companyId: company.id,
    });

    if (!companyRoutineSettings) {
      return [];
    }

    const userTeamIds = user.teams.map((team) => team.id);
    const allTeamsOptedOut = this.routineSettings.allTeamsOptedOut(
      companyRoutineSettings.disabledTeams,
      userTeamIds,
    );

    if (allTeamsOptedOut) {
      return [];
    }

    const latestAnswer = await this.answerGroup.latestAnswerFromUser(user.id);
    const cronExpression = this.cron.parse(companyRoutineSettings.cron);
    const daysOutdated = this.cron.daysOutdated(cronExpression);

    if (!latestAnswer) {
      const serializedRoutine = pendingRoutineSerializer(routine, daysOutdated);
      return [serializedRoutine];
    }

    const answerDate = latestAnswer.timestamp;
    const answerUtc = dayjs(answerDate).utc();
    const answerUtcDate = answerUtc.toDate();

    const timeSpanForAnwser = this.cron.getTimespan(cronExpression);
    const answeredWithinTimeSpan = this.answerGroup.answeredWithinTimeSpan(
      answerUtcDate,
      timeSpanForAnwser.startDate,
    );

    if (answeredWithinTimeSpan) {
      return [];
    }

    const serializedRoutine = pendingRoutineSerializer(
      routine,
      daysOutdated,
      answerUtcDate,
    );
    return [serializedRoutine];
  }
}
