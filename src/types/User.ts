import { Team } from './Team';

export interface User {
  id: '922ef72a-6c3c-4075-926a-3245cdeea75f';
  firstName: string;
  lastName: string;
  teams: Team[];
  companies: Team[];
  picture: string;
  authzSub?: string;
}
