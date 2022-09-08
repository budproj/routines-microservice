import { Test } from '@nestjs/testing';

import { PrismaService } from '../infrastructure/orm/prisma.service';
import { AnswerGroupService } from '../services/answerGroup.service';
import { User } from '../types/User';

import { AnswersFormController } from './answers.controller';
import { AnswersService } from '../services/answers.service';
import { randomUUID } from 'crypto';

beforeEach(jest.resetAllMocks);

describe('Answers Controller', () => {
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

  let AnswerController: AnswersFormController;
  const ModuleRef = Test.createTestingModule({
    imports: [],
    controllers: [AnswersFormController],
    providers: [AnswersService, AnswerGroupService, PrismaService],
  })
    .overrideProvider(AnswerGroupService)
    .useValue(answerGroupServiceMock)
    .overrideProvider(AnswersService)
    .useValue(answerServiceMock);

  beforeAll(async () => {
    const CompiledModule = await ModuleRef.compile();
    AnswerController = CompiledModule.get(AnswersFormController);
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
          questionId: 'c97dcf60-2254-49b2-808b-a737b3142b40',
          value: 'respostinha 1 rs',
        },
        {
          id: randomUUID(),
          answerGroupId: '37d76b2b-f8a7-4d79-afc4-c8b13838fbcc',
          questionId: 'c97dcf60-2254-49b2-808b-a737b3142b40',
          value: 'respostinha 2 rs',
        },
      ];
      const registeredAnswers = await AnswerController.registerAnswers(
        userMock,
        answers,
      );

      expect(registeredAnswers).toEqual(userMock.teams);
    });
  });
});
