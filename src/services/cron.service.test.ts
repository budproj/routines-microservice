import * as cronParser from 'cron-parser';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';

import { CronService, Cadence } from './cron.service';

describe('Cron Service', () => {
  const cronService = new CronService();
  dayjs.extend(utc);

  beforeEach(jest.clearAllMocks);

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

  describe('getTimespan', () => {
    it('should return the timespam for a given cron expression', () => {
      // arrange
      jest.useFakeTimers({ now: new Date('2022-10-04') });
      const expression = cronParser.parseExpression('0 0 * * 5');

      // act
      const timespan = cronService.getTimespan(expression);

      // assert
      expect(timespan).toEqual({
        startDate: dayjs('2022-09-30').utc().toDate(),
        finishDate: dayjs('2022-10-06').utc().toDate(),
      });
    });
  });

  describe('getMultipleTimespan', () => {
    it('should return x times in time before start getting the timespans', () => {
      // arrange
      const expression = cronParser.parseExpression('0 0 * * 5');
      const prevSpy = jest.spyOn(expression, 'prev');
      const getTimespanSpy = jest.spyOn(cronService, 'getTimespan');

      // act
      cronService.getMultipleTimespan(expression, 3);

      // assert
      expect(prevSpy).toBeCalledTimes(6);
      expect(getTimespanSpy).toBeCalledTimes(3);
    });

    it('should return multiple timespans for a given cron expression', () => {
      // arrange
      jest.useFakeTimers({ now: new Date('2022-09-29 10:00:00z') });
      const expression = cronParser.parseExpression('0 0 * * 5');

      // act
      const timespans = cronService.getMultipleTimespan(expression, 3);

      // assert
      expect(timespans).toEqual(
        expect.arrayContaining([
          {
            startDate: dayjs('2022-09-09').utc().toDate(),
            finishDate: dayjs('2022-09-15').utc().toDate(),
          },
          {
            startDate: dayjs('2022-09-16').utc().toDate(),
            finishDate: dayjs('2022-09-22').utc().toDate(),
          },
          {
            startDate: dayjs('2022-09-23').utc().toDate(),
            finishDate: dayjs('2022-09-29').utc().toDate(),
          },
        ]),
      );
    });
  });

  describe('getCurrentExecutionDateFromTimestamp', () => {
    it('should return the next execution date from a given cron starting at a given date', () => {
      // arrange
      const cron = '0 0 * * 5';
      const date = new Date('2022-09-21');
      const parsedDate = cronParser.parseExpression(cron, {
        utc: true,
        currentDate: date,
      });
      const parseSpy = jest
        .spyOn(cronService, 'parse')
        .mockReturnValueOnce(parsedDate);

      // act
      const currentExecution = cronService.getCurrentExecutionDateFromTimestamp(
        cron,
        date,
      );

      // assert
      expect(parseSpy).toBeCalledTimes(1);
      expect(parseSpy).toBeCalledWith(cron, { utc: true, currentDate: date });
      expect(currentExecution).toEqual(new Date('2022-09-16'));
    });
  });

  describe('addDaysToCron', () => {
    it('should add days to a cron expression', () => {
      // Arrange
      const expressions = [
        '0 0 * * 1',
        '0 0 * * 2',
        '0 0 * * 3',
        '0 0 * * 4',
        '0 0 * * 5',
        '0 0 * * 6',
      ];

      const expectations = [
        '0 0 * * 3',
        '0 0 * * 4',
        '0 0 * * 5',
        '0 0 * * 6',
        '0 0 * * 1',
        '0 0 * * 2',
      ];

      // Act
      const newExpressions = expressions.map((expression) =>
        cronService.addDaysToCron(expression, 2),
      );

      // Assert
      newExpressions.forEach((newExpressions, index) => {
        expect(newExpressions).toBe(expectations[index]);
      });
    });

    it('should return * if the day in the cron expression is represented by *', () => {
      // Act
      const newExpressions = cronService.addDaysToCron('* * * * *', 2);

      // Assert
      expect(newExpressions).toBe('* * * * *');
    });
  });
});
