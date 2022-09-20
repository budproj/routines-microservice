import { Body, Controller, Post } from '@nestjs/common';
import { Answer } from '@prisma/client';
import { User } from '../../decorators/user.decorator';
import { AnswersService } from '../../services/answers.service';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { Team } from '../../types/Team';
import { User as UserType } from '../../types/User';
import { budRoutinePtBrForm } from '../../shared/providers/form-provider/bud-routine-ptBR';

@Controller('/answer')
export class AnswerController {
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

    const requiredQuestionsIDs = budRoutinePtBrForm.reduce(
      (results, { id, required }) => {
        if (typeof required === 'boolean' && required === true)
          results.push(id);
        return results;
      },
      [],
    );

    let matchedMandatoryQuestions = 0;
    requiredQuestionsIDs.forEach((requiredQuestion) => {
      for (let i = 0; i < answers.length; i++) {
        if (answers[i].questionId === requiredQuestion)
          matchedMandatoryQuestions++;
      }
    });

    if (matchedMandatoryQuestions < requiredQuestionsIDs.length) {
      throw new Error('All mandatory questions must be answered.');
    }

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
