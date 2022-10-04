import { Prisma } from '@prisma/client';

export interface SettingsWithoutCompany {
  disabledTeams?:
    | Prisma.RoutineSettingsCreatedisabledTeamsInput
    | Prisma.Enumerable<string>;
  cron: string;
}
