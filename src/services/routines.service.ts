import { Injectable } from '@nestjs/common';

export enum Cadence {
  WEEKLY = 'WEEKLY',
}

export interface Routine {
  name: string;
  cadence: Cadence;
}

@Injectable()
export class RoutineService {
  budRoutine: Routine;

  constructor() {
    this.budRoutine = {
      name: 'Retrospectiva',
      cadence: Cadence.WEEKLY,
    };
  }

  routine(): Routine {
    return this.budRoutine;
  }

  getTimeSpanForAnwser(): number {
    const weeklyTimespan = 7;
    return weeklyTimespan;
  }
}
