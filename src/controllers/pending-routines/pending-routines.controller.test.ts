import { Test } from '@nestjs/testing';
import * as dayjs from 'dayjs';

import { PrismaService } from '../../infrastructure/orm/prisma.service';
import { RoutineService, Cadence } from '../../services/routines.service';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { CronService } from '../../services/cron.service';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import { User } from '../../types/User';

import { PendingRoutinesController } from './pending-routines.controller';

beforeEach(jest.resetAllMocks);

describe('Pending Routines Controller', () => {
  const routineServiceMock = {
    routine: jest.fn(),
    getTimeSpanForAnwser: jest.fn(),
  };

  const answerGroupServiceMock = {
    answerGroups: jest.fn(),
    latestAnswerFromUser: jest.fn(),
    answeredWithinTimeSpan: jest.fn(),
  };

  const cronServiceMock = {
    parse: jest.fn(),
    daysOutdated: jest.fn(),
  };

  const routineSettingsServiceMock = {
    routineSettings: jest.fn(),
    allTeamsOptedOut: jest.fn(),
  };

  const routineSettingsMock = {
    id: '922ef72a-6c3c-4075-926a-3245cdeea75f',
    companyId: '968e8d90-c1dd-4d5c-948a-067e070ea269',
    disabledTeams: [
      '968e8d90-c1dd-4d5c-948a-067e070ea269',
      'b6e555c7-3284-458f-83cd-86eb3aba08ad',
    ],
    cron: '0 0 * 0 5',
  };

  const routineMock = {
    name: 'Retrospectiva',
    cadence: Cadence.WEEKLY,
  };

  const userMock: User = {
    id: '922ef72a-6c3c-4075-926a-3245cdeea75f',
    companies: [routineSettingsMock],
    teams: [{ id: '968e8d90-c1dd-4d5c-948a-067e070ea269' }],
    permissions: [],
  };

  const answerMock = {
    id: 'a25314ed-cf0e-4bbd-89ed-c0dbe7a6c707',
    companyId: routineSettingsMock.companyId,
    userId: userMock.id,
    timestamp: new Date(),
  };

  let RoutineController: PendingRoutinesController;
  const ModuleRef = Test.createTestingModule({
    imports: [],
    controllers: [PendingRoutinesController],
    providers: [
      PrismaService,
      RoutineService,
      RoutineSettingsService,
      AnswerGroupService,
      CronService,
    ],
  })
    .overrideProvider(RoutineService)
    .useValue(routineServiceMock)
    .overrideProvider(AnswerGroupService)
    .useValue(answerGroupServiceMock)
    .overrideProvider(RoutineSettingsService)
    .useValue(routineSettingsServiceMock)
    .overrideProvider(CronService)
    .useValue(cronServiceMock);

  beforeAll(async () => {
    const CompiledModule = await ModuleRef.compile();
    RoutineController = CompiledModule.get(PendingRoutinesController);
  });

  beforeEach(() => routineServiceMock.routine.mockReturnValueOnce(routineMock));

  describe('getPendingRoutines', () => {
    it('should not return the routine if the company has no routine settings', async () => {
      // Arrange
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(null);

      // Act
      const routines = await RoutineController.getPendingRoutines(userMock);

      // Assertion
      expect(routines).toEqual([]);
      expect(routineSettingsServiceMock.routineSettings).toBeCalledWith({
        companyId: userMock.companies[0].id,
      });
    });

    it('should not return the routine if all the users teams has opted out for the routine', async () => {
      // Arrange
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        routineSettingsMock,
      );
      routineSettingsServiceMock.allTeamsOptedOut.mockReturnValueOnce(true);

      // Act
      const routines = await RoutineController.getPendingRoutines(userMock);

      // Assertion
      expect(routines).toEqual([]);
      expect(routineSettingsServiceMock.allTeamsOptedOut).toBeCalledWith(
        routineSettingsMock.disabledTeams,
        userMock.teams.map((team) => team.id),
      );
    });

    it('should return the routine if the user has never replied', async () => {
      // Arrange
      const parseReturn = {};
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        routineSettingsMock,
      );
      routineSettingsServiceMock.allTeamsOptedOut.mockReturnValueOnce(false);
      answerGroupServiceMock.latestAnswerFromUser.mockResolvedValueOnce(null);
      cronServiceMock.parse.mockReturnValueOnce(parseReturn);
      cronServiceMock.daysOutdated.mockReturnValueOnce(0);

      // Act
      const routines = await RoutineController.getPendingRoutines(userMock);

      // Assertion
      expect(routines).toEqual([
        {
          ...routineMock,
          daysOutdated: 0,
          status: {
            latestReply: undefined,
          },
        },
      ]);
      expect(answerGroupServiceMock.latestAnswerFromUser).toBeCalledWith(
        userMock.id,
      );
      expect(cronServiceMock.parse).toBeCalledWith(routineSettingsMock.cron);
      expect(cronServiceMock.daysOutdated).toBeCalledWith(parseReturn);
    });

    it('should not return the routine if the user has replied in the last 7 days', async () => {
      // Arrange
      const routineTimeSpan = 7;
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        routineSettingsMock,
      );
      routineSettingsServiceMock.allTeamsOptedOut.mockReturnValueOnce(false);
      answerGroupServiceMock.latestAnswerFromUser.mockResolvedValueOnce(
        answerMock,
      );
      routineServiceMock.getTimeSpanForAnwser.mockReturnValueOnce(
        routineTimeSpan,
      );
      answerGroupServiceMock.answeredWithinTimeSpan.mockReturnValueOnce(true);

      // Act
      const routines = await RoutineController.getPendingRoutines(userMock);

      // Assertion
      expect(routines).toEqual([]);
      expect(answerGroupServiceMock.answeredWithinTimeSpan).toBeCalledWith(
        dayjs(answerMock.timestamp).utc().toDate(),
        routineTimeSpan,
      );
    });

    it('should return the routine if the user has not replied in more then 7 days', async () => {
      // Arrange
      const routineTimeSpan = 7;
      const daysOutdated = 5;
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        routineSettingsMock,
      );
      routineSettingsServiceMock.allTeamsOptedOut.mockReturnValueOnce(false);
      answerGroupServiceMock.latestAnswerFromUser.mockResolvedValueOnce(
        answerMock,
      );
      cronServiceMock.daysOutdated.mockReturnValueOnce(daysOutdated);
      routineServiceMock.getTimeSpanForAnwser.mockReturnValueOnce(
        routineTimeSpan,
      );
      answerGroupServiceMock.answeredWithinTimeSpan.mockReturnValueOnce(false);

      // Act
      const routines = await RoutineController.getPendingRoutines(userMock);

      // Assertion
      expect(routines).toEqual([
        {
          ...routineMock,
          daysOutdated,
          status: {
            latestReply: answerMock.timestamp,
          },
        },
      ]);
    });
  });
});
