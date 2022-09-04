import { Routine } from '../services/routines.service';

export interface PendingRoutine extends Routine {
  status: {
    latestReply?: Date;
  };
}

export const pendingRoutineSerializer = (
  routine: Routine,
  daysOutdated: number,
  latestReply?: Date,
) => {
  return {
    ...routine,
    daysOutdated,
    status: {
      latestReply,
    },
  };
};
