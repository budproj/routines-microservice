import { Body, Controller, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { User } from '../../decorators/user.decorator';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { Team } from '../../types/Team';
import { User as UserType } from '../../types/User';
import { budRoutinePtBrForm } from '../../shared/providers/form-provider/bud-routine-ptBR';
import { AnswerWithHiddenFieldInfo } from '../../types/Answer';

@Controller('/answer')
export class AnswerController {
  constructor(private answerGroupService: AnswerGroupService) {}

  @Post()
  async registerAnswers(
    @User() user: UserType,
    @Body() answers: AnswerWithHiddenFieldInfo[],
  ): Promise<Team[]> {
    const {
      companies: [company],
      id: userId,
      teams,
    } = user;

    const requiredQuestionIds = budRoutinePtBrForm
      .filter((question) => question.required)
      .map((question) => question.id);

    const allRequiredAnswersHaveBeenFilled = requiredQuestionIds.every(
      (requiredQuestionId) => {
        const answer = answers.find(
          ({ questionId }) => questionId === requiredQuestionId,
        );
        return answer.hidden ? true : Boolean(answer.value);
      },
    );

    if (!allRequiredAnswersHaveBeenFilled) {
      throw new Error('All required questions must be answered.');
    }

    const submittedAnswers = answers
      .filter((answer) => !answer.hidden)
      .map<Prisma.AnswerCreateWithoutAnswerGroupInput>((answer) => ({
        questionId: answer.questionId,
        value: answer.value,
      }));

    await this.answerGroupService.createAnswerGroup({
      companyId: company.id,
      userId,
      answers: {
        create: submittedAnswers,
      },
    });

    return teams;
  }
}
