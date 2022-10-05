import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
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
    this.security.userHasPermission(user.permissions, 'routines:update:any');

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
    this.security.userHasPermission(user.permissions, 'routines:update:own');
    this.security.isUserFromCompany(user, companyId, 'routines:update:any');

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
}
