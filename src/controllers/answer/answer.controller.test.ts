import * as cronParser from 'cron-parser';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../infrastructure/orm/prisma.service';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { User } from '../../types/User';

import { AnswerController as AnswerControllerClass } from './answer.controller';
import { AnswersService } from '../../services/answers.service';
import { randomUUID } from 'crypto';
import { CronService } from '../../services/cron.service';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import { FormService } from '../../services/form.service';

beforeEach(jest.resetAllMocks);

describe('Answer Controller', () => {
  const answerGroupServiceMock = {
    createAnswerGroup: jest.fn(),
    answerGroup: jest.fn(),
    answerGroups: jest.fn(),
  };

  const answerServiceMock = {
    answers: jest.fn(),
  };

  const routineSettingsServiceMock = {
    routineSettings: jest.fn(),
    allTeamsOptedOut: jest.fn(),
  };

  const cronServiceMock = {
    parse: jest.fn(),
    getMultipleTimespan: jest.fn(),
    getCurrentExecutionDateFromTimestamp: jest.fn(),
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

  const mockInterval = cronParser.parseExpression(routineSettingsMock.cron);

  const cronMultipleTimespanMock = [
    {
      startDate: new Date('2022-08-26'),
      finishDate: new Date('2022-09-01'),
    },
    {
      startDate: new Date('2022-09-02'),
      finishDate: new Date('2022-09-08'),
    },
    {
      startDate: new Date('2022-09-09'),
      finishDate: new Date('2022-09-15'),
    },
    {
      startDate: new Date('2022-09-16'),
      finishDate: new Date('2022-09-22'),
    },
    {
      startDate: new Date('2022-09-23'),
      finishDate: new Date('2022-09-29'),
    },
  ];

  const cronGetCurrentExecutionDateFromTimestampMock = new Date('2022-09-16');

  const userMock: User = {
    id: '922ef72a-6c3c-4075-926a-3245cdeea75f',
    companies: [{ id: routineSettingsMock.companyId }],
    teams: [{ id: '968e8d90-c1dd-4d5c-948a-067e070ea269' }],
    picture: '',
    firstName: 'Morty',
    lastName: 'Smith',
    permissions: [],
  };

  const answerGroupsMock = [
    {
      id: 'ef9ba4c8-23b5-4e6e-aca8-9943f326747c',
      companyId: routineSettingsMock.companyId,
      userId: userMock.id,
      timestamp: new Date('2022-09-16'),
    },
  ];

  const fakeAnswerGroupId = '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc';
  const answerGroupMock = {
    id: fakeAnswerGroupId,
    companyId: routineSettingsMock.companyId,
    userId: userMock.id,
    timestamp: new Date('2022-09-23'),
  };

  let AnswerController: AnswerControllerClass;
  const ModuleRef = Test.createTestingModule({
    imports: [],
    controllers: [AnswerControllerClass],
    providers: [
      AnswersService,
      AnswerGroupService,
      PrismaService,
      CronService,
      FormService,
      RoutineSettingsService,
    ],
  })
    .overrideProvider(AnswerGroupService)
    .useValue(answerGroupServiceMock)
    .overrideProvider(AnswersService)
    .useValue(answerServiceMock)
    .overrideProvider(RoutineSettingsService)
    .useValue(routineSettingsServiceMock)
    .overrideProvider(CronService)
    .useValue(cronServiceMock);

  beforeAll(async () => {
    const CompiledModule = await ModuleRef.compile();
    AnswerController = CompiledModule.get(AnswerControllerClass);
  });

  describe('registerFormAnswers', () => {
    it('should be able register form answers', async () => {
      answerGroupServiceMock.createAnswerGroup.mockResolvedValueOnce(
        '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
      );
      const answers = [
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: false,
          questionId: '44bd7498-e528-4f96-b45e-3a2374790373',
          value: '2',
        },
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: false,
          questionId: 'd81e7754-79be-4638-89f3-a74875772d00',
          value: 'tava benzao',
        },
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: false,
          questionId: '9a56911a-61c1-49af-87a8-7a35a1804f6b',
          value: '2',
        },
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: true,
          questionId: 'f0c6e297-7eb7-4b48-869c-aec96240ba2b',
          value: 'muita coisa pra fazer',
        },
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: false,
          questionId: '95b84e67-d5b6-4fcf-938a-b4c9897596cb',
          value: 'tarefinhas brabas',
        },
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: false,
          questionId: 'a1d5b993-9430-40bb-8f0f-47cda69720b9',
          value: 'outras tarefinhas brabas',
        },
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: false,
          questionId: 'cf785f20-5a0b-4c4c-b882-9e3949589df2',
          value: 'n',
        },
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: false,
          questionId: 'd9ca02f3-7bf7-40f3-b393-618de3410751',
          value: 'uns bagulhos ai',
        },
      ];
      const registeredAnswers = await AnswerController.registerAnswers(
        userMock,
        answers,
      );

      expect(registeredAnswers).toEqual(userMock.teams);
    });

    it('should not be able to register form answers if a required answer is not answered ', async () => {
      answerGroupServiceMock.createAnswerGroup.mockResolvedValueOnce(
        '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
      );
      const answers = [
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: false,
          questionId: '44bd7498-e528-4f96-b45e-3a2374790373',
          value: '2',
        },
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: false,
          questionId: 'd81e7754-79be-4638-89f3-a74875772d00',
          value: 'tava benzao',
        },
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          hidden: false,
          questionId: 'd9ca02f3-7bf7-40f3-b393-618de3410751',
          value: 'uns bagulhos ai',
        },
      ];

      await expect(
        AnswerController.registerAnswers(userMock, answers),
      ).rejects.toBeInstanceOf(Error);
    });
  });

  describe('getUserAnswerDetails', () => {
    it('should return the answer details and a history of replies for the last 5 weeks', async () => {
      answerGroupServiceMock.answerGroup.mockReturnValue(answerGroupMock);

      routineSettingsServiceMock.routineSettings.mockResolvedValueOnce(
        routineSettingsMock,
      );

      cronServiceMock.parse.mockReturnValue(mockInterval);

      answerGroupServiceMock.answerGroups.mockResolvedValueOnce(
        answerGroupsMock,
      );

      cronServiceMock.getMultipleTimespan.mockReturnValue(
        cronMultipleTimespanMock,
      );

      cronServiceMock.getCurrentExecutionDateFromTimestamp.mockReturnValue(
        cronGetCurrentExecutionDateFromTimestampMock,
      );

      const answer = [
        {
          id: randomUUID(),
          answerGroupId: 'ef9ba4c8-23b5-4e6e-aca8-9943f326747c',
          hidden: false,
          questionId: '44bd7498-e528-4f96-b45e-3a2374790373',
          value: '2',
        },
        {
          id: randomUUID(),
          answerGroupId: 'ef9ba4c8-23b5-4e6e-aca8-9943f326747c',
          hidden: false,
          questionId: 'd81e7754-79be-4638-89f3-a74875772d00',
          value: 'tava benzao',
        },
        {
          id: randomUUID(),
          answerGroupId: 'ef9ba4c8-23b5-4e6e-aca8-9943f326747c',
          hidden: false,
          questionId: '9a56911a-61c1-49af-87a8-7a35a1804f6b',
          value: '2',
        },
        {
          id: randomUUID(),
          answerGroupId: 'ef9ba4c8-23b5-4e6e-aca8-9943f326747c',
          hidden: true,
          questionId: 'f0c6e297-7eb7-4b48-869c-aec96240ba2b',
          value: 'muita coisa pra fazer',
        },
        {
          id: randomUUID(),
          answerGroupId: 'ef9ba4c8-23b5-4e6e-aca8-9943f326747c',
          hidden: false,
          questionId: '95b84e67-d5b6-4fcf-938a-b4c9897596cb',
          value: 'tarefinhas brabas',
        },
        {
          id: randomUUID(),
          answerGroupId: 'ef9ba4c8-23b5-4e6e-aca8-9943f326747c',
          hidden: false,
          questionId: 'a1d5b993-9430-40bb-8f0f-47cda69720b9',
          value: 'outras tarefinhas brabas',
        },
        {
          id: randomUUID(),
          answerGroupId: 'ef9ba4c8-23b5-4e6e-aca8-9943f326747c',
          hidden: false,
          questionId: 'cf785f20-5a0b-4c4c-b882-9e3949589df2',
          value: 'y',
        },
        {
          id: randomUUID(),
          answerGroupId: 'ef9ba4c8-23b5-4e6e-aca8-9943f326747c',
          hidden: false,
          questionId: 'd9ca02f3-7bf7-40f3-b393-618de3410751',
          value: 'uns bagulhos ai',
        },
        {
          id: randomUUID(),
          answerGroupId: 'ef9ba4c8-23b5-4e6e-aca8-9943f326747c',
          hidden: false,
          questionId: 'fd7c26dd-38e3-41e7-b24a-78030653dc23',
          value: 'voa time',
        },
      ];

      answerServiceMock.answers.mockReturnValue(answer);
      const userAnswerDetailed = await AnswerController.getDetailedUserAnswer(
        fakeAnswerGroupId,
        userMock,
      );

      const expectedAnswersDetailed = {
        history: [
          {
            startDate: new Date('2022-08-26'),
            finishDate: new Date('2022-09-01'),
          },
          {
            startDate: new Date('2022-09-02'),
            finishDate: new Date('2022-09-08'),
          },
          {
            startDate: new Date('2022-09-09'),
            finishDate: new Date('2022-09-15'),
          },
          {
            id: answerGroupsMock[0].id,
            startDate: new Date('2022-09-16'),
            finishDate: new Date('2022-09-22'),
          },
          {
            startDate: new Date('2022-09-23'),
            finishDate: new Date('2022-09-29'),
          },
        ],
        answers: [
          {
            id: '44bd7498-e528-4f96-b45e-3a2374790373',
            heading: 'Como você se sentiu essa semana?',
            type: 'emoji_scale',
            values: [
              {
                value: '2',
                timestamp: new Date(answerGroupsMock[0].timestamp),
              },
              {
                value: '2',
                timestamp: new Date(answerGroupMock.timestamp),
              },
            ],
          },
          {
            id: 'd81e7754-79be-4638-89f3-a74875772d00',
            heading: 'Qual o principal motivo da sua resposta?',
            type: 'long_text',
            value: 'tava benzao',
          },
          {
            id: '9a56911a-61c1-49af-87a8-7a35a1804f6b',
            heading: 'O quão produtiva você sente que foi a sua semana?',
            type: 'value_range',
            values: [
              {
                value: '2',
                timestamp: new Date(answerGroupsMock[0].timestamp),
              },
              {
                value: '2',
                timestamp: new Date(answerGroupMock.timestamp),
              },
            ],
          },
          {
            id: 'f0c6e297-7eb7-4b48-869c-aec96240ba2b',
            heading: 'O que atrapalhou sua produtividade?',
            type: 'long_text',
            conditional: {
              dependsOn: '9a56911a-61c1-49af-87a8-7a35a1804f6b',
            },
            value: 'muita coisa pra fazer',
          },
          {
            id: '95b84e67-d5b6-4fcf-938a-b4c9897596cb',
            heading:
              'Quais são as coisas mais importantes que você fez essa semana?',
            type: 'long_text',
            value: 'tarefinhas brabas',
          },
          {
            id: 'a1d5b993-9430-40bb-8f0f-47cda69720b9',
            heading: 'E para a próxima semana, quais serão suas prioridades?',
            type: 'long_text',
            value: 'outras tarefinhas brabas',
          },
          {
            id: 'cf785f20-5a0b-4c4c-b882-9e3949589df2',
            heading: 'Alguma coisa bloqueia ou preocupa você?',
            type: 'road_block',
            values: [
              {
                value: 'y',
                timestamp: new Date(answerGroupsMock[0].timestamp),
              },
              {
                value: 'y',
                timestamp: new Date(answerGroupMock.timestamp),
              },
            ],
          },
          {
            id: 'd9ca02f3-7bf7-40f3-b393-618de3410751',
            heading: 'O que te bloqueia ou te preocupa?',
            type: 'long_text',
            value: 'uns bagulhos ai',
            conditional: {
              dependsOn: 'cf785f20-5a0b-4c4c-b882-9e3949589df2',
            },
          },
          {
            id: 'fd7c26dd-38e3-41e7-b24a-78030653dc23',
            heading: 'Quer deixar algum recado para o time? :)',
            type: 'long_text',
            value: 'voa time',
          },
        ],
      };

      expect(userAnswerDetailed).toEqual(expectedAnswersDetailed);
    });
  });
});
