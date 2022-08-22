import { Injectable } from '@nestjs/common';
import { Routine, Prisma } from '@prisma/client';

import { PrismaService } from '../infrastructure/orm/prisma.service';

@Injectable()
export class RoutineService {
  constructor(private prisma: PrismaService) {}

  async routine(
    routineWhereUniqueInput: Prisma.RoutineWhereUniqueInput,
  ): Promise<Routine | null> {
    return this.prisma.routine.findUnique({
      where: routineWhereUniqueInput,
    });
  }

  async routines(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.RoutineWhereUniqueInput;
    where?: Prisma.RoutineWhereInput;
    orderBy?: Prisma.RoutineOrderByWithRelationInput;
  }): Promise<Routine[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.routine.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createRoutine(data: Prisma.RoutineCreateInput): Promise<Routine> {
    return this.prisma.routine.create({
      data,
    });
  }

  async updateRoutine(params: {
    where: Prisma.RoutineWhereUniqueInput;
    data: Prisma.RoutineUpdateInput;
  }): Promise<Routine> {
    const { data, where } = params;
    return this.prisma.routine.update({
      data,
      where,
    });
  }

  async updateRoutines(params: {
    where: Prisma.RoutineWhereInput;
    data: Prisma.RoutineUpdateManyMutationInput;
  }): Promise<Prisma.BatchPayload> {
    const { data, where } = params;

    return this.prisma.routine.updateMany({
      where,
      data,
    });
  }

  async deleteRoutine(where: Prisma.RoutineWhereUniqueInput): Promise<Routine> {
    return this.prisma.routine.delete({
      where,
    });
  }
}
