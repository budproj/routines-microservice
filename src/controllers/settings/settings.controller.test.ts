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
    upsertRoutineSettings: jest.fn(),
    updateRoutineSettings: jest.fn(),
    routineSettings: jest.fn(),
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
    cron: '0 6 * * 5',
  };

  const userMock: User = {
    id: '922ef72a-6c3c-4075-926a-3245cdeea75f',
    firstName: 'Test',
    lastName: 'Tester',
    picture: 'abc.jpg',
    companies: [{ id: '1234' }],
    teams: [],
    permissions: [
      'routines:update:team',
      'routines:update:any',
      'routines:create:team',
      'routines:create:any',
    ],
  };

  describe('createSettings', () => {
    it('should save only the routine settings to database', async () => {
      // Arrange
      routineSettingsServiceMock.upsertRoutineSettings.mockResolvedValueOnce(
        settings,
      );

      // Act
      const params = { companyId: company.id };
      await controller.createSettings(userMock, params, settings);

      // Assert
      expect(routineSettingsServiceMock.upsertRoutineSettings).toBeCalledTimes(
        1,
      );
      expect(routineSettingsServiceMock.upsertRoutineSettings).toBeCalledWith(
        { companyId: company.id },
        {
          ...settings,
          companyId: company.id,
        },
        { cron: settings.cron },
      );
    });

    it('should schedule the routine notifications for the given company', async () => {
      // Arrange
      const createdSettings = {
        id: randomUUID(),
        ...settings,
      };
      routineSettingsServiceMock.upsertRoutineSettings.mockResolvedValueOnce(
        createdSettings,
      );

      // Act
      const params = { companyId: company.id };
      await controller.createSettings(userMock, params, settings);

      // Assert
      expect(emitMock).toBeCalledTimes(2);
      expect(emitMock).toBeCalledWith('updateSchedule', {
        ...createdSettings,
        queue: 'routines-microservice.routine-notification',
      });
      expect(emitMock).toHaveBeenLastCalledWith('updateSchedule', {
        ...createdSettings,
        queue: 'routine-reminder-notification',
        cron: '0 6 * * 1',
      });
    });

    it('should return the saved routine settings', async () => {
      // Arrange
      routineSettingsServiceMock.upsertRoutineSettings.mockResolvedValueOnce(
        settings,
      );

      // Act
      const params = { companyId: company.id };
      const savedRoutine = await controller.createSettings(
        userMock,
        params,
        settings,
      );

      // Assert
      expect(savedRoutine).toEqual(settings);
    });
  });

  describe('globalRoutineSettingsCreation', () => {
    it("should throw an error if the user doesn't the routines:create:any role", async () => {
      // arrange
      const userWithoutPermission = {
        ...userMock,
        permissions: [],
      };

      expect(() =>
        controller.globalRoutineSettingsCreation(
          userWithoutPermission,
          settings,
        ),
      ).rejects.toBeInstanceOf(Error);
    });

    it('should query all existing companies', async () => {
      lastValueFromMock.mockResolvedValueOnce([]);

      await controller.globalRoutineSettingsCreation(userMock, settings);

      expect(sendMock).toBeCalledTimes(1);
      expect(sendMock).toBeCalledWith('core-ports.get-companies', {});
    });

    it('should create the routine settings for each company', async () => {
      const createSettingsMock = jest.spyOn(controller, 'createSettings');
      createSettingsMock.mockResolvedValue({
        id: randomUUID(),
        companyId: company.id,
        ...settings,
      });
      const otherCompany = { ...company, id: randomUUID() };
      lastValueFromMock.mockResolvedValueOnce([company, otherCompany]);

      await controller.globalRoutineSettingsCreation(userMock, settings);

      expect(createSettingsMock).toBeCalledTimes(2);
      expect(createSettingsMock).toBeCalledWith(
        userMock,
        { companyId: company.id },
        settings,
      );
      expect(createSettingsMock).toBeCalledWith(
        userMock,
        { companyId: otherCompany.id },
        settings,
      );
    });
  });

  describe('updateCompanySettings', () => {
    it('should validate if the user has permissions to update teams', async () => {
      const userWithoutPermission = {
        ...userMock,
        permissions: [],
      };

      expect(() =>
        controller.updateCompanySettings(userWithoutPermission, settings),
      ).rejects.toBeInstanceOf(Error);
    });

    it('should update the users company routines settings with the new settings', async () => {
      // arrange
      routineSettingsServiceMock.updateRoutineSettings.mockResolvedValueOnce(
        settings,
      );

      // act
      await controller.updateCompanySettings(userMock, settings);

      // assert
      expect(routineSettingsServiceMock.updateRoutineSettings).toBeCalledTimes(
        1,
      );
      expect(routineSettingsServiceMock.updateRoutineSettings).toBeCalledWith({
        where: { companyId: userMock.companies[0].id },
        data: {
          disabledTeams: settings.disabledTeams,
        },
      });
    });

    it('should emit a message to update the routine schedule with the new data', async () => {
      // arrange
      routineSettingsServiceMock.updateRoutineSettings.mockResolvedValueOnce(
        settings,
      );

      // act
      await controller.updateCompanySettings(userMock, settings);

      // assert
      expect(emitMock).toBeCalledTimes(2);
      expect(emitMock).toBeCalledWith('updateSchedule', {
        ...settings,
        queue: 'routines-microservice.routine-notification',
      });
    });

    it('should emit a message to update the reminder schedule with the new data', async () => {
      // arrange
      routineSettingsServiceMock.updateRoutineSettings.mockResolvedValueOnce(
        settings,
      );

      // act
      await controller.updateCompanySettings(userMock, settings);

      // assert
      expect(emitMock).toBeCalledTimes(2);
      expect(emitMock).toBeCalledWith('updateSchedule', {
        ...settings,
        queue: 'routine-reminder-notification',
        cron: '0 6 * * 1',
      });
    });

    it('should return the new settings info', async () => {
      // arrange
      routineSettingsServiceMock.updateRoutineSettings.mockResolvedValueOnce(
        settings,
      );

      // act
      const newSettings = await controller.updateCompanySettings(
        userMock,
        settings,
      );

      expect(newSettings).toEqual(settings);
    });
  });

  describe('getCompanySettings', () => {
    it('should get the users company routine settings', async () => {
      // arrange
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        settings,
      );

      // act
      await controller.getCompanySettings(userMock);

      // assert
      expect(routineSettingsServiceMock.routineSettings).toBeCalledTimes(1);
      expect(routineSettingsServiceMock.routineSettings).toBeCalledWith({
        companyId: userMock.companies[0].id,
      });
    });

    it('should return the users company routine settings', async () => {
      // arrange
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        settings,
      );

      // act
      const companySettings = await controller.getCompanySettings(userMock);

      // assert
      expect(companySettings).toEqual(settings);
    });
  });
});
