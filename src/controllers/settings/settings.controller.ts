import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';
import { RoutineSettings } from '@prisma/client';

import { User } from '../../decorators/user.decorator';
import { SecurityService } from '../../services/security.service';
import { User as UserType } from '../../types/User';

import { CronService } from '../../services/cron.service';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import { Team } from 'src/types/Team';
import { SettingsWithoutCompany } from 'src/types/Settings';
import { MessagingService } from 'src/services/messaging.service';

@Controller('/settings')
export class SettingsController {
  constructor(
    private routineSettings: RoutineSettingsService,
    private cron: CronService,
    private security: SecurityService,
    private messaging: MessagingService,
  ) {}

  @Post('')
  async globalRoutineSettingsCreation(
    @User() user: UserType,
    @Body() settings: SettingsWithoutCompany,
  ) {
    this.security.userHasPermission(user.permissions, 'routines:create:any');

    const companies = await this.messaging.sendMessage<Team[]>(
      'business.core-ports.get-companies',
      {},
    );

    const createPromises = companies.map((company) => {
      return this.createSettings(user, { companyId: company.id }, settings);
    });

    await Promise.all(createPromises);
  }

  @Post('/:companyId')
  async createSettings(
    @User() user: UserType,
    @Param() { companyId }: { companyId: string },
    @Body() settings: SettingsWithoutCompany,
  ): Promise<RoutineSettings> {
    this.security.userHasPermission(user.permissions, 'routines:create:team');
    this.security.isUserFromCompany(user, companyId, 'routines:create:any');

    const settingsWithCompany = {
      ...settings,
      companyId,
    };

    const createdSettings = await this.routineSettings.upsertRoutineSettings(
      { companyId },
      settingsWithCompany,
      { cron: settings.cron },
    );

    const routineNotificationData = {
      ...createdSettings,
      queue: 'routines-microservice.routine-notification',
      uniqueIdentifier: `${createdSettings.companyId}.answer-routine`,
    };
    await this.messaging.emit(
      'scheduler-microservice:updateSchedule',
      routineNotificationData,
    );

    const routineReminderCron = '0 6 * * 1';

    const routineReminderNotificationData = {
      ...createdSettings,
      queue: 'routines-microservice.routine-reminder-notification',
      cron: routineReminderCron,
      uniqueIdentifier: `${createdSettings.companyId}.reminder-routine`,
    };
    await this.messaging.emit(
      'scheduler-microservice:updateSchedule',
      routineReminderNotificationData,
    );

    return createdSettings;
  }

  @Patch()
  async updateCompanySettings(
    @User() user: UserType,
    @Body() settings: Partial<SettingsWithoutCompany>,
  ): Promise<RoutineSettings> {
    this.security.userHasPermission(user.permissions, 'routines:update:team');
    const userCompany = user.companies[0];
    const companyId = userCompany.id;

    const newSettings = {
      disabledTeams: settings?.disabledTeams,
    };

    const updatedSettings = await this.routineSettings.updateRoutineSettings({
      where: { companyId },
      data: newSettings,
    });

    const routineNotificationData = {
      ...updatedSettings,
      queue: 'routines-microservice.routine-notification',
      uniqueIdentifier: `${updatedSettings.companyId}.answer-routine`,
    };
    await this.messaging.emit(
      'scheduler-microservice:updateSchedule',
      routineNotificationData,
    );

    const routineReminderCron = '0 6 * * 1';

    const routineReminderNotificationData = {
      ...updatedSettings,
      queue: 'routines-microservice.routine-reminder-notification',
      cron: routineReminderCron,
      uniqueIdentifier: `${updatedSettings.companyId}.reminder-routine`,
    };
    await this.messaging.emit(
      'scheduler-microservice:updateSchedule',
      routineReminderNotificationData,
    );

    return updatedSettings;
  }

  @Get()
  async getCompanySettings(@User() user: UserType): Promise<RoutineSettings> {
    const userCompany = user.companies[0];
    const companySettings = await this.routineSettings.routineSettings({
      companyId: userCompany.id,
    });

    return companySettings;
  }
}
