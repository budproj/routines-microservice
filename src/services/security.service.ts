import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User as UserType } from '../types/User';
import { Team } from '../types/Team';

@Injectable()
export class SecurityService {
  async isUserFromTeam(user: UserType, teamId: Team['id']) {
    if (user.teams.some((team) => team.id !== teamId)) {
      throw new HttpException(
        "User isn't a member of the team ",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
