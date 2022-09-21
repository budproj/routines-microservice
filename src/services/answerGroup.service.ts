import { Injectable } from '@nestjs/common';
import { AnswerGroup, Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as weekOfYear from 'dayjs/plugin/weekOfYear';

import { PrismaService } from '../infrastructure/orm/prisma.service';
import { User } from '../types/User';
import { AnswerGroupWithAnswers } from '../types/AnswerGroupWithAnswers';
import getDateOfISOWeek from 'src/shared/helpers/get-date-of-iso-week';

@Injectable()
export class AnswerGroupService {
  constructor(private prisma: PrismaService) {
    dayjs.extend(utc);
    dayjs.extend(weekOfYear);
  }

  async answerGroup(
    answerGroupWhereUniqueInput: Prisma.AnswerGroupWhereUniqueInput,
  ): Promise<AnswerGroup | null> {
    return this.prisma.answerGroup.findUnique({
      where: answerGroupWhereUniqueInput,
    });
  }

  async answerGroups(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.AnswerGroupWhereUniqueInput;
    where?: Prisma.AnswerGroupWhereInput;
    orderBy?: Prisma.AnswerGroupOrderByWithRelationInput;
    include?: Prisma.AnswerGroupInclude;
  }): Promise<AnswerGroupWithAnswers[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    return this.prisma.answerGroup.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include,
    });
  }

  async createAnswerGroup(
    data: Prisma.AnswerGroupCreateInput,
  ): Promise<AnswerGroup> {
    return this.prisma.answerGroup.create({
      data,
    });
  }

  async updateAnswerGroup(params: {
    where: Prisma.AnswerGroupWhereUniqueInput;
    data: Prisma.AnswerGroupUpdateInput;
  }): Promise<AnswerGroup> {
    const { data, where } = params;
    return this.prisma.answerGroup.update({
      data,
      where,
    });
  }

  async updateAnswerGroups(params: {
    where: Prisma.AnswerGroupWhereInput;
    data: Prisma.AnswerGroupUpdateManyMutationInput;
  }): Promise<Prisma.BatchPayload> {
    const { data, where } = params;

    return this.prisma.answerGroup.updateMany({
      where,
      data,
    });
  }

  async deleteAnswerGroup(
    where: Prisma.AnswerGroupWhereUniqueInput,
  ): Promise<AnswerGroup> {
    return this.prisma.answerGroup.delete({
      where,
    });
  }

  async latestAnswerFromUser(userId: User['id']) {
    const [latestAnswer] = await this.answerGroups({
      where: { userId },
      take: 1,
      orderBy: {
        timestamp: 'desc',
      },
    });

    return latestAnswer;
  }

  answeredWithinTimeSpan(answerDate: Date, timeSpanForAnwser: number): boolean {
    const todayUtcDate = dayjs().utc();
    const differenceInDaysFromToday = todayUtcDate.diff(answerDate, 'day');
    const answeredWithinTimeSpan =
      differenceInDaysFromToday <= timeSpanForAnwser;
    return answeredWithinTimeSpan;
  }

  parseAnswerTimestamp(answerGroup: AnswerGroup): AnswerGroupWithAnswers {
    const dayJsTimestamp = dayjs(answerGroup.timestamp);
    const week = dayJsTimestamp.week();
    const year = dayJsTimestamp.format('YYYY');

    const newTimestamp = getDateOfISOWeek(week, year);

    return {
      ...answerGroup,
      timestamp: newTimestamp,
    };
  }
}
