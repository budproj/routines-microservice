import { Team } from './Team';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  teams: Team[];
  companies: Team[];
  picture: string;
  permissions: string[];
  authzSub?: string;
}
