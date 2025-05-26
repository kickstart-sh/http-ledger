import { Request } from 'express';
import {
  calculateTimeTaken,
  calculateRequestSize,
  calculateResponseSize,
} from '../../utils/metricsCalculator';

const originalHrtime = process.hrtime;

let mockedHrtime: jest.Mock<[number, number], [[number, number]?]>;

describe('calculateTimeTaken', () => {
  beforeAll(() => {
    mockedHrtime = jest.fn((startTime?: [number, number]) => {
      if (startTime) {
        return [1, 500000000];
      }
      return [0, 0];
    });
    process.hrtime = mockedHrtime as unknown as typeof process.hrtime;
  });

  afterAll(() => {
    process.hrtime = originalHrtime;
  });

  it('should calculate time taken in milliseconds with 2 decimal places', () => {
    const startTime: [number, number] = [1000, 500000000];
    const timeTaken = calculateTimeTaken(startTime);
    expect(timeTaken).toBe(1500.0);
  });

  it('should handle zero time taken', () => {
    mockedHrtime.mockReturnValueOnce([0, 0]);
    const startTime: [number, number] = [0, 0];
    const timeTaken = calculateTimeTaken(startTime);
    expect(timeTaken).toBe(0.0);
  });

  it('should handle nanosecond precision', () => {
    mockedHrtime.mockReturnValueOnce([0, 123456789]);
    const startTime: [number, number] = [0, 0];
    const timeTaken = calculateTimeTaken(startTime);
    expect(timeTaken).toBe(123.46);
  });
});

describe('calculateRequestSize', () => {
  it('should calculate the size of a request body for a simple object', () => {
    const mockReq: Request = { body: { name: 'test', age: 30 } } as Request;
    expect(calculateRequestSize(mockReq)).toBe(24);
  });

  it('should calculate the size for an empty object body', () => {
    const mockReq: Request = { body: {} } as Request;
    expect(calculateRequestSize(mockReq)).toBe(2);
  });

  it('should calculate the size for a string body', () => {
    const mockReq: Request = { body: 'hello world' } as Request;
    expect(calculateRequestSize(mockReq)).toBe(13);
  });

  it('should handle complex JSON body', () => {
    const mockReq: Request = {
      body: {
        data: [1, 2, { id: 3, value: 'test' }],
        status: 'success',
      },
    } as Request;
    expect(calculateRequestSize(mockReq)).toBe(57);
  });

  it('should return 2 bytes for a null or undefined body', () => {
    const mockReqNull: Request = { body: null } as Request;
    expect(calculateRequestSize(mockReqNull)).toBe(2);
    const mockReqUndefined: Request = {} as Request;
    expect(calculateRequestSize(mockReqUndefined)).toBe(2);
  });
});

describe('calculateResponseSize', () => {
  it('should calculate the size of a string response body', () => {
    const responseBody = 'This is a test response.';
    expect(calculateResponseSize(responseBody)).toBe(24);
  });

  it('should calculate the size of a Buffer response body', () => {
    const responseBody = Buffer.from('Binary data');
    expect(calculateResponseSize(responseBody)).toBe(11);
  });

  it('should calculate the size of an object response body', () => {
    const responseBody = { message: 'success', data: [1, 2, 3] };
    expect(calculateResponseSize(responseBody)).toBe(36);
  });

  it('should return 0 for a null response body', () => {
    expect(calculateResponseSize(null)).toBe(0);
  });

  it('should return 0 for an undefined response body', () => {
    expect(calculateResponseSize(undefined)).toBe(0);
  });

  it('should return 0 for an empty string response body', () => {
    expect(calculateResponseSize('')).toBe(0);
  });

  it('should return 2 for an empty object response body', () => {
    expect(calculateResponseSize({})).toBe(2);
  });

  it('should return 0 for a response body that cannot be stringified to JSON', () => {
    const circularRef: any = {};
    circularRef.a = circularRef;
    expect(calculateResponseSize(circularRef)).toBe(0);
  });

  it('should calculate size for a response body with unicode characters', () => {
    const responseBody = { emoji: '😊' };
    expect(calculateResponseSize(responseBody)).toBe(16);
  });
});
