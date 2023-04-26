import { Controller, Get, Logger, Param, Query } from '@nestjs/common';
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

@Controller('/answers')
export class AnswersController {
  private readonly logger = new Logger(AnswersController.name);

  constructor(
    private messaging: MessagingService,
    private answerGroupService: AnswerGroupService,
    private formService: FormService,
    private securityService: SecurityService,
    private routineSettingsService: RoutineSettingsService,
    private cronService: CronService,
  ) {}

  /**
   * @deprecated TODO: refactor into a proper aspected-oriented logging system instead of polluting the business logic
   */
  $timer(startMessage: string) {
    this.logger.log(startMessage);
    const startedAt = Date.now();

    /**
     * @deprecated see above
     */
    return (endMessage: string) => {
      const duration = Date.now() - startedAt;
      this.logger.log(`${endMessage} after ${duration}ms`);
    };
  }

  @Get('/summary/:teamId?')
  async findAnswersFromTeam(
    @User() user: UserType,
    @Param('teamId') teamId: string,
    @Query() query: FindAnswersQuery,
  ): Promise<AnswerOverview[]> {
    const decodedTeamUsersIds = decodeURIComponent(query.teamUsersIds);

    const teamUsersIds = convertStringToArray(decodedTeamUsersIds);
    const company = await this.messaging.sendMessage<Team>(
      'business.core-ports.get-team-company',
      { id: teamId ?? user.companies[0].id },
    );

    this.securityService.isUserFromCompany(user, company.id);

    const form = this.formService.getRoutineForm(RoutineFormLangs.PT_BR);

    const feelingQuestion = form.find(
      (question) => question.type === 'emoji_scale',
    );

    const answerGroupsTimer = this.$timer(`About to find summary for ${teamId}`);

    const answerGroups = await this.answerGroupService.answerGroups({
      where: {
        userId: { in: teamUsersIds },
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

    answerGroupsTimer(`Found ${answerGroups.length} answer groups`);

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

    const answersSummaryWithComments = await Promise.all(
      formattedAnswerOverview.map(async (answer) => {
        try {
          const commentCountTimer = this.$timer(`About to find comment count for ${answer.id}`);

          const commentCount = await this.messaging.sendMessage<
            number | undefined
          >('comments-microservice.comment-count', `routine:${answer.id}`);

          commentCountTimer(`Found comment count for ${answer.id}`);

          return {
            ...answer,
            commentCount,
          };
        } catch (err) {
          return answer;
        }
      }),
    );

    return orderBy(answersSummaryWithComments, 'timestamp');
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
    const company = await this.messaging.sendMessage<Team>(
      'business.core-ports.get-team-company',
      { id: teamId ?? user.companies[0].id },
    );

    this.securityService.isUserFromCompany(user, company.id);

    const routineSettingsTimer = this.$timer(`About to find routine settings for ${company.id}`);

    // TODO: cache data
    const routine = await this.routineSettingsService.routineSettings({
      companyId: company.id,
    });

    routineSettingsTimer(`Found routine settings for ${company.id}`);

    if (!routine) {
      return {
        overview: null,
      };
    }

    const usersFromTeamTimer = this.$timer(`About to find users from team ${company.id}`);

    // TODO: cache data
    const usersFromTeam = await this.messaging.sendMessage<UserType[]>(
      'business.core-ports.get-users-from-team',
      {
        teamID: teamId ?? user.companies[0].id,
        filters: { resolveTree: teamId ? includeSubteams : true },
      },
    );

    usersFromTeamTimer(`Found users from team ${company.id}`);

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

    const answerGroupsTimer = this.$timer(`About to find answer groups for ${company.id}`);

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

    answerGroupsTimer(`Found ${answerGroups.length} answer groups for ${company.id}`);

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

  @Get('/flags/:teamId')
  async getRoutineFlagsFromTeam(
    @User() user: UserType,
    @Param('teamId') teamId: string,
  ) {
    const company = await this.messaging.sendMessage<Team>(
      'business.core-ports.get-team-company',
      { id: teamId ?? user.companies[0].id },
    );

    this.securityService.isUserFromCompany(user, company.id);

    const routineSettingsTimer = this.$timer(`About to find routine settings for ${company.id}`);

    // TODO: cache data
    const routine = await this.routineSettingsService.routineSettings({
      companyId: company.id,
    });

    routineSettingsTimer(`Found routine settings for ${company.id}`);

    if (!routine) {
      return {
        overview: null,
      };
    }

    const usersFromTeamTimer = this.$timer(`About to find users from team ${company.id}`);

    // TODO: cache data
    const usersFromTeam = await this.messaging.sendMessage<UserType[]>(
      'business.core-ports.get-users-from-team',
      {
        teamID: teamId ?? user.companies[0].id,
        filters: { resolveTree: true },
      },
    );

    usersFromTeamTimer(`Found users from team ${company.id}`);

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

    const answerGroupsTimer = this.$timer(`About to find answer groups for ${company.id}`);

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

    answerGroupsTimer(`Found ${answerGroups.length} answer groups for ${company.id}`);

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

  @Get('/overview/user/:userId')
  async getUserLastMetrics(
    @User() user: UserType,
    @Param('userId') userId: string,
  ) {
    const company = await this.messaging.sendMessage<Team>(
      'business.core-ports.get-team-company',
      { id: user.companies[0].id },
    );

    this.securityService.isUserFromCompany(user, company.id);

    const routineSettingsTimer = this.$timer(`About to find routine settings for ${company.id}`);

    // TODO: cache data
    const routine = await this.routineSettingsService.routineSettings({
      companyId: company.id,
    });

    routineSettingsTimer(`Found routine settings for ${company.id}`);

    if (!routine) {
      return {
        overview: null,
      };
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

    const answerGroupsTimer = this.$timer(`About to find answer groups for ${company.id}`);

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

    answerGroupsTimer(`Found ${answerGroups.length} answer groups for ${company.id}`);

    if (answerGroups.length < 1) {
      return {
        overview: null,
      };
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
