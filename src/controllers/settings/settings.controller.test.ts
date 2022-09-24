import { ClientNats, ClientsModule, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';

import { SecurityService } from '../../services/security.service';
import { CronService } from '../../services/cron.service';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import { User } from '../../types/User';

import { SettingsController } from './settings.controller';
import * as rxjs from 'rxjs';

describe('Settings Controller', () => {
  let controller: SettingsController;
  const emitMock = jest.spyOn(ClientNats.prototype, 'emit');
  const sendMock = jest.spyOn(ClientNats.prototype, 'send');
  const lastValueFromMock = jest.spyOn(rxjs, 'lastValueFrom');

  const routineSettingsServiceMock = {
    createRoutineSettings: jest.fn(),
  };

  // const securityServiceMock = {
  //   useHasPermission: jest.fn(),
  // };

  const ModuleRef = Test.createTestingModule({
    imports: [
      ClientsModule.register([
        { name: 'NATS_SERVICE', transport: Transport.NATS },
      ]),
    ],
    controllers: [SettingsController],
    providers: [RoutineSettingsService, CronService, SecurityService],
  })
    .overrideProvider(RoutineSettingsService)
    .useValue(routineSettingsServiceMock);

  beforeAll(async () => {
    const CompiledModule = await ModuleRef.compile();
    controller = CompiledModule.get(SettingsController);
  });

  beforeEach(jest.resetAllMocks);

  const company = {
    id: randomUUID(),
  };

  const settings = {
    disabledTeams: [],
    cron: '0 0 * * 5',
  };

  const userMock: User = {
    id: '922ef72a-6c3c-4075-926a-3245cdeea75f',
    companies: [],
    teams: [],
    permissions: ['routines:update:own', 'routines:update:any'],
  };

  describe('createSettings', () => {
    it('should save only the routine settings to database', async () => {
      // Arrange
      routineSettingsServiceMock.createRoutineSettings.mockResolvedValueOnce(
        settings,
      );

      // Act
      await controller.createSettings(userMock, company.id, settings);

      // Assert
      expect(routineSettingsServiceMock.createRoutineSettings).toBeCalledTimes(
        1,
      );
      expect(routineSettingsServiceMock.createRoutineSettings).toBeCalledWith({
        ...settings,
        companyId: company.id,
      });
    });

    it('should schedule the routine notifications for the given company', async () => {
      // Arrange
      const createdSettings = {
        id: randomUUID(),
        ...settings,
      };
      routineSettingsServiceMock.createRoutineSettings.mockResolvedValueOnce(
        createdSettings,
      );

      // Act
      await controller.createSettings(userMock, company.id, settings);

      // Assert
      expect(emitMock).toBeCalledTimes(2);
      expect(emitMock).toBeCalledWith('createSchedule', {
        ...createdSettings,
        queue: 'routine-notification',
      });
      expect(emitMock).toBeCalledWith('createSchedule', {
        ...createdSettings,
        queue: 'routine-reminder-notification',
        cron: '0 0 * * 2',
      });
    });

    it('should return the saved routine settings', async () => {
      // Arrange
      routineSettingsServiceMock.createRoutineSettings.mockResolvedValueOnce(
        settings,
      );

      // Act
      const savedRoutine = await controller.createSettings(
        userMock,
        company.id,
        settings,
      );

      // Assert
      expect(savedRoutine).toEqual(settings);
    });
  });
});
