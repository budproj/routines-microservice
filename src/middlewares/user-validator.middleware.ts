import {
  Injectable,
  NestMiddleware,
  Inject,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { lastValueFrom } from 'rxjs';
import { Team } from 'src/types/Team';

import { User } from 'src/types/User';

@Injectable()
export class UserValidatorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(UserValidatorMiddleware.name);

  constructor(@Inject('NATS_SERVICE') private nats: ClientProxy) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.header('authorization');
    this.logger.log('Fetching user data');

    if (!authHeader) {
      throw new HttpException('No auth token', HttpStatus.UNAUTHORIZED);
    }

    const [_, token] = authHeader.split(' ');
    const decodedToken = await lastValueFrom<
      JwtPayload & { permissions: string[] }
    >(this.nats.send('core-ports.verify-token', token));

    const user = await lastValueFrom<User>(
      this.nats.send('core-ports.get-user-with-teams-by-sub', decodedToken.sub),
    );

    const userCompanies = await lastValueFrom<Team[]>(
      this.nats.send('core-ports.get-user-companies', user),
    );

    req.user = {
      ...user,
      companies: userCompanies,
      permissions: decodedToken.permissions,
    };

    this.logger.log('Injecting user data', req.user);

    next();
  }
}
