import { NestFactory } from '@nestjs/core';

import { SettingsController } from '../controllers/settings/settings.controller';
import { AppModule } from '../app.module';

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
    cron: '0 0 * * 1',
  };

  await settings.globalRoutineSettingsCreation(user, baseSettings);
  await app.close();
}
bootstrap();
