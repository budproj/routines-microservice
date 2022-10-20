import { Injectable } from '@nestjs/common';
import { RoutineSettings, Prisma } from '@prisma/client';
import { Team } from '../../src/types/Team';
import { User } from '../../src/types/User';

import { PrismaService } from '../infrastructure/orm/prisma.service';
import { CronService } from './cron.service';

@Injectable()
export class RoutineSettingsService {
  constructor(
    private prisma: PrismaService,
    private cronService: CronService,
  ) {}

  async routineSettings(
    routineWhereUniqueInput: Prisma.RoutineSettingsWhereUniqueInput,
  ): Promise<RoutineSettings | null> {
    return this.prisma.routineSettings.findUnique({
      where: routineWhereUniqueInput,
    });
  }

  async routinesSettings(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.RoutineSettingsWhereUniqueInput;
    where?: Prisma.RoutineSettingsWhereInput;
    orderBy?: Prisma.RoutineSettingsOrderByWithRelationInput;
  }): Promise<RoutineSettings[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.routineSettings.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createRoutineSettings(
    data: Prisma.RoutineSettingsCreateInput,
  ): Promise<RoutineSettings> {
    return this.prisma.routineSettings.create({
      data,
    });
  }

  async updateRoutineSettings(params: {
    where: Prisma.RoutineSettingsWhereUniqueInput;
    data: Prisma.RoutineSettingsUpdateInput;
  }): Promise<RoutineSettings> {
    const { data, where } = params;
    return this.prisma.routineSettings.update({
      data,
      where,
    });
  }

  async updateRoutineSettingss(params: {
    where: Prisma.RoutineSettingsWhereInput;
    data: Prisma.RoutineSettingsUpdateManyMutationInput;
  }): Promise<Prisma.BatchPayload> {
    const { data, where } = params;

    return this.prisma.routineSettings.updateMany({
      where,
      data,
    });
  }

  async deleteRoutineSettings(
    where: Prisma.RoutineSettingsWhereUniqueInput,
  ): Promise<RoutineSettings> {
    return this.prisma.routineSettings.delete({
      where,
    });
  }

  allTeamsOptedOut(
    disabledTeamsIds: string[],
    userTeamsIds: string[],
  ): boolean {
    return disabledTeamsIds.length
      ? disabledTeamsIds.every((disabledTeamId) =>
          userTeamsIds.includes(disabledTeamId),
        )
      : false;
  }

  async getCurrentRoutineDate(id: string) {
    const routineSettings = await this.routineSettings({
      id: id,
    });

    const cron = this.cronService.parse(routineSettings.cron);

    return cron.prev().toDate();
  }

  userHasAtLeastOneTeamWithActiveRoutine(
    user: User,
    disabledTeamsIds: Team['id'][],
  ) {
    const userTeamIds = user.teams.map((team) => team.id);

    const allTeamsOptedOut = this.allTeamsOptedOut(
      disabledTeamsIds,
      userTeamIds,
    );
    return !allTeamsOptedOut;
  }

  removeDisabledTeamsFromUser(user: User, disabledTeamsIds: Team['id'][]) {
    const userTeamsWithRoutineEnabled = user.teams.filter(
      (team) => !disabledTeamsIds.includes(team.id),
    );
    return { ...user, teams: userTeamsWithRoutineEnabled };
  }

  teamOptedOut(disabledTeamsIds: string[], teamId: string): boolean {
    return disabledTeamsIds.includes(teamId);
  }
}
