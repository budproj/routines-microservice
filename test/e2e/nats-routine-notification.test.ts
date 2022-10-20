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

  it('should process and send notification messages to business', async () => {
    // Arrange
    const input = { id: '123', companyId: '123', disabledTeams: [] };
    const replyQueue = 'notification-ports.PENDENCIES-NOTIFICATION';

    natsConnection.subscribe('core-ports.get-team-members', {
      callback: (error, msg) => msg.respond(jsonCodec.encode([])),
    });

    natsConnection.subscribe('core-ports.get-user-team-tree', {
      callback: (error, msg) => msg.respond(jsonCodec.encode([])),
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
