import { getRestConnectionString } from './support-functions/generate-connection-strings';

describe('REST Health Check', () => {
  jest.setTimeout(120_000);
  let url: string;

  beforeAll(() => {
    url = getRestConnectionString(global.__api__);
  });

  it('should respond pong on route /healthcheck', async () => {
    // Arrange
    // Act
    const data = await fetch(`${url}/healthcheck`);
    const response = await data.text();

    // Assert
    expect(response).toBe('pong');
  });
});
