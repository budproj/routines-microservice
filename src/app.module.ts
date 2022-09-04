import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import configuration from './config/configuration';
import { HealthCheckDBService } from './healthcheck.db.service';
import { HealthCheckRestController } from './healthcheck.rest.controller';
import { PendingRoutinesController } from './pending-routines/pending-routines.controller';
import { PrismaService } from './infrastructure/orm/prisma.service';
import { NatsController } from './nats.controller';
import { RoutineService } from './services/routines.service';
import { RoutineSettingsService } from './services/routineSettings.service';
import { AnswerGroupService } from './services/answerGroup.service';
import { CronService } from './services/cron.service';
import { UserValidatorMiddleware } from './middlewares/user-validator.middleware';

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
  ],
  providers: [
    HealthCheckDBService,
    PrismaService,
    RoutineService,
    RoutineSettingsService,
    AnswerGroupService,
    CronService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserValidatorMiddleware).forRoutes('*');
  }
}
