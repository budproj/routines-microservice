import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Patch,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RoutineSettings } from '@prisma/client';

import { User } from '../../decorators/user.decorator';
import { SecurityService } from '../../services/security.service';
import { User as UserType } from '../../types/User';

import { CronService } from '../../services/cron.service';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import { lastValueFrom } from 'rxjs';
import { Team } from 'src/types/Team';
import { SettingsWithoutCompany } from 'src/types/Settings';

@Controller('/settings')
export class SettingsController {
  constructor(
    @Inject('NATS_SERVICE') private nats: ClientProxy,
    private routineSettings: RoutineSettingsService,
    private cron: CronService,
    private security: SecurityService,
  ) {}

  @Post('')
  async globalRoutineSettingsCreation(
    @User() user: UserType,
    @Body() settings: SettingsWithoutCompany,
  ) {
    this.security.userHasPermission(user.permissions, 'routines:create:any');

    const companies = await lastValueFrom<Team[]>(
      this.nats.send('core-ports.get-companies', {}),
    );

    companies.forEach((company) => {
      this.createSettings(user, company.id, settings);
    });
  }

  @Post('/:companyId')
  async createSettings(
    @User() user: UserType,
    @Param() companyId: string,
    @Body() settings: SettingsWithoutCompany,
  ): Promise<RoutineSettings> {
    this.security.userHasPermission(user.permissions, 'routines:create:team');
    this.security.isUserFromCompany(user, companyId, 'routines:create:any');

    const settingsWithCompany = {
      ...settings,
      companyId,
    };

    const createdSettings = await this.routineSettings.createRoutineSettings(
      settingsWithCompany,
    );

    const routineNotificationData = {
      ...createdSettings,
      queue: 'routine-notification',
    };
    this.nats.emit('createSchedule', routineNotificationData);

    const daysToRoutineReminder = 3;
    const routineReminderCron = this.cron.addDaysToCron(
      createdSettings.cron,
      daysToRoutineReminder,
    );
    const routineReminderNotificationData = {
      ...createdSettings,
      queue: 'routine-reminder-notification',
      cron: routineReminderCron,
    };
    this.nats.emit('createSchedule', routineReminderNotificationData);

    return createdSettings;
  }

  @Patch('/:companyId')
  async updateCompanySettings(
    @User() user: UserType,
    @Param('companyId') companyId: string,
    @Body() settings: Partial<SettingsWithoutCompany>,
  ): Promise<RoutineSettings> {
    this.security.userHasPermission(user.permissions, 'routines:update:team');
    this.security.isUserFromCompany(user, companyId, 'routines:update:any');

    const newSettings = {
      disabledTeams: settings?.disabledTeams,
    };

    const updatedSettings = await this.routineSettings.updateRoutineSettings({
      where: { companyId },
      data: newSettings,
    });

    const routineNotificationData = {
      ...updatedSettings,
      queue: 'routine-notification',
    };
    this.nats.emit('updateSchedule', routineNotificationData);

    const daysToRoutineReminder = 3;
    const routineReminderCron = this.cron.addDaysToCron(
      updatedSettings.cron,
      daysToRoutineReminder,
    );
    const routineReminderNotificationData = {
      ...updatedSettings,
      queue: 'routine-reminder-notification',
      cron: routineReminderCron,
    };
    this.nats.emit('updateSchedule', routineReminderNotificationData);

    return updatedSettings;
  }
}
