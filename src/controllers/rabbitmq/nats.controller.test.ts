import { ClientsModule, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import { HealthCheckDBService } from '../../services/healthcheck.db.service';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { MessagingService } from '../../services/messaging.service';
import { CronService } from '../../services/cron.service';

import { RabbitMqController } from './rabbitmq.controller';
import { FormService } from '../../services/form.service';

describe('RabbitMQ Controller', () => {
  let rabbitMqController: RabbitMqController;

  const dbHealthCheckPath = jest.fn();

  beforeEach(jest.resetAllMocks);
  const healthCheckDBServiceMock = { patch: dbHealthCheckPath };
  const routineSettingsServiceMock = {
    routineSettings: jest.fn(),
    userHasAtLeastOneTeamWithActiveRoutine: jest.fn(),
    removeDisabledTeamsFromUser: jest.fn(),
    getCurrentRoutineDate: jest.fn(),
  };
  const answerGroupServiceMock = {
    answerGroups: jest.fn(),
    answerGroup: jest.fn(),
  };
  const messagingServiceMock = {
    sendMessage: jest.fn(),
    emit: jest.fn(),
  };

  const routineSettingsMock = {
    id: '922ef72a-6c3c-4075-926a-3245cdeea75f',
    companyId: '968e8d90-c1dd-4d5c-948a-067e070ea269',
    disabledTeams: [
      '968e8d90-c1dd-4d5c-948a-067e070ea269',
      'b6e555c7-3284-458f-83cd-86eb3aba08ad',
    ],
    cron: '0 0 * * 5',
  };

  const usersMock = [
    {
      id: '1',
      teams: [{ id: '1' }],
      picture: '',
      firstName: 'Morty',
      lastName: 'Smith',
    },
    {
      id: '2',
      teams: [{ id: '2' }],
      picture: '',
      firstName: 'Rick',
      lastName: 'Sanchez',
    },
    {
      id: '3',
      teams: [{ id: '3' }],
      picture: '',
      firstName: 'Jerry',
      lastName: 'Smith',
    },
  ];

  const answerGroupMock = {
    id: '1',
    answers: [
      { value: 1, questionId: '1' },
      { value: 3, questionId: '2' },
    ],
    timestamp: '2022-09-15T11:09:31.143Z',
    userId: usersMock[0].id,
  };

  // Module Setup
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ClientsModule.register([
          { name: 'NATS_SERVICE', transport: Transport.NATS },
        ]),
      ],
      controllers: [RabbitMqController],
      providers: [
        HealthCheckDBService,
        AnswerGroupService,
        MessagingService,
        RoutineSettingsService,
        CronService,
        FormService,
      ],
    })
      .overrideProvider(HealthCheckDBService)
      .useValue(healthCheckDBServiceMock)
      .overrideProvider(RoutineSettingsService)
      .useValue(routineSettingsServiceMock)
      .overrideProvider(AnswerGroupService)
      .useValue(answerGroupServiceMock)
      .overrideProvider(MessagingService)
      .useValue(messagingServiceMock)
      .compile();

    rabbitMqController = moduleRef.get(RabbitMqController);
  });

  describe('health-check messages', () => {
    it('should emit back to the reply queue', async () => {
      // Arrange
      const data = { id: 'some id', reply: 'testReplyQueue' };

      // Act
      await rabbitMqController.onHealthCheck(data);

      // Assert
      expect(messagingServiceMock.emit).toBeCalledTimes(1);
      expect(messagingServiceMock.emit).toBeCalledWith('testReplyQueue', true);
    });
  });
  describe('routineNotifications', () => {
    it('should filter the company user list to remove the disabled teams members', async () => {
      // Arrange
      const data = {
        id: '123123',
        companyId: '0788abd6-4996-4224-8f24-094b2d3c0d3a',
        disabledTeams: ['1', '4'],
      };
      messagingServiceMock.sendMessage.mockResolvedValueOnce(usersMock);
      routineSettingsServiceMock.userHasAtLeastOneTeamWithActiveRoutine.mockReturnValue(
        true,
      );
      routineSettingsServiceMock.removeDisabledTeamsFromUser
        .mockReturnValueOnce(usersMock[0])
        .mockReturnValueOnce(usersMock[1])
        .mockReturnValueOnce(usersMock[2]);
      routineSettingsServiceMock.getCurrentRoutineDate.mockReturnValue(
        new Date('2022-10-07T00:00:00.000Z'),
      );
      answerGroupServiceMock.answerGroups.mockResolvedValue([answerGroupMock]);

      // Act
      await rabbitMqController.routineNotification(data);

      // Assert
      expect(
        messagingServiceMock.sendMessage.mock.calls[1][1]
          .usersWithPendingRoutines,
      ).toEqual([
        {
          id: '2',
          teams: [{ id: '2' }],
          picture: '',
          firstName: 'Rick',
          lastName: 'Sanchez',
        },
        {
          id: '3',
          teams: [{ id: '3' }],
          picture: '',
          firstName: 'Jerry',
          lastName: 'Smith',
        },
      ]);
    });
    it('should return an array of company members and an array of users with not answered routines with more than 7 days', async () => {
      // Arrange
      const data = {
        id: '123123',
        companyId: '0788abd6-4996-4224-8f24-094b2d3c0d3a',
        disabledTeams: [],
      };
      messagingServiceMock.sendMessage.mockResolvedValueOnce(usersMock);

      routineSettingsServiceMock.userHasAtLeastOneTeamWithActiveRoutine.mockReturnValue(
        true,
      );
      routineSettingsServiceMock.removeDisabledTeamsFromUser
        .mockReturnValueOnce(usersMock[0])
        .mockReturnValueOnce(usersMock[1])
        .mockReturnValueOnce(usersMock[2]);
      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        routineSettingsMock,
      );
      routineSettingsServiceMock.getCurrentRoutineDate.mockReturnValue(
        new Date('2022-10-07T00:00:00.000Z'),
      );
      answerGroupServiceMock.answerGroups.mockResolvedValue([answerGroupMock]);

      // Act
      await rabbitMqController.routineNotification(data);

      // Assert
      expect(
        answerGroupServiceMock.answerGroups.mock.calls[0][0].where.timestamp
          .gte,
      ).toEqual(new Date('2022-10-07T00:00:00.000Z'));
    });
  });

  describe('getAnswerGroupData', () => {
    it('should call answerGroupService.answerGroup and reply its content', async () => {
      // Arrange
      const payload = { id: 'um id' };
      const mockedResponse = { an: 'object' };
      answerGroupServiceMock.answerGroup.mockResolvedValueOnce(mockedResponse);

      // Act
      const result = await rabbitMqController.getAnswerGroupData({ id: 'um id' });

      // Assert
      expect(1).toBe(1);
      expect(answerGroupServiceMock.answerGroup).toBeCalledTimes(1);
      expect(answerGroupServiceMock.answerGroup).toBeCalledWith(payload);
      expect(result).toBe(mockedResponse);
    });
  });
});
