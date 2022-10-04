import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { User } from '../../decorators/user.decorator';
import { AnswersService } from '../../services/answers.service';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { FormService } from '../../services/form.service';
import { Team } from '../../types/Team';
import { User as UserType } from '../../types/User';
import { budRoutinePtBrForm } from '../../shared/providers/form-provider/bud-routine-ptBR';
import { AnswerWithHiddenFieldInfo } from '../../types/Answer';
import { RoutineFormLangs } from '../../services/constants/form';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import { CronService } from '../../services/cron.service';

@Controller('/answer')
export class AnswerController {
  constructor(
    private answerGroupService: AnswerGroupService,
    private answersService: AnswersService,
    private routineFormService: FormService,
    private routineSettingsService: RoutineSettingsService,
    private cronService: CronService,
  ) {}

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

  @Get()
  async getDetailedUserAnswer(
    @Query('answerId') id: string,
    @User() user: UserType,
  ) {
    const answerGroup = await this.answerGroupService.answerGroup({
      id: id,
    });

    const company = user.companies.find(
      (companie) => companie.id === answerGroup.companyId,
    );

    if (!company) {
      throw new Error(
        'Cannot show the replies because the user is not included in the company',
      );
    }

    const settings = await this.routineSettingsService.routineSettings({
      companyId: company.id,
    });

    const cronExpression = this.cronService.parse(settings.cron, {
      utc: true,
      currentDate: answerGroup.timestamp,
    });

    cronExpression.next();
    const secondCronExpressionExecution = cronExpression.next();

    const historyTimespans = this.cronService
      .getMultipleTimespan(cronExpression, 6)
      .reverse();

    const currentAnswer = await this.answersService.answers({
      where: { answerGroup: answerGroup },
    });

    const previousAnswerGroups = await this.answerGroupService.answerGroups({
      take: 4,
      orderBy: { timestamp: 'desc' },
      where: {
        userId: user.id,
        id: { not: answerGroup.id },
        timestamp: { lte: secondCronExpressionExecution.toDate() },
      },
    });

    const history = historyTimespans.map((timespan) => {
      const answeredHistory = [...previousAnswerGroups, answerGroup].find(
        ({ timestamp }) =>
          this.cronService.isSameExecutionTimeSpan(
            timespan,
            timestamp,
            settings.cron,
          ),
      );

      return answeredHistory
        ? {
            id: answeredHistory.id,
            ...timespan,
          }
        : timespan;
    });

    const previousAnswers = await this.answersService.answers({
      where: {
        answerGroupId: { in: previousAnswerGroups.map(({ id }) => id) },
      },
    });

    const routineForm = this.routineFormService.getRoutineForm(
      RoutineFormLangs.PT_BR,
    );

    const userAnswers = routineForm.map((formQuestion) => {
      if (formQuestion.type !== 'reading_text') {
        const currentAnswerFromThisQuestion = currentAnswer.find(
          ({ questionId }) => questionId === formQuestion.id,
        );

        const formatedQuestion = formQuestion.conditional
          ? {
              heading: formQuestion.heading,
              id: formQuestion.id,
              type: formQuestion.type,
              conditional: { dependsOn: formQuestion.conditional.dependsOn },
            }
          : {
              heading: formQuestion.heading,
              id: formQuestion.id,
              type: formQuestion.type,
            };

        if (
          formQuestion.type === 'emoji_scale' ||
          formQuestion.type === 'value_range' ||
          formQuestion.type === 'road_block'
        ) {
          const previousAnswersFromThisQuestion = previousAnswers
            .filter((answer) => answer.questionId === formQuestion.id)
            .map(({ id, value, answerGroupId }) => ({
              id,
              value: value,
              timestamp: previousAnswerGroups.find(
                ({ id }) => id === answerGroupId,
              ).timestamp,
            }))
            .sort((x, y) => x.timestamp.getTime() - y.timestamp.getTime());

          const values = [
            ...previousAnswersFromThisQuestion,
            {
              id: currentAnswerFromThisQuestion.id,
              value: currentAnswerFromThisQuestion?.value,
              timestamp: answerGroup.timestamp,
            },
          ];

          const history = historyTimespans.map((timespan) => {
            const answeredRoadblock = values.find(({ timestamp }) =>
              this.cronService.isSameExecutionTimeSpan(
                timespan,
                timestamp,
                settings.cron,
              ),
            );

            return (
              answeredRoadblock ?? {
                id: Math.random(),
                value: null,
                timestamp: timespan.startDate,
              }
            );
          });

          return {
            ...formatedQuestion,
            values: formQuestion.type === 'road_block' ? history : values,
          };
        }
        return {
          ...formatedQuestion,
          value: currentAnswerFromThisQuestion?.value,
        };
      }
    });

    const validAnswers = userAnswers.filter((answer) => answer);

    const answerDetails = {
      history: history,
      answers: validAnswers,
    };

    return answerDetails;
  }
}
