import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { AnswerController } from './controllers/answer/answer.controller';
import { HealthCheckRestController } from './controllers/health-check/healthcheck.rest.controller';
import { PendingRoutinesController } from './controllers/pending-routines/pending-routines.controller';
import { NatsController } from './controllers/nats/nats.controller';
import { FormControler } from './controllers/forms/form.controller';
import { SettingsController } from './controllers/settings/settings.controller';

import { HealthCheckDBService } from './services/healthcheck.db.service';
import { RoutineService } from './services/routines.service';
import { RoutineSettingsService } from './services/routineSettings.service';
import { AnswerGroupService } from './services/answerGroup.service';
import { CronService } from './services/cron.service';
import { FormService } from './services/form.service';
import { SecurityService } from './services/security.service';

import { UserValidatorMiddleware } from './middlewares/user-validator.middleware';
import { AppLoggerMiddleware } from './middlewares/route-logger.middleware';
import { AnswersService } from './services/answers.service';

import { PrismaService } from './infrastructure/orm/prisma.service';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ClientsModule.registerAsync([
      {
        name: 'NATS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.get<string>('natsConnectionString')],
          },
        }),
      },
    ]),
  ],
  controllers: [
    NatsController,
    HealthCheckRestController,
    PendingRoutinesController,
    FormControler,
    AnswerController,
    SettingsController,
  ],
  providers: [
    HealthCheckDBService,
    PrismaService,
    RoutineService,
    RoutineSettingsService,
    AnswerGroupService,
    AnswersService,
    CronService,
    FormService,
    SecurityService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AppLoggerMiddleware).forRoutes('*');
    consumer
      .apply(UserValidatorMiddleware)
      .forRoutes(
        PendingRoutinesController,
        FormControler,
        AnswerController,
        SettingsController,
      );
  }
}
