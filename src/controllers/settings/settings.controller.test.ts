import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';

import { RoutineSettingsService } from '../../services/routineSettings.service';

import { SettingsController } from './settings.controller';

describe('Settings Controller', () => {
  let controller: SettingsController;

  const routineSettingsServiceMock = {
    createRoutineSettings: jest.fn(),
  };

  const ModuleRef = Test.createTestingModule({
    imports: [],
    controllers: [SettingsController],
    providers: [RoutineSettingsService],
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
    cron: '0 * * * 5',
  };

  describe('createSettings', () => {
    it('should save only the routine settings to database', async () => {
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
