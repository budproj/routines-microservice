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

@Injectable()
export class UserValidatorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(UserValidatorMiddleware.name);

  constructor(private readonly rabbitmq: AmqpConnection) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.header('authorization');
    this.logger.log('Fetching user data');

    if (!authHeader) {
      throw new HttpException('No auth token', HttpStatus.UNAUTHORIZED);
    }

    const [, token] = authHeader.split(' ');
    const decodedToken = await this.rabbitmq.request<JwtPayload>({
      exchange: 'bud',
      routingKey: 'business.core-ports.verify-token',
      payload: token,
    });

    const user = await this.rabbitmq.request<User>({
      exchange: 'bud',
      routingKey: 'business.core-ports.get-user-with-teams-by-sub',
      payload: decodedToken.sub,
    });

    const userCompanies = await this.rabbitmq.request<Team[]>({
      exchange: 'bud',
      routingKey: 'business.core-ports.get-user-companies',
      payload: user,
    });

    req.user = {
      ...user,
      companies: userCompanies,
      permissions: decodedToken.permissions,
    };

    next();
  }
}
