import { Controller, Get, Param, Query } from '@nestjs/common';
import { Answer } from '@prisma/client';
import { groupBy, meanBy, orderBy } from 'lodash';

import { User } from '../../decorators/user.decorator';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { FormService } from '../../services/form.service';
import { RoutineFormLangs } from '../../services/constants/form';
import { MessagingService } from '../../services/messaging.service';
import { SecurityService } from '../../services/security.service';

import { AnswerGroupWithAnswers } from '../../types/AnswerGroupWithAnswers';
import { Team } from '../../types/Team';
import { User as UserType } from '../../types/User';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import * as dayjs from 'dayjs';

interface FindAnswersQuery {
  before?: string;
  after?: string;
  includeSubteams?: boolean;
}

interface MessagingQuery {
  teamID: string;
  filters: { resolveTree: boolean };
}

interface AnswerOverview {
  id?: Answer['id'];
  name: string;
  picture: UserType['picture'];
  timestamp?: Date;
  latestStatusReply?: number;
}

@Controller('/answers')
export class AnswersController {
  constructor(
    private nats: MessagingService,
    private answerGroupService: AnswerGroupService,
    private formService: FormService,
    private securityService: SecurityService,
    private routineSettingsService: RoutineSettingsService,
  ) {}

  @Get('/summary/:teamId?')
  async findAnswersFromTeam(
    @User() user: UserType,
    @Param('teamId') teamId: string,
    @Query() query: FindAnswersQuery,
  ): Promise<AnswerOverview[]> {
    const company = await this.nats.sendMessage<{ id: Team['id'] }, Team>(
      'core-ports.get-team-company',
      { id: teamId ?? user.companies[0].id },
    );

    this.securityService.isUserFromCompany(user, company.id);

    const usersFromTeam = await this.nats.sendMessage<
      MessagingQuery,
      UserType[]
    >('core-ports.get-users-from-team', {
      teamID: teamId ?? user.companies[0].id,
      filters: { resolveTree: teamId ? query.includeSubteams : true },
    });

    const usersFromTeamIds = usersFromTeam.map((user) => user.id);

    const form = this.formService.getRoutineForm(RoutineFormLangs.PT_BR);

    const feelingQuestion = form.find(
      (question) => question.type === 'emoji_scale',
    );

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        userId: { in: usersFromTeamIds },
        timestamp: { lte: new Date(query.before), gte: new Date(query.after) },
      },
      include: {
        answers: {
          where: {
            questionId: feelingQuestion.id,
          },
        },
      },
    });

    const formattedAnswerOverview = usersFromTeam.map((user) => {
      const answerGroup = answerGroups.find(
        (answerGroup) => answerGroup.userId === user.id,
      );

      return {
        id: answerGroup?.id,
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        picture: user.picture,
        latestStatusReply: answerGroup?.answers[0].value
          ? Number(answerGroup.answers[0].value)
          : undefined,
        timestamp: answerGroup?.timestamp,
      };
    });

    return orderBy(formattedAnswerOverview, 'timestamp');
  }

  @Get('/overview/:teamId')
  async findOverviewFromTeam(
    @User() user: UserType,
    @Param('teamId') teamId: string,
    @Query('includeSubteams')
    includeSubteams?: FindAnswersQuery['includeSubteams'],
    @Query('after') after?: string,
    @Query('before') before?: string,
  ) {
    const company = await this.nats.sendMessage<{ id: Team['id'] }, Team>(
      'core-ports.get-team-company',
      { id: teamId ?? user.companies[0].id },
    );

    this.securityService.isUserFromCompany(user, company.id);

    const usersFromTeam = await this.nats.sendMessage<
      MessagingQuery,
      UserType[]
    >('core-ports.get-users-from-team', {
      teamID: teamId ?? user.companies[0].id,
      filters: { resolveTree: teamId ? includeSubteams : true },
    });

    const usersFromTeamIds = usersFromTeam.map((user) => user.id);

    const routine = await this.routineSettingsService.routineSettings({
      companyId: company.id,
    });

    const form = this.formService.getRoutineForm(RoutineFormLangs.PT_BR);

    const questions = form.filter(
      (question) =>
        question.type === 'emoji_scale' ||
        question.type === 'value_range' ||
        question.type === 'road_block',
    );

    const roadBlockQuestion = form.find(
      (question) => question.type === 'road_block',
    );

    const questionsId = questions.map((question) => question.id);

    const today = dayjs();
    const threeMonthsBefore = today.subtract(3, 'months');

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        userId: { in: usersFromTeamIds },
        timestamp: {
          lte: before ?? today.toDate(),
          gte: after ?? threeMonthsBefore.toDate(),
        },
      },
      include: {
        answers: {
          where: {
            questionId: { in: questionsId },
          },
        },
      },
    });

    if (!answerGroups.length) {
      return {
        overview: {
          feeling: [],
          productivity: [],
          roadblock: [],
        },
      };
    }

    const answerGroupsWithTimestamp = answerGroups.map((answerGroup) => {
      return this.answerGroupService.parseAnswerTimestamp(
        answerGroup,
        routine.cron,
      );
    });

    const groupedAnswerGroupsByTimestamp = Object.values<
      AnswerGroupWithAnswers[]
    >(groupBy(answerGroupsWithTimestamp, 'timestamp'));

    const answerGroupsByQuestions = questionsId.map((questionId) => {
      return groupedAnswerGroupsByTimestamp.map((groupedAnswerWeek) => {
        const answerGroupWithQuestionAnswers = groupedAnswerWeek.reduce<
          Partial<AnswerGroupWithAnswers>
        >(
          (acc, answerGroup) => {
            const questionAnswer = answerGroup.answers.find(
              (answer) => answer.questionId === questionId,
            );

            return {
              ...answerGroup,
              answers: [...acc.answers, questionAnswer],
            };
          },
          { answers: [] },
        );

        if (
          answerGroupWithQuestionAnswers.answers[0].questionId ===
          roadBlockQuestion.id
        ) {
          const trueAnswerValues =
            answerGroupWithQuestionAnswers.answers.filter(
              (answer) => answer.value.toLowerCase() === 'y',
            );
          return {
            timestamp: answerGroupWithQuestionAnswers.timestamp,
            total: answerGroupWithQuestionAnswers.answers.length,
            average: trueAnswerValues.length,
          };
        }

        const answerValues = answerGroupWithQuestionAnswers.answers.map(
          (answer) => Number(answer.value),
        );

        const mean = meanBy(answerValues);

        return {
          timestamp: answerGroupWithQuestionAnswers.timestamp,
          average: mean,
        };
      });
    });

    const [feeling, productivity, roadblock] = answerGroupsByQuestions;

    return {
      overview: {
        feeling,
        productivity,
        roadblock,
      },
    };
  }
}
