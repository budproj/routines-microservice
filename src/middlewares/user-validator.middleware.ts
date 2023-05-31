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
import { Cacheable } from '../decorators/cacheable.decorator';

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

    const decodedToken = await this.verifyToken(token);
    const user = await this.getUserBySub(decodedToken.sub);
    const userCompanies = await this.getUserCompanies(user);

    req.user = {
      ...user,
      companies: userCompanies,
      permissions: decodedToken.permissions,
    };

    next();
  }

  @Cacheable('0', 5 * 60)
  private async verifyToken(token: string): Promise<JwtPayload> {
    return this.messaging.sendMessage<JwtPayload>(
      'business.core-ports.verify-token',
      token,
    );
  }

  @Cacheable('0', 60 * 60)
  private async getUserBySub(sub: string): Promise<User> {
    return this.messaging.sendMessage<User>(
      'business.core-ports.get-user-with-teams-by-sub',
      sub,
    );
  }

  @Cacheable('0.id', 60 * 60)
  private async getUserCompanies(user: User): Promise<Team[]> {
    return this.messaging.sendMessage<Team[]>(
      'business.core-ports.get-user-companies',
      user,
    );
  }
}
