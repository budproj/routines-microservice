import { ClientNats, ClientsModule, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';

import { CronService } from '../../services/cron.service';
import { RoutineSettingsService } from '../../services/routineSettings.service';

import { SettingsController } from './settings.controller';

describe('Settings Controller', () => {
  let controller: SettingsController;
  const emitMock = jest.spyOn(ClientNats.prototype, 'emit');

  const routineSettingsServiceMock = {
    createRoutineSettings: jest.fn(),
  };

  const ModuleRef = Test.createTestingModule({
    imports: [
      ClientsModule.register([
        { name: 'NATS_SERVICE', transport: Transport.NATS },
      ]),
    ],
    controllers: [SettingsController],
    providers: [RoutineSettingsService, CronService],
  })
    .overrideProvider(RoutineSettingsService)
    .useValue(routineSettingsServiceMock);

  beforeAll(async () => {
    const CompiledModule = await ModuleRef.compile();
    controller = CompiledModule.get(SettingsController);
  });

  beforeEach(jest.resetAllMocks);

  const settings = {
    companyId: randomUUID(),
    disabledTeams: [],
    cron: '0 0 * * 5',
  };

  describe('createSettings', () => {
    it('should save only the routine settings to database', async () => {
      // Arrange
      routineSettingsServiceMock.createRoutineSettings.mockResolvedValueOnce(
        settings,
      );

      // Act
      await controller.createSettings(settings);

      // Assert
      expect(routineSettingsServiceMock.createRoutineSettings).toBeCalledTimes(
        1,
      );
      expect(routineSettingsServiceMock.createRoutineSettings).toBeCalledWith(
        settings,
      );
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
      await controller.createSettings(settings);

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
      const savedRoutine = await controller.createSettings(settings);

      // Assert
      expect(savedRoutine).toEqual(settings);
    });
  });
});
