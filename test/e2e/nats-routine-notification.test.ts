import { connect, NatsConnection, JSONCodec } from 'nats';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  getNatsConnectionString,
  getPostgresConnectionString,
} from './support-functions/generate-connection-strings';

describe('NATS - Routine Notification', () => {
  jest.setTimeout(120_000);

  let natsConnection: NatsConnection;
  let dbConnection: PrismaClient;
  const jsonCodec = JSONCodec<any>();

  beforeAll(async () => {
    const natsConStr = getNatsConnectionString(global.__nats__);
    const postgresConStr = getPostgresConnectionString(global.__postgres__);

    natsConnection = await connect({ servers: natsConStr });
    dbConnection = new PrismaClient({
      datasources: { db: { url: postgresConStr } },
    });

    await dbConnection.$connect();
  });

  afterAll(async () => {
    await natsConnection.drain();
    await natsConnection.close();
    await dbConnection.$disconnect();
  });

  it('should process and send empty team and send message to pendencies qeue', async () => {
    // Arrange
    const input = {
      id: randomUUID(),
      companyId: randomUUID(),
      disabledTeams: [],
      cron: '0 0 * * 5',
    };
    const replyQueue = 'notification-ports.pendencies-notification';

    natsConnection.subscribe('core-ports.get-users-from-team', {
      callback: (error, msg) => msg.respond(jsonCodec.encode([])),
    });

    await dbConnection.routineSettings.create({
      data: input,
    });

    //Act
    const response = await natsConnection.request(
      'routine-notification',
      jsonCodec.encode(input),
      {
        timeout: 10_000,
        noMux: true,
        reply: replyQueue,
      },
    );
    const result = jsonCodec.decode(response.data);
    const { data } = result;

    //Assert
    expect(data).toEqual({
      companyUsers: [],
      usersWithPendingRoutines: [],
    });
  });
});
