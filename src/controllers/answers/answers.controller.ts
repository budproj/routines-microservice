import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { Answer } from '@prisma/client';
import { User } from '../../decorators/user.decorator';
import { AnswerGroupService } from '../../services/answerGroup.service';
import { FormService } from '../../services/form.service';
import { User as UserType } from '../../types/User';
import { RoutineFormLangs } from '../../services/constants/form';
import { MessagingService } from '../../services/messaging.service';

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
  ) {}

  @Get('/summary/:teamId')
  async findAnswersFromTeam(
    @User() user: UserType,
    @Param('teamId') teamId: string,
    @Query() query: FindAnswersQuery,
  ): Promise<AnswerOverview[]> {
    const isUserFromTeam = user.teams.some((team) => team.id === teamId);

    if (!isUserFromTeam) {
      throw new HttpException(
        "User isn't a member of the team ",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const usersFromTeam = await this.nats.sendMessage<
      MessagingQuery,
      UserType[]
    >('core-ports.get-users-from-team', {
      teamID: teamId,
      filters: { resolveTree: query.includeSubteams },
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
        name: `${user.firstName} ${user.lastName}`,
        picture: user.picture,
        latestStatusReply: answerGroup?.answers[0].value
          ? Number(answerGroup.answers[0].value)
          : undefined,
        timestamp: answerGroup?.timestamp,
      };
    });
    return formattedAnswerOverview;
  }
}
