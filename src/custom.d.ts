import { User } from 'src/types/User';

declare global {
  namespace Express {
    export interface Request {
      user?: User;
    }
  }
}
