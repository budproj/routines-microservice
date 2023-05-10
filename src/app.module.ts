import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { LoggerModule } from 'nestjs-pino';

import { AnswerController } from './controllers/answer/answer.controller';
import { HealthCheckRestController } from './controllers/health-check/healthcheck.rest.controller';
import { PendingRoutinesController } from './controllers/pending-routines/pending-routines.controller';
import { RabbitMqController } from './controllers/rabbitmq/rabbitmq.controller';
import { FormControler } from './controllers/forms/form.controller';
import { AnswersController } from './controllers/answers/answers.controller';
import { SettingsController } from './controllers/settings/settings.controller';

import { HealthCheckDBService } from './services/healthcheck.db.service';
import { RoutineService } from './services/routines.service';
import { RoutineSettingsService } from './services/routineSettings.service';
import { AnswerGroupService } from './services/answerGroup.service';
import { CronService } from './services/cron.service';
import { FormService } from './services/form.service';
import { SecurityService } from './services/security.service';
import { MessagingService } from './services/messaging.service';

import { UserValidatorMiddleware } from './middlewares/user-validator.middleware';
import { AnswersService } from './services/answers.service';

import { PrismaService } from './infrastructure/orm/prisma.service';
import configuration from './config/configuration';
import { PingController } from './controllers/ping.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        redact: {
          paths: ['req.headers'],
        },
        customProps: (req, res) => ({
          context: 'HTTP',
        }),
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
            singleLine: true,
          },
        },
      },
    }),
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        exchanges: [{ name: 'bud', type: 'topic' }],
        uri: configService.get<string>('rabbitmqConnectionString'),
        enableControllerDiscovery: true,
        connectionInitOptions: { wait: true },
      }),
    }),
  ],
  controllers: [
    PingController,
    RabbitMqController,
    HealthCheckRestController,
    PendingRoutinesController,
    FormControler,
    AnswerController,
    AnswersController,
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
    MessagingService,
    SecurityService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(UserValidatorMiddleware)
      .forRoutes(
        PendingRoutinesController,
        FormControler,
        AnswerController,
        AnswersController,
        SettingsController,
      );
  }
}
