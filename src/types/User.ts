import { Team } from './Team';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  teams: Team[];
  companies: Team[];
  picture: string;
  authzSub?: string;
  permissions: string[];
}
