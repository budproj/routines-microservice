import { Controller, Get, Param, Query } from '@nestjs/common';
import { Answer } from '@prisma/client';
import { groupBy, meanBy, orderBy, uniqBy } from 'lodash';

import { User } from '../../decorators/user.decorator';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { FormService } from '../../services/form.service';
import { RoutineFormLangs } from '../../services/constants/form';
import { MessagingService } from '../../services/messaging.service';
import { SecurityService } from '../../services/security.service';
import { CronService } from '../../services/cron.service';

import { AnswerGroupWithAnswers } from '../../types/AnswerGroupWithAnswers';
import { Team } from '../../types/Team';
import { User as UserType } from '../../types/User';
import { RoutineSettingsService } from '../../services/routineSettings.service';
import * as dayjs from 'dayjs';
import { convertStringToArray } from '../../shared/utils/convert-to-array';
import { Stopwatch } from '../../decorators/pino.decorator';
import { Cacheable } from '../../decorators/cacheable.decorator';

interface FindAnswersQuery {
  before?: string;
  after?: string;
  includeSubteams?: boolean;
  teamUsersIds: string;
}

interface AnswerOverview {
  id?: Answer['id'];
  userId: UserType['id'];
  timestamp?: Date;
  latestStatusReply?: number;
  commentCount?: number;
}

interface Outro {
  answers: AnswerOverview[];
  timestamp: {
    lte: Date;
    gte: Date;
  };
  answerGroups: AnswerGroupWithAnswers[];
}
@Controller('/answers')
export class AnswersController {
  constructor(
    private messaging: MessagingService,
    private answerGroupService: AnswerGroupService,
    private formService: FormService,
    private securityService: SecurityService,
    private routineSettingsService: RoutineSettingsService,
    private cronService: CronService,
  ) {}

  @Cacheable('0', 24 * 60 * 60)
  private async getTeamCompany(teamId: string): Promise<Team> {
    return await this.messaging.sendMessage<Team>(
      'business.core-ports.get-team-company',
      { id: teamId },
    );
  }

