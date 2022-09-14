import { Body, Controller, Post } from '@nestjs/common';
import { Prisma, RoutineSettings } from '@prisma/client';

import { RoutineSettingsService } from '../../services/routineSettings.service';

@Controller('/settings')
export class SettingsController {
  constructor(private routineSettings: RoutineSettingsService) {}

  @Post()
  async createSettings(
    @Body() settings: Prisma.RoutineSettingsCreateInput,
  ): Promise<RoutineSettings> {
    const createdSettings = await this.routineSettings.createRoutineSettings(
      settings,
    );

    return createdSettings;
  }
}
