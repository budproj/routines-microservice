import { Test } from '@nestjs/testing';

import { AnswerGroupService } from '../../services/answerGroup.service';
import { User } from '../../types/User';

import { AnswersController as AnswersControllerClass } from './answers.controller';
import { FormService } from '../../services/form.service';
import { MessagingService } from '../../services/messaging.service';
import { SecurityService } from '../../services/security.service';
import { RoutineSettingsService } from '../../services/routineSettings.service';

beforeEach(jest.resetAllMocks);

describe('Answers Controller', () => {
  const answerGroupServiceMock = {
    answerGroups: jest.fn(),
    parseAnswerTimestamp: jest.fn(),
  };
  const messagingServiceMock = {
    sendMessage: jest.fn(),
  };

  const formServiceMock = {
    getRoutineForm: jest.fn(),
  };

  const securityServiceMock = {
    isUserFromCompany: jest.fn(),
  };

  const routineSettingsServiceMock = {
    routineSettings: jest.fn(),
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
    permissions: [],
  };

  let AnswersController: AnswersControllerClass;
  const ModuleRef = Test.createTestingModule({
    imports: [],
    controllers: [AnswersControllerClass],
    providers: [
      AnswerGroupService,
      FormService,
      MessagingService,
      SecurityService,
      RoutineSettingsService,
    ],
  })
    .overrideProvider(AnswerGroupService)
    .useValue(answerGroupServiceMock)
    .overrideProvider(FormService)
    .useValue(formServiceMock)
    .overrideProvider(MessagingService)
    .useValue(messagingServiceMock)
    .overrideProvider(RoutineSettingsService)
    .useValue(routineSettingsServiceMock)
    .overrideProvider(SecurityService)
    .useValue(securityServiceMock);

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
      messagingServiceMock.sendMessage
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([userMock]);
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

      messagingServiceMock.sendMessage
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([userMock]);
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
      expect(messagingServiceMock.sendMessage).toBeCalledTimes(2);
      expect(messagingServiceMock.sendMessage.mock.calls[1][1].filters).toEqual(
        {
          resolveTree: true,
        },
      );
    });
    it("should return an array of the team's users with answer details", async () => {
      // arrange
      messagingServiceMock.sendMessage
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([userMock]);
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
          userId: userMock.id,
        },
      ]);
    });
    it('should return answers for all the companies user except the disabled teams if no teamId is provided on the parameter', async () => {
      // arrange
      messagingServiceMock.sendMessage
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([userMock]);
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
      await AnswersController.findAnswersFromTeam(userMock, undefined, {});

      // assert
      expect(securityServiceMock.isUserFromCompany).toBeCalledTimes(1);
      expect(answerGroupServiceMock.answerGroups).toBeCalledTimes(1);
      expect(messagingServiceMock.sendMessage.mock.calls[1][1].filters).toEqual(
        { resolveTree: true },
      );
      expect(messagingServiceMock.sendMessage.mock.calls[1][1].teamID).toBe(
        userMock.companies[0].id,
      );
    });
    it("should return an array of the team's users with lastestStatusReply, timestamp and the id undefined if the user hasn't replied", async () => {
      // arrange
      messagingServiceMock.sendMessage
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([userMock]);
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
          userId: userMock.id,
        },
      ]);
    });
  });

  describe('findOverviewFromTeam', () => {
    it('should return an object of overview containing the feeling and productivity with an empty array', async () => {
      // arrange
      messagingServiceMock.sendMessage
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([userMock]);
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        routineSettingsMock,
      );
      formServiceMock.getRoutineForm.mockReturnValueOnce([
        { type: 'emoji_scale', id: '1' },
        { type: 'value_range', id: '2' },
      ]);
      answerGroupServiceMock.answerGroups.mockResolvedValueOnce([]);

      // act
      const teamOverview = await AnswersController.findOverviewFromTeam(
        userMock,
        userMock.teams[0].id,
      );
      // assert
      expect(teamOverview).toEqual([]);
    });

    it('should return an object of overview containing the feeling and productivity weekly mean from team users answers', async () => {
      // arrange
      messagingServiceMock.sendMessage
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([userMock]);
      formServiceMock.getRoutineForm.mockReturnValueOnce([
        { type: 'emoji_scale', id: '1' },
        { type: 'value_range', id: '2' },
      ]);
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        routineSettingsMock,
      );

      const answerGroupsMocks = [
        {
          id: '1',
          answers: [
            { value: 1, questionId: '1' },
            { value: 3, questionId: '2' },
          ],
          timestamp: '2022-09-15T11:09:31.143Z',
          userId: userMock.id,
        },
        {
          id: '1',
          answers: [
            { value: 1, questionId: '1' },
            { value: 3, questionId: '2' },
          ],
          timestamp: '2022-09-15T11:09:31.143Z',
          userId: userMock.id,
        },
        {
          id: '1',
          answers: [
            { value: 1, questionId: '1' },
            { value: 3, questionId: '2' },
          ],
          timestamp: '2022-09-15T11:09:31.143Z',
          userId: userMock.id,
        },
      ];
      answerGroupServiceMock.answerGroups.mockResolvedValueOnce(
        answerGroupsMocks,
      );

      answerGroupsMocks.forEach((mock) =>
        answerGroupServiceMock.parseAnswerTimestamp.mockReturnValueOnce(mock),
      );

      // act
      const teamOverview = await AnswersController.findOverviewFromTeam(
        userMock,
        userMock.teams[0].id,
      );

      // assert
      expect(teamOverview).toEqual({
        overview: {
          feeling: [
            {
              average: 1,
              timestamp: '2022-09-15T11:09:31.143Z',
            },
          ],
          productivity: [
            {
              average: 3,
              timestamp: '2022-09-15T11:09:31.143Z',
            },
          ],
        },
      });
    });

    it('should return an object of overview containing the feeling and productivity weekly mean from team and subteams users answers', async () => {
      // arrange
      messagingServiceMock.sendMessage
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([userMock]);
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        routineSettingsMock,
      );
      formServiceMock.getRoutineForm.mockReturnValueOnce([
        { type: 'emoji_scale', id: '1' },
        { type: 'value_range', id: '2' },
      ]);
      const answerGroupsMocks = [
        {
          id: '1',
          answers: [
            { value: 1, questionId: '1' },
            { value: 3, questionId: '2' },
          ],
          timestamp: '2022-09-15T11:09:31.143Z',
          userId: userMock.id,
        },
        {
          id: '1',
          answers: [
            { value: 1, questionId: '1' },
            { value: 3, questionId: '2' },
          ],
          timestamp: '2022-09-15T11:09:31.143Z',
          userId: userMock.id,
        },
        {
          id: '1',
          answers: [
            { value: 1, questionId: '1' },
            { value: 3, questionId: '2' },
          ],
          timestamp: '2022-09-15T11:09:31.143Z',
          userId: userMock.id,
        },
      ];
      answerGroupServiceMock.answerGroups.mockResolvedValueOnce(
        answerGroupsMocks,
      );

      answerGroupsMocks.forEach((mock) =>
        answerGroupServiceMock.parseAnswerTimestamp.mockReturnValueOnce(mock),
      );
      // act
      await AnswersController.findOverviewFromTeam(
        userMock,
        userMock.teams[0].id,
        true,
      );
      // assert
      expect(messagingServiceMock.sendMessage).toBeCalledTimes(2);
      expect(messagingServiceMock.sendMessage.mock.calls[1][1].filters).toEqual(
        {
          resolveTree: true,
        },
      );
    });

    it('should map the answer groups overriding the answer timestamp to the date of the beggining of that routine', async () => {
      // arrange
      messagingServiceMock.sendMessage
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([userMock]);
      formServiceMock.getRoutineForm.mockReturnValueOnce([
        { type: 'emoji_scale', id: '1' },
        { type: 'value_range', id: '2' },
      ]);
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        routineSettingsMock,
      );

      const answerGroupsMocks = [
        {
          id: '1',
          answers: [
            { value: 1, questionId: '1' },
            { value: 3, questionId: '2' },
          ],
          timestamp: '2022-09-15T11:09:31.143Z',
          userId: userMock.id,
        },
        {
          id: '1',
          answers: [
            { value: 1, questionId: '1' },
            { value: 3, questionId: '2' },
          ],
          timestamp: '2022-09-15T11:09:31.143Z',
          userId: userMock.id,
        },
        {
          id: '1',
          answers: [
            { value: 1, questionId: '1' },
            { value: 3, questionId: '2' },
          ],
          timestamp: '2022-09-15T11:09:31.143Z',
          userId: userMock.id,
        },
      ];
      answerGroupServiceMock.answerGroups.mockResolvedValueOnce(
        answerGroupsMocks,
      );

      answerGroupsMocks.forEach((mock) =>
        answerGroupServiceMock.parseAnswerTimestamp.mockReturnValueOnce(mock),
      );

      // act
      await AnswersController.findOverviewFromTeam(
        userMock,
        userMock.teams[0].id,
      );

      // assert
      answerGroupsMocks.forEach((mock) => {
        expect(answerGroupServiceMock.parseAnswerTimestamp).toBeCalledWith(
          mock,
          routineSettingsMock.cron,
        );
      });
    });
  });
});