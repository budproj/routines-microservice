import { Test } from '@nestjs/testing';

import { AnswerGroupService } from '../../services/answerGroup.service';
import { User } from '../../types/User';

import { AnswersController as AnswersControllerClass } from './answers.controller';
import { FormService } from '../../services/form.service';
import { MessagingService } from '../../services/messaging.service';

beforeEach(jest.resetAllMocks);

describe('Answers Controller', () => {
  const answerGroupServiceMock = {
    answerGroups: jest.fn(),
  };
  const messagingServiceMock = {
    sendMessage: jest.fn(),
  };

  const formServiceMock = {
    getRoutineForm: jest.fn(),
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

  const userMock: User = {
    id: '922ef72a-6c3c-4075-926a-3245cdeea75f',
    companies: [routineSettingsMock],
    teams: [{ id: '968e8d90-c1dd-4d5c-948a-067e070ea269' }],
    picture: '',
    firstName: 'Morty',
    lastName: 'Smith',
  };

  let AnswersController: AnswersControllerClass;
  const ModuleRef = Test.createTestingModule({
    imports: [],
    controllers: [AnswersControllerClass],
    providers: [AnswerGroupService, FormService, MessagingService],
  })
    .overrideProvider(AnswerGroupService)
    .useValue(answerGroupServiceMock)
    .overrideProvider(FormService)
    .useValue(formServiceMock)
    .overrideProvider(MessagingService)
    .useValue(messagingServiceMock);

  beforeAll(async () => {
    const CompiledModule = await ModuleRef.compile();
    AnswersController = CompiledModule.get(AnswersControllerClass);
  });

  describe('findAnswersFromTeam', () => {
    it('should filter for answers within the timespan provided in the query (before & after)', async () => {
      // arrange
      const before = '2022-09-16';
      const after = '2022-09-15';
      const query = {
        before,
        after,
      };
      const parsedQuery = {
        lte: new Date(query.before),
        gte: new Date(query.after),
      };
      messagingServiceMock.sendMessage.mockResolvedValueOnce([]);
      formServiceMock.getRoutineForm.mockReturnValueOnce([
        { type: 'emoji_scale', id: '1' },
      ]);
      answerGroupServiceMock.answerGroups.mockResolvedValueOnce([]);

      // act
      await AnswersController.findAnswersFromTeam(
        userMock,
        userMock.teams[0].id,
        query,
      );

      // assert
      expect(answerGroupServiceMock.answerGroups).toBeCalledTimes(1);
      expect(
        answerGroupServiceMock.answerGroups.mock.calls[0][0].where.timestamp,
      ).toEqual(parsedQuery);
    });
    it("should request the team and subteams's users info if includeSubteam query is set", async () => {
      // arrange

      messagingServiceMock.sendMessage.mockResolvedValueOnce([]);
      formServiceMock.getRoutineForm.mockReturnValueOnce([
        { type: 'emoji_scale', id: '1' },
      ]);
      answerGroupServiceMock.answerGroups.mockResolvedValueOnce([]);

      // act
      await AnswersController.findAnswersFromTeam(
        userMock,
        userMock.teams[0].id,
        { includeSubteams: true },
      );

      // assert
      expect(messagingServiceMock.sendMessage).toBeCalledTimes(1);
      expect(messagingServiceMock.sendMessage.mock.calls[0][1].filters).toEqual(
        {
          resolveTree: true,
        },
      );
    });
    it("should return an array of the team's users with answer details", async () => {
      // arrange
      messagingServiceMock.sendMessage.mockResolvedValueOnce([userMock]);
      formServiceMock.getRoutineForm.mockReturnValueOnce([
        { type: 'emoji_scale', id: '1' },
      ]);
      answerGroupServiceMock.answerGroups.mockResolvedValueOnce([
        {
          id: '1',
          answers: [{ value: 3 }],
          timestamp: '2022-09-15T11:09:31.143Z',
          userId: userMock.id,
        },
      ]);

      // act
      const answersOverViewReturn = await AnswersController.findAnswersFromTeam(
        userMock,
        userMock.teams[0].id,
        {},
      );

      // assert
      expect(answersOverViewReturn).toEqual([
        {
          id: '1',
          name: `${userMock.firstName} ${userMock.lastName}`,
          picture: userMock.picture,
          latestStatusReply: 3,
          timestamp: '2022-09-15T11:09:31.143Z',
        },
      ]);
    });
    it.todo(
      'should return answers for all the companies user except the disabled teams if no teamId is provided on the parameter',
    );
    it("should return an array of the team's users with lastestStatusReply, timestamp and the id undefined if the user hasn't replied", async () => {
      // arrange
      messagingServiceMock.sendMessage.mockResolvedValueOnce([userMock]);
      formServiceMock.getRoutineForm.mockReturnValueOnce([
        { type: 'emoji_scale', id: '1' },
      ]);
      answerGroupServiceMock.answerGroups.mockResolvedValueOnce([]);

      // act
      const answersOverViewReturn = await AnswersController.findAnswersFromTeam(
        userMock,
        userMock.teams[0].id,
        {},
      );

      // assert
      expect(answersOverViewReturn).toEqual([
        {
          id: undefined,
          name: `${userMock.firstName} ${userMock.lastName}`,
          picture: userMock.picture,
          latestStatusReply: undefined,
          timestamp: undefined,
        },
      ]);
    });
  });
});
