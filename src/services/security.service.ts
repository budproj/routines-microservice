import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { User, User as UserType } from '../types/User';
import { Team } from '../types/Team';

@Injectable()
export class SecurityService {
  async isUserFromTeam(
    user: UserType,
    teamId: Team['id'],
    adminRoleToCheck?: string,
  ) {
    const isUserFromTeam = user.companies.some(
      (company) => company.id === teamId,
    );

    const hasAdminRole = adminRoleToCheck
      ? this.userHasPermission(user.permissions, adminRoleToCheck, false)
      : false;

    if (!isUserFromTeam && !hasAdminRole) {
      throw new HttpException(
        "User isn't a member of the team ",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  userHasPermission(
    userPermissions: User['permissions'],
    permissionToCheck: string,
    throwError = true,
  ): boolean {
    if (!userPermissions.includes(permissionToCheck) && throwError) {
      throw new HttpException(
        "User doesn't have permission to execute this action",
        HttpStatus.UNAUTHORIZED,
      );
    }

    return true;
  }

  isUserFromCompany(
    user: UserType,
    companyId: Team['id'],
    adminRoleToCheck?: string,
  ) {
    const isUserFromCompany = user.companies.some(
      (company) => company.id === companyId,
    );

    const hasAdminRole = adminRoleToCheck
      ? this.userHasPermission(user.permissions, adminRoleToCheck, false)
      : false;

    if (!isUserFromCompany && !hasAdminRole) {
      throw new HttpException(
        "User isn't a member of this company",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
