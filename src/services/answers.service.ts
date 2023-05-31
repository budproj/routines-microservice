import { Injectable } from '@nestjs/common';
import { Answer, Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';

import { PrismaService } from '../infrastructure/orm/prisma.service';
import { Stopwatch } from '../decorators/pino.decorator';

@Injectable()
export class AnswersService {
  constructor(private prisma: PrismaService) {
    dayjs.extend(utc);
  }

  async answer(
    answerWhereUniqueInput: Prisma.AnswerWhereUniqueInput,
  ): Promise<Answer | null> {
    return this.prisma.answer.findUnique({
      where: answerWhereUniqueInput,
    });
  }

  @Stopwatch()
  async answers(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.AnswerWhereUniqueInput;
    where?: Prisma.AnswerWhereInput;
    orderBy?: Prisma.AnswerOrderByWithRelationInput;
  }): Promise<Answer[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.answer.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createAnswer(
    data: Prisma.AnswerCreateManyArgs,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.answer.createMany(data);
  }

  async deleteAnswer(where: Prisma.AnswerWhereUniqueInput): Promise<Answer> {
    return this.prisma.answer.delete({
      where,
    });
  }

  async updateAnswer(params: {
    where: Prisma.AnswerWhereUniqueInput;
    data: Prisma.AnswerUpdateInput;
  }): Promise<Answer> {
    const { data, where } = params;
    return this.prisma.answer.update({
      data,
      where,
    });
  }

  async updateAnswers(params: {
    where: Prisma.AnswerWhereInput;
    data: Prisma.AnswerUpdateManyMutationInput;
  }): Promise<Prisma.BatchPayload> {
    const { data, where } = params;

    return this.prisma.answer.updateMany({
      where,
      data,
    });
  }
}
