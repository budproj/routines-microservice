import { Controller, Inject, Logger } from '@nestjs/common';

import {
  ClientProxy,
  MessagePattern,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import { User } from 'src/types/User';
import { Team } from 'src/types/Team';
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
    const companyUsers = await // mudar para get users from team depois do merge
    this.nats.sendMessage<any, User[]>('core-ports.get-users-from-team', {
      teamID: routineData.companyId,
      filters: { resolveTree: true },
    });

    const filteredUsers = companyUsers
      .filter((user) => {
        const userTeamIds = user.teams.map((team) => team.id);

        const allTeamsOptedOut = this.routineSettings.allTeamsOptedOut(
          routineData.disabledTeams,
          userTeamIds,
        );
        return !allTeamsOptedOut;
      })
      .map((user) => {
        const userTeamsWithRoutineEnabled = user.teams.filter(
          (team) => !routineData.disabledTeams.includes(team.id),
        );
        return { ...user, teams: userTeamsWithRoutineEnabled };
      });

    const routineSettings = await this.routineSettings.routineSettings({
      id: routineData.id,
    });

    const cron = this.cronService.parse(routineSettings.cron);

    const dateToCalculate = cron.prev().toDate();

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
}
