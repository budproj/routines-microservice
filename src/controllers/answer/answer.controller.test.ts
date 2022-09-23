import { Test } from '@nestjs/testing';

import { PrismaService } from '../../infrastructure/orm/prisma.service';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { User } from '../../types/User';

import { AnswerController as AnswerControllerClass } from './answer.controller';
import { AnswersService } from '../../services/answers.service';
import { randomUUID } from 'crypto';

beforeEach(jest.resetAllMocks);

describe('Answer Controller', () => {
  const answerGroupServiceMock = {
    createAnswerGroup: jest.fn(),
  };

  const answerServiceMock = {
    createAnswer: jest.fn(),
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
  };

  let AnswerController: AnswerControllerClass;
  const ModuleRef = Test.createTestingModule({
    imports: [],
    controllers: [AnswerControllerClass],
    providers: [AnswersService, AnswerGroupService, PrismaService],
  })
    .overrideProvider(AnswerGroupService)
    .useValue(answerGroupServiceMock)
    .overrideProvider(AnswersService)
    .useValue(answerServiceMock);

  beforeAll(async () => {
    const CompiledModule = await ModuleRef.compile();
    AnswerController = CompiledModule.get(AnswerControllerClass);
  });

  describe('registerFormAnswers', () => {
    it('should be able register form answers', async () => {
      answerGroupServiceMock.createAnswerGroup.mockResolvedValueOnce(
        '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
      );
      answerServiceMock.createAnswer.mockResolvedValueOnce(null);
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
      answerServiceMock.createAnswer.mockResolvedValueOnce(null);
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
});
