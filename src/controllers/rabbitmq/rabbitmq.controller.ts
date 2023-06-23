import { defaultNackErrorHandler, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Controller, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { Payload } from '@nestjs/microservices';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import { User as UserType } from 'src/types/User';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { MessagingService } from '../../services/messaging.service';
import { CronService } from '../../services/cron.service';
import { FormService } from '../../services/form.service';
import { RoutineFormLangs } from '../../services/constants/form';
import { Stopwatch } from '../../decorators/pino.decorator';
import { Cacheable } from '../../decorators/cacheable.decorator';

interface RoutineData {
  id: string;
  companyId: string;
  disabledTeams: string[];
}

@Controller('/')
export class RabbitMqController {
  constructor(
    private messaging: MessagingService,
    private routineSettings: RoutineSettingsService,
    private cronService: CronService,
    private answerGroupService: AnswerGroupService,
    private formService: FormService,
  ) {}

  private readonly logger = new Logger(RabbitMqController.name);

  @RabbitRPC({
    exchange: 'bud',
    queue: 'routines-microservice.health-check',
    routingKey: 'routines-microservice.health-check',
    errorHandler: defaultNackErrorHandler,
    queueOptions: {
      deadLetterExchange: 'dead',
      deadLetterRoutingKey: 'dead',
    },
  })
  async onHealthCheck(@Payload() data: { id: string; reply: string }) {
    await this.messaging.emit(data.reply, true);
  }

  @RabbitRPC({
    exchange: 'bud',
    queue: 'routines-microservice.user-last-routine',
    routingKey: 'routines-microservice.user-last-routine',
    errorHandler: defaultNackErrorHandler,
    queueOptions: {
      deadLetterExchange: 'dead',
      deadLetterRoutingKey: 'dead',
    },
  })
  async userLastRoutine(@Payload() data: { user: UserType }) {
    const form = this.formService.getRoutineForm(RoutineFormLangs.PT_BR);
    const questions = form.filter(
      (question) =>
        question.type === 'emoji_scale' ||
        question.type === 'value_range' ||
        question.type === 'road_block',
    );
    const questionsId = questions.map((question) => question.id);
    const routine = await this.routineSettings.routineSettings({
      companyId: data.user.companies[0].id,
    });

    if (!routine) {
      return [];
    }

    const parsedCron = this.cronService.parse(routine.cron);
    const { finishDate, startDate } = this.cronService.getTimespan(parsedCron);

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        userId: data.user.id,
        timestamp: {
          lte: finishDate,
          gte: startDate,
        },
      },
      include: {
        answers: {
          where: {
            questionId: { in: questionsId },
          },
        },
      },
    });

    return answerGroups;
  }

  @Cacheable('0', 60 * 60)
  private async getUsersFromTeam(payload: unknown) {
    return await this.messaging.sendMessage<UserType[]>(
      'business.core-ports.get-users-from-team',
      payload,
    );
  }

  @Stopwatch()
  @RabbitRPC({
    exchange: 'bud',
    queue: 'routines-microservice.routine-notification',
    routingKey: 'routines-microservice.routine-notification',
    errorHandler: defaultNackErrorHandler,
    queueOptions: {
      deadLetterExchange: 'dead',
      deadLetterRoutingKey: 'dead',
    },
  })
  async routineNotification(@Payload() routineData: RoutineData) {
    this.logger.log(
      'New routine notification message with data %o',
      routineData,
    );

    const companyUsers = await this.getUsersFromTeam({
      teamID: routineData.companyId,
      filters: { resolveTree: true, withTeams: true },
    });

    this.logger.log(`Got ${companyUsers.length} total users in company`);

    const filteredUsers = companyUsers
      .filter((user) => {
        return this.routineSettings.userHasAtLeastOneTeamWithActiveRoutine(
          user,
          routineData.disabledTeams,
        );
      })
      .map((user) => {
        return this.routineSettings.removeDisabledTeamsFromUser(
          user,
          routineData.disabledTeams,
        );
      });


    this.logger.log(`Got ${filteredUsers.length} total users in company`);

    const dateToCalculate = await this.routineSettings.getCurrentRoutineDate(
      routineData.id,
    );

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        timestamp: { gte: dateToCalculate },
        companyId: routineData.companyId,
      },
    });

    this.logger.log(`Got ${answerGroups.length} answer groups`);

    const usersWithPendingRoutines = filteredUsers.filter((user) => {
      return !answerGroups.some(
        (answerGroup) => answerGroup.userId === user.id,
      );
    });

    this.logger.log(`Got ${usersWithPendingRoutines.length} users with pending routines`);

    const pendenciesPayload = {
      companyUsers,
      usersWithPendingRoutines,
    };
    await this.messaging.emit(
      'business.notification-ports.pendencies-notification',
      pendenciesPayload,
    );
  }

  @Stopwatch()
  @RabbitRPC({
    exchange: 'bud',
    queue: 'routines-microservice.routine-reminder-notification',
    routingKey: 'routines-microservice.routine-reminder-notification',
    errorHandler: defaultNackErrorHandler,
    queueOptions: {
      deadLetterExchange: 'dead',
      deadLetterRoutingKey: 'dead',
    },
  })
  async routineReminder(@Payload() routineData: RoutineData) {
    this.logger.log(
      'New routine reminder notification message with data %o',
      routineData,
    );

    const companyUsers = await this.getUsersFromTeam({
      teamID: routineData.companyId,
      filters: { resolveTree: true, withTeams: true },
    });

    this.logger.log(`Got ${companyUsers.length} total users in company`);

    const filteredUsers = companyUsers
      .filter((user) =>
        this.routineSettings.userHasAtLeastOneTeamWithActiveRoutine(
          user,
          routineData.disabledTeams,
        ),
      )
      .map((user) =>
        this.routineSettings.removeDisabledTeamsFromUser(
          user,
          routineData.disabledTeams,
        ),
      );

    this.logger.log(`Got  ${filteredUsers.length} users`);

    const dateToCalculate = await this.routineSettings.getCurrentRoutineDate(
      routineData.id,
    );

    // FIXME: replace with date-fns#startOfDay
    dateToCalculate.setHours(0);
    dateToCalculate.setMinutes(0);
    dateToCalculate.setSeconds(0);

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        timestamp: { gte: dateToCalculate },
        companyId: routineData.companyId,
      },
    });

    this.logger.log(`Got  ${answerGroups.length} answer groups`);

    if (answerGroups.length > 0) {
      const timestamp = new Date().toISOString();

      const messages = filteredUsers
        .map((user) =>
          user.teams.map((team) => ({
            messageId: randomUUID(),
            type: 'routineReminder',
            timestamp: timestamp,
            recipientId: user.authzSub,
            properties: {
              sender: {},
              team: {
                name: team?.name ?? '',
                id: team.id,
              },
            },
          })),
        )
        .flat();

      this.logger.log(`Got  ${messages.length} messages to send`);

      const messagesPromises = messages.map(async (message) => {
        this.logger.log('Sending notification', message);
        await this.messaging.emit(
          'notifications-microservice.notification',
          message,
        );
      });

      await Promise.all(messagesPromises);
    }
  }

  @RabbitRPC({
    exchange: 'bud',
    queue: 'routines-microservice.get-answer-group-data',
    routingKey: 'routines-microservice.get-answer-group-data',
    errorHandler: defaultNackErrorHandler,
    queueOptions: {
      deadLetterExchange: 'dead',
      deadLetterRoutingKey: 'dead',
    },
  })
  async getAnswerGroupData(@Payload() { id }: { id: string }) {
    this.logger.log('get Answer Group', { id });

    const answerGroup = await this.answerGroupService.answerGroup({ id });
    this.logger.verbose('got Answer Group', { answerGroup });
    return answerGroup;
  }
}
