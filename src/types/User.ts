import { Team } from './Team';

export interface User {
  id: string;
  teams: Team[];
  companies: Team[];
  permissions: string[];
}
