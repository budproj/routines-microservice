import { PrismaClient } from '@prisma/client';
import { connect, JSONCodec, NatsConnection } from 'nats';
import { randomUUID } from 'node:crypto';
import {
  getNatsConnectionString,
  getPostgresConnectionString,
  getRestConnectionString,
} from './support-functions/generate-connection-strings';
import {
  generateInvalidJwt,
  generateValidJwt,
} from './support-functions/generateJwt';

describe('REST - Answers routes', () => {
  jest.setTimeout(120_000);
  let url: string;
  let dbConnection: PrismaClient;

  let validJWTToken: string;
  let invalidJWTToken: string;

  let natsConnection: NatsConnection;
  const jsonCodec = JSONCodec<any>();

  let userId = randomUUID();

  beforeAll(async () => {
    url = getRestConnectionString(global.__api__);
    validJWTToken = await generateValidJwt({ sub: '123' });
    invalidJWTToken = await generateInvalidJwt({ sub: '123' });
  });

  beforeAll(async () => {
    const postgresConStr = getPostgresConnectionString(global.__postgres__);

    dbConnection = new PrismaClient({
      datasources: { db: { url: postgresConStr } },
    });

    await dbConnection.$connect();
  });

  beforeAll(async () => {
    const natsConnectionString = getNatsConnectionString(global.__nats__);
    natsConnection = await connect({ servers: natsConnectionString });
  });

  // TODO: PARAMOS AQUI 03/11/22
  // beforeAll(async () => {
  //   natsConnection.subscribe('core-ports.verify-token', {
  //     callback: (err, msg) => {
  //       msg.respond(jsonCodec.encode({ userId }));
  //     },
  //   });
  //   natsConnection.subscribe('core-ports.get-user-with-teams-by-sub');
  //   natsConnection.subscribe('core-ports.get-user-companies');
  // });

  afterAll(async () => {
    await natsConnection.drain();
    await natsConnection.close();
    await dbConnection.$disconnect();
  });

  describe('GET /answers/:answerGroupId', () => {
    it('should receive an enswer group instance from the database', async () => {
      // Arrange
      const answerGroupData = {
        companyId: randomUUID(),
        userId: randomUUID(), // TODO
        answers: {
          create: [
            { questionId: randomUUID(), value: '2' },
            { questionId: randomUUID(), value: 'Y' },
            { questionId: randomUUID(), value: 'I did it.' },
          ],
        },
      };

      const insertedAnswerGroup = await dbConnection.answerGroup.create({
        data: answerGroupData,
      });

      // Act
      // fetch(url/answer/:answerGroupId)

      // Assert
      //expect(result).toBe(answerGroup + answers)
    });
  });
});
