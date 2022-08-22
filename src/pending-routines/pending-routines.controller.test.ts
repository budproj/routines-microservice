import { Test } from '@nestjs/testing';
import * as dayjs from 'dayjs';

import { PrismaService } from '../infrastructure/orm/prisma.service';
import { RoutineService } from '../services/routines.service';
import { AnswerGroupService } from '../services/answerGroup.service';
import { CronService } from '../services/cron.service';

import { PendingRoutinesController } from './pending-routines.controller';

beforeEach(jest.resetAllMocks);

describe('Pending Routines Controller', () => {
  const routineServiceMock = {
    routines: jest.fn(),
  };
  const answerGroupServiceMock = {
    answerGroups: jest.fn(),
  };

  const ModuleRef = Test.createTestingModule({
    imports: [],
    controllers: [PendingRoutinesController],
    providers: [PrismaService, RoutineService, AnswerGroupService, CronService],
  })
    .overrideProvider(RoutineService)
    .useValue(routineServiceMock)
    .overrideProvider(AnswerGroupService)
    .useValue(answerGroupServiceMock);

  beforeEach(jest.resetAllMocks);

  describe('getPendingRoutines', () => {
    it('should an empty array if there are no pending routines', async () => {
      // Arrrange (Ajeitar)
      routineServiceMock.routines.mockResolvedValue([]);
      const CompiledModule = await ModuleRef.compile();
      const RoutineController = CompiledModule.get(PendingRoutinesController);

      // Act (Atuar)
      const pendingRoutines = await RoutineController.getPendingRoutines();

      // Assert (Afirmar)
      expect(routineServiceMock.routines).toHaveBeenCalledTimes(1);
      expect(pendingRoutines).toEqual([]);
    });

    it('should routines where the current date is equal the previous running date or less than 7 days before the next running date', async () => {
      // Arrrange (Ajeitar)
      const today = dayjs().utc();
      const sameDayRoutine = {
        id: '1',
        name: 'Routine 1',
        startDate: today.toDate(),
        cadence: 'WEEKLY',
      };
      const exactDayRoutine = {
        ...sameDayRoutine,
        startDate: today.subtract(7, 'day').toDate(),
      };
      routineServiceMock.routines
        .mockResolvedValueOnce([sameDayRoutine])
        .mockResolvedValueOnce([exactDayRoutine]);
      answerGroupServiceMock.answerGroups.mockResolvedValue([]);
      const CompiledModule = await ModuleRef.compile();
      const RoutineController = CompiledModule.get(PendingRoutinesController);

      // Act (Atuar)
      const pendingRoutinesSameDayPromise =
        RoutineController.getPendingRoutines();
      const pendingExactDayRoutinesPromise =
        RoutineController.getPendingRoutines();
      const [pendingRoutinesSameDay, pendingExactDayRoutines] =
        await Promise.all([
          pendingRoutinesSameDayPromise,
          pendingExactDayRoutinesPromise,
        ]);

      // Assert (Afirmar)
      expect(pendingRoutinesSameDay).toEqual([sameDayRoutine]);
      expect(pendingExactDayRoutines).toEqual([exactDayRoutine]);
    });

    // Esse teste só fará sentido quando tivermos rotinas que não são semanais
    it.todo(
      'should not return routines where the current date is more than 7 days before the next running date',
    );

    it('should return the pending routines that havent been answered by the user yet', async () => {
      // Arrrange (Ajeitar)
      const today = dayjs();
      const sameDayRoutine = {
        id: '1',
        name: 'Routine 1',
        startDate: today.subtract(1, 'day').toDate(),
        cadence: 'WEEKLY',
      };
      const thisWeekAnswer = {
        timestamp: today.toDate(),
      };
      const longTimeNoAnswerd = {
        timestamp: today.subtract(2, 'weeks').toDate(),
      };
      routineServiceMock.routines.mockResolvedValue([sameDayRoutine]);
      answerGroupServiceMock.answerGroups
        .mockResolvedValueOnce([thisWeekAnswer])
        .mockResolvedValueOnce([longTimeNoAnswerd]);

      const CompiledModule = await ModuleRef.compile();
      const RoutineController = CompiledModule.get(PendingRoutinesController);

      // Act (Atuar)
      const pendingRoutinesAnsweredPromise =
        RoutineController.getPendingRoutines();
      const pendingRoutinesNotAnsweredPromise =
        RoutineController.getPendingRoutines();
      const [pendingRoutinesAnswered, pendingRoutinesNotAnswered] =
        await Promise.all([
          pendingRoutinesAnsweredPromise,
          pendingRoutinesNotAnsweredPromise,
        ]);

      // Assert (Afirmar)
      expect(pendingRoutinesAnswered).toEqual([]);
      expect(pendingRoutinesNotAnswered).toEqual([sameDayRoutine]);
    });
  });
});