  @Stopwatch({ omitArgs: ['0'] })
  @Get('/summary/:teamId?')
  async findAnswersFromTeam(
    @User() user: UserType,
    @Param('teamId') teamId: string,
    @Query() query: FindAnswersQuery,
  ): Promise<Outro> {
    const decodedTeamUsersIds = decodeURIComponent(query.teamUsersIds);

    const teamUsersIds: string[] = [
      ...new Set(convertStringToArray(decodedTeamUsersIds)),
    ];
    const { id: companyId } = teamId
      ? await this.getTeamCompany(teamId)
      : { id: user.companies[0].id };

    this.securityService.isUserFromCompany(user, companyId);

    const form = this.formService.getRoutineForm(RoutineFormLangs.PT_BR);

    const feelingQuestion = form.find(
      (question) => question.type === 'emoji_scale',
    );

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        userId: { in: teamUsersIds },
        timestamp: {
          lte: dayjs(query.before).endOf('day').toDate(),
          gte: dayjs(query.after).startOf('day').toDate(),
        },
      },
      include: {
        answers: {
          where: {
            questionId: feelingQuestion.id,
          },
        },
      },
    });

    const teamUsersThatAnswered = teamUsersIds.filter((teamUserId) =>
      answerGroups.find(({ userId }) => userId === teamUserId),
    );

    const formattedAnswerOverview = teamUsersThatAnswered.map((userId) => {
      const answerGroup = answerGroups.find(
        (answerGroup) => answerGroup.userId === userId,
      );

      if (answerGroup) {
        return {
          id: answerGroup.id,
          userId: userId,
          latestStatusReply: answerGroup.answers[0].value
            ? Number(answerGroup.answers[0].value)
            : undefined,
          timestamp: answerGroup.timestamp,
        };
      }
    });

    // TODO: move these requests to the front-end as a way to (1) reduce this request's response time and (2) lower the coupling between microservices
    const answersSummaryWithComments = await Promise.all(
      formattedAnswerOverview.map(async (answer) => {
        const commentCount = await this.fetchCommentCount(answer);
        if (commentCount) return { ...answer, commentCount };
        return answer;
      }),
    );

    return {
      answers: orderBy(answersSummaryWithComments, 'timestamp'),
      answerGroups,
      timestamp: {
        lte: dayjs(query.before).endOf('day').toDate(),
        gte: dayjs(query.after).startOf('day').toDate(),
      },
    };
  }

  @Cacheable(
    '0.id',
    // Reduces the TTL when it's Monday. Hacky, but it works ¯\_(ツ)_/¯
    () => {
      // Comment count by week day since 2023-05-01
      // Fri: 329
      // Mon: 257
      // Tue: 75
      // Wed: 29
      // Thu: 24
      // Sat: 3
      return [1, 5].includes(new Date().getDay()) ? 15 * 60 : 60 * 60;
    },
  )
  private async fetchCommentCount(
    answer: Omit<AnswerOverview, 'commentCount'>,
  ) {
    try {
      const commentCount = await this.messaging.sendMessage<number | undefined>(
        'comments-microservice.comment-count',
        `routine:${answer.id}`,
      );

      return commentCount;
    } catch (err) {
      return;
    }
  }

  @Cacheable((teamId, resolveTree) => `${teamId}:${resolveTree}`, 60 * 60)
  private async getUsersFromTeam(teamId: string, resolveTree: boolean) {
    return await this.messaging.sendMessage<UserType[]>(
      'business.core-ports.get-users-from-team',
      {
        teamID: teamId,
        filters: { resolveTree },
      },
    );
  }

  @Stopwatch({ omitArgs: ['0'] })
  @Get('/overview/:teamId')
  async findOverviewFromTeam(
    @User() user: UserType,
    @Param('teamId') teamId: string,
    @Query('includeSubteams')
    includeSubteams?: FindAnswersQuery['includeSubteams'],
    @Query('after') after?: string,
    @Query('before') before?: string,
  ) {
    const { id: companyId } = teamId
      ? await this.getTeamCompany(teamId)
      : { id: user.companies[0].id };

    this.securityService.isUserFromCompany(user, companyId);

    // TODO: cache data?
    const routine = await this.routineSettingsService.routineSettings({
      companyId,
    });

    if (!routine) {
      return;
    }

    const usersFromTeam = await this.getUsersFromTeam(
      teamId ?? user.companies[0].id,
      teamId ? includeSubteams : true,
    );

    const usersFromTeamIds = usersFromTeam.map((user) => user.id);

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
          lte: dayjs(before ?? today)
            .endOf('day')
            .toDate(),
          gte: dayjs(after ?? threeMonthsBefore)
            .startOf('day')
            .toDate(),
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

    const uniqueAnswerGroups =
      before && after ? uniqBy(answerGroups, 'userId') : answerGroups;

    const answerGroupsWithTimestamp = uniqueAnswerGroups.map((answerGroup) => {
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
          average: Number(mean.toFixed(1)),
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

  @Stopwatch({ omitArgs: ['0'] })
  @Get('/flags/:teamId')
  async getRoutineFlagsFromTeam(
    @User() user: UserType,
    @Param('teamId') teamId: string,
  ) {
    const { id: companyId } = teamId
      ? await this.getTeamCompany(teamId)
      : { id: user.companies[0].id };

    this.securityService.isUserFromCompany(user, companyId);

    // TODO: cache data?
    const routine = await this.routineSettingsService.routineSettings({
      companyId,
    });

    if (!routine) {
      return;
    }

    const usersFromTeam = await this.getUsersFromTeam(
      teamId ?? user.companies[0].id,
      true,
    );

    const usersFromTeamIds = usersFromTeam.map((user) => user.id);

    const form = this.formService.getRoutineForm(RoutineFormLangs.PT_BR);
    const questions = form.filter(
      (question) =>
        question.type === 'emoji_scale' ||
        question.type === 'value_range' ||
        question.type === 'road_block',
    );
    const questionsId = questions.map((question) => question.id);

    const parsedCron = this.cronService.parse(routine.cron);
    const { finishDate, startDate } = this.cronService.getTimespan(parsedCron);

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        userId: { in: usersFromTeamIds },
        timestamp: {
          lte: finishDate,
          gte: startDate,
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

    const discouraged = [];
    const lowProductivity = [];
    const roadBlock = [];

    answerGroups.forEach((answerGroup) => {
      answerGroup.answers.forEach((answer) => {
        if (answer.questionId === questionsId[0] && Number(answer.value) <= 2) {
          discouraged.push(answerGroup.userId);
        }
        if (answer.questionId === questionsId[1] && Number(answer.value) <= 3) {
          lowProductivity.push(answerGroup.userId);
        }
        if (answer.questionId === questionsId[2] && answer.value === 'y') {
          roadBlock.push(answerGroup.userId);
        }
      });
    });

    return [
      {
        type: 'feeling',
        quantity: discouraged.length,
        usersIds: discouraged,
      },
      {
        type: 'productivity',
        quantity: lowProductivity.length,
        usersIds: lowProductivity,
      },
      {
        type: 'roadblock',
        quantity: roadBlock.length,
        usersIds: roadBlock,
      },
    ];
  }

  @Stopwatch({ omitArgs: ['0'] })
  @Get('/overview/user/:userId')
  async getUserLastMetrics(
    @User() user: UserType,
    @Param('userId') userId: string,
  ) {
    const companyId = user.companies[0].id;

    this.securityService.isUserFromCompany(user, companyId);

    // TODO: cache data?
    const routine = await this.routineSettingsService.routineSettings({
      companyId,
    });

    if (!routine) {
      return;
    }

    const form = this.formService.getRoutineForm(RoutineFormLangs.PT_BR);
    const questions = form.filter(
      (question) =>
        question.type === 'emoji_scale' ||
        question.type === 'value_range' ||
        question.type === 'road_block',
    );
    const questionsId = questions.map((question) => question.id);

    const parsedCron = this.cronService.parse(routine.cron);
    const { finishDate, startDate } = this.cronService.getTimespan(parsedCron);

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        userId,
        timestamp: {
          lte: finishDate,
          gte: startDate,
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

    if (answerGroups.length < 1) {
      return;
    }

    const feeling = answerGroups[0].answers.find(
      (answer) => answer.questionId === questionsId[0],
    );
    const productivity = answerGroups[0].answers.find(
      (answer) => answer.questionId === questionsId[1],
    );
    const roadBlock = answerGroups[0].answers.find(
      (answer) => answer.questionId === questionsId[2],
    );

    return {
      roadBlock: roadBlock.value,
      productivity: productivity.value,
      feeling: feeling.value,
      lastRoutineAnswerId: answerGroups[0].id,
    };
  }
}
