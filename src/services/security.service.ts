import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User as UserType } from '../types/User';
import { Team } from '../types/Team';

@Injectable()
export class SecurityService {
  isUserFromTeam(user: UserType, teamId: Team['id']) {
    if (user.teams.some((team) => team.id !== teamId)) {
      throw new HttpException(
        "User isn't a member of the team ",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
  isUserFromCompany(user: UserType, teamId: Team['id']) {
    if (user.companies.some((company) => company.id !== teamId)) {
      throw new HttpException(
        "User isn't a member of the company ",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
