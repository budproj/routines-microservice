import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';

import { Team } from 'src/types/Team';
import { User } from 'src/types/User';
import { Stopwatch } from '../decorators/pino.decorator';
import { MessagingService } from '../services/messaging.service';

@Injectable()
export class UserValidatorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(UserValidatorMiddleware.name);

  constructor(private messaging: MessagingService) {}

  @Stopwatch({ omitArgs: true })
  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.header('authorization');
    this.logger.log('Fetching user data');

    if (!authHeader) {
      throw new HttpException('No auth token', HttpStatus.UNAUTHORIZED);
    }

    const [, token] = authHeader.split(' ');
    const decodedToken = await this.messaging.sendMessage<JwtPayload>(
      'business.core-ports.verify-token',
      token,
    );

    const user = await this.messaging.sendMessage<User>(
      'business.core-ports.get-user-with-teams-by-sub',
      decodedToken.sub,
    );

    const userCompanies = await this.messaging.sendMessage<Team[]>(
      'business.core-ports.get-user-companies',
      user,
    );

    req.user = {
      ...user,
      companies: userCompanies,
      permissions: decodedToken.permissions,
    };

    next();
  }
}
