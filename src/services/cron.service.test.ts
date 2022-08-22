import { Cadence } from '@prisma/client';
import * as cronParser from 'cron-parser';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';

import { CronService } from './cron.service';

describe('Cron Service', () => {
  const cronService = new CronService();
  dayjs.extend(utc);

  describe('getWeeklyCron', () => {
    it('should return a cron expression for each day of week', () => {
      const sundayDate = new Date(2022, 7, 14);
      const mondayDate = new Date(2022, 7, 15);
      const tuesdayDate = new Date(2022, 7, 16);
      const wednesdayDate = new Date(2022, 7, 17);
      const thursdayDate = new Date(2022, 7, 18);
      const fridayDate = new Date(2022, 7, 19);
      const saturdayDate = new Date(2022, 7, 20);

      const sundayCron = cronService.getWeeklyCron(sundayDate);
      const mondayCron = cronService.getWeeklyCron(mondayDate);
      const tuesdayCron = cronService.getWeeklyCron(tuesdayDate);
      const wednesdayCron = cronService.getWeeklyCron(wednesdayDate);
      const thursdayCron = cronService.getWeeklyCron(thursdayDate);
      const fridayCron = cronService.getWeeklyCron(fridayDate);
      const saturdayCron = cronService.getWeeklyCron(saturdayDate);

      expect(sundayCron).toBe('0 0 * * 0');
      expect(mondayCron).toBe('0 0 * * 1');
      expect(tuesdayCron).toBe('0 0 * * 2');
      expect(wednesdayCron).toBe('0 0 * * 3');
      expect(thursdayCron).toBe('0 0 * * 4');
      expect(fridayCron).toBe('0 0 * * 5');
      expect(saturdayCron).toBe('0 0 * * 6');
    });
  });

  describe('getCron', () => {
    it('should return a cron expression for weekly cadence', () => {
      // Arrange
      const cadence = Cadence.WEEKLY;
      const startDate = new Date();

      // Act
      const cron = cronService.getCron(cadence, startDate);

      // Assert
      const cronExpression = `0 0 * * ${startDate.getDay()}`;
      expect(cron).toEqual(cronExpression);
    });
  });

  describe('parse', () => {
    it('should return the parsed cron interval', () => {
      // Arrange
      const parserSpy = jest.spyOn(cronParser, 'parseExpression');
      const cron = '0 0 * * 0';

      // Act
      const interval = cronService.parse(cron);

      // Assert
      expect(parserSpy.mock.calls[0][0]).toBe(cron);
      expect(parserSpy.mock.calls[0][1]).toEqual(
        expect.objectContaining({ utc: true }),
      );
      expect(interval).toBeTruthy();
      expect(interval.next().toDate()).toEqual(
        dayjs().utc().startOf('week').add(1, 'week').toDate(),
      );
    });
  });

  describe('parseFromCadence', () => {
    const cadence = Cadence.WEEKLY;
    const startDate = new Date();

    it('should get the cron expression from the cadence', () => {
      // Arrange
      const getWeeklyCronSpy = jest.spyOn(cronService, 'getWeeklyCron');

      // Act
      cronService.parseFromCadence(cadence, startDate);

      // Assert
      expect(getWeeklyCronSpy).toBeCalledTimes(1);
    });

    it('should parse the cron expression', () => {
      // Arrange
      const parseSpy = jest.spyOn(cronService, 'parse');

      // Act
      cronService.parseFromCadence(cadence, startDate);

      // Assert
      expect(parseSpy).toBeCalledTimes(1);
    });

    it('should return the parsed cron interval', () => {
      // Arrange
      const cronExpression = '0 0 * * 0';
      const mockInterval = cronParser.parseExpression(cronExpression);
      jest.spyOn(cronService, 'parse').mockReturnValue(mockInterval);

      // Act
      const parsedCron = cronService.parseFromCadence(cadence, startDate);

      // Assert
      expect(parsedCron).toBe(mockInterval);
    });
  });
});
