import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Prisma, RoutineSettings } from '@prisma/client';

import { CronService } from '../../services/cron.service';
import { RoutineSettingsService } from '../../services/routineSettings.service';

@Controller('/settings')
export class SettingsController {
  constructor(
    @Inject('NATS_SERVICE') private nats: ClientProxy,
    private routineSettings: RoutineSettingsService,
    private cron: CronService,
  ) {}

  @Post()
  async createSettings(
    @Body() settings: Prisma.RoutineSettingsCreateInput,
  ): Promise<RoutineSettings> {
    const createdSettings = await this.routineSettings.createRoutineSettings(
      settings,
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
