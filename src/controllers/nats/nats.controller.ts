import { Controller, Logger } from '@nestjs/common';

import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import { User } from 'src/types/User';
import { HealthCheckDBService } from '../../services/healthcheck.db.service';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { MessagingService } from '../../services/messaging.service';
import { CronService } from '../../services/cron.service';
import { randomUUID } from 'crypto';

@Controller()
export class NatsController {
  constructor(
    private healthCheckDB: HealthCheckDBService,
    private nats: MessagingService,
    private routineSettings: RoutineSettingsService,
    private answerGroupService: AnswerGroupService,
    private cronService: CronService,
  ) {}

  private readonly logger = new Logger(NatsController.name);

  @MessagePattern('health-check', Transport.NATS)
  async onHealthCheck(@Payload() data: { id: string; reply: string }) {
    const response = await this.healthCheckDB.patch(data.id);

    this.nats.emit(data.reply, true);
  }
  @MessagePattern('routine-notification', Transport.NATS)
  async routineNotification(
    @Payload()
    routineData: {
      id: string;
      companyId: string;
      disabledTeams: string[];
    },
  ) {
    const companyUsers = await this.nats.sendMessage<any, User[]>(
      'core-ports.get-users-from-team',
      {
        teamID: routineData.companyId,
        filters: { resolveTree: true, withTeams: true },
      },
    );

    const filteredUsers = companyUsers
      .filter((user) => {
        const teste =
          this.routineSettings.userHasAtLeastOneTeamWithActiveRoutine(
            user,
            routineData.disabledTeams,
          );
        return teste;
      })
      .map((user) => {
        const test = this.routineSettings.removeDisabledTeamsFromUser(
          user,
          routineData.disabledTeams,
        );
        return test;
      });

    const dateToCalculate = await this.routineSettings.getCurrentRoutineDate(
      routineData.id,
    );

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        timestamp: { gte: dateToCalculate },
        companyId: routineData.companyId,
      },
    });

    const usersWithPendingRoutines = filteredUsers.filter((user) => {
      return !answerGroups.some(
        (answerGroup) => answerGroup.userId === user.id,
      );
    });

    this.nats.sendMessage('notification-ports.PENDENCIES-NOTIFICATION', {
      companyUsers,
      usersWithPendingRoutines,
    });

    const timestamp = new Date().toISOString();

    const messages = usersWithPendingRoutines
      .map((user) =>
        user.teams.map((team) => ({
          messageId: randomUUID(),
          type: 'routine',
          timestamp: timestamp,
          recipientId: user.authzSub,
          properties: {
            sender: {},
            team: {
              name: team.name,
              id: team.id,
            },
          },
        })),
      )
      .flat();

    messages.forEach((message) =>
      this.nats.sendMessage('notification', message),
    );
  }

  @MessagePattern('routine-reminder-notification', Transport.NATS)
  async routineReminder(
    @Payload()
    routineData: {
      id: string;
      companyId: string;
      disabledTeams: string[];
    },
  ) {
    const companyUsers = await this.nats.sendMessage<any, User[]>(
      'core-ports.get-users-from-team',
      {
        teamID: routineData.companyId,
        filters: { resolveTree: true, withTeams: true },
      },
    );

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

    const dateToCalculate = await this.routineSettings.getCurrentRoutineDate(
      routineData.id,
    );

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        timestamp: { gte: dateToCalculate },
        companyId: routineData.companyId,
      },
    });

    if (answerGroups.length > 0) {
      const timestamp = new Date().toISOString();

      const messages = filteredUsers
        .map((user) =>
          user.teams.map((team) => ({
            messageId: randomUUID(),
            type: 'routine',
            timestamp: timestamp,
            recipientId: user.authzSub,
            properties: {
              sender: {},
              team: {
                name: team.name,
                id: team.id,
              },
            },
          })),
        )
        .flat();

      messages.forEach((message) =>
        this.nats.sendMessage('notification', message),
      );
    }
  }
}
