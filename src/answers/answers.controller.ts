import { Body, Controller, Post } from '@nestjs/common';
import { Answer } from '@prisma/client';
import { User } from '../decorators/user.decorator';
import { AnswersService } from '../services/answers.service';
import { AnswerGroupService } from '../services/answerGroup.service';
import { Team } from '../types/Team';
import { User as UserType } from '../types/User';

@Controller('/answer-form')
export class AnswersFormController {
  constructor(
    private answerGroupService: AnswerGroupService,
    private answerService: AnswersService,
  ) {}

  @Post()
  async registerAnswers(
    @User() user: UserType,
    @Body() answers: Answer[],
  ): Promise<Team[]> {
    const {
      companies: [company],
      id: userId,
      teams,
    } = user;

    const { id } = await this.answerGroupService.createAnswerGroup({
      companyId: company.id,
      userId,
    });

    await this.answerService.createAnswer({
      data: answers.map((answer) => ({ ...answer, answerGroupId: id })),
      skipDuplicates: true,
    });

    return teams;
  }
}
