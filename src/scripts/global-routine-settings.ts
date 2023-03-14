import { NestFactory } from '@nestjs/core';

import { SettingsController } from '../controllers/settings/settings.controller';
import { AppModule } from '../app.module';
import { setTimeout } from 'node:timers/promises';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const settings = app.get(SettingsController);

  const user = {
    id: '922ef72a-6c3c-4075-926a-3245cdeea75f',
    firstName: 'Bud',
    lastName: 'Admin',
    picture: '*.jpg',
    teams: [],
    companies: [],
    permissions: [
      'routines:create:team',
      'routines:create:any',
      'routines:update:team',
      'routines:update:any',
    ],
  };

  const baseSettings = {
    disabledTeams: [],
    cron: '0 6 * * 5',
  };

  await settings.globalRoutineSettingsCreation(user, baseSettings);

  await setTimeout(1000); // Tech Debt: for some reason connections to rabbitmq do not imediatly closes

  await app.close();
}
bootstrap();
