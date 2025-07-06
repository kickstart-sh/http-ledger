import { Request } from 'express';
import {
  calculateTimeTaken,
  calculateRequestSize,
  calculateResponseSize,
} from '../../utils/metricsCalculator';

const originalHrtime = process.hrtime;

let mockedHrtime: jest.Mock;

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

  it('should handle hrtime errors gracefully', () => {
    const originalConsoleWarn = console.warn;
    console.warn = jest.fn();

    mockedHrtime.mockImplementationOnce(() => {
      throw new Error('hrtime failed');
    });

    const startTime: [number, number] = [0, 0];
    const timeTaken = calculateTimeTaken(startTime);

    expect(timeTaken).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(
      'Failed to calculate time using hrtime, falling back to Date.now()',
    );

    console.warn = originalConsoleWarn;
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
    expect(calculateRequestSize(mockReq)).toBe(11);
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

  it('should return 0 for a null body', () => {
    const mockReqNull: Request = { body: null } as Request;
    expect(calculateRequestSize(mockReqNull)).toBe(0);
  });

  it('should return 0 for an undefined body', () => {
    const mockReqUndefined: Request = {} as Request;
    expect(calculateRequestSize(mockReqUndefined)).toBe(0);
  });

  it('should handle circular references gracefully', () => {
    const originalConsoleWarn = console.warn;
    console.warn = jest.fn();

    const circularObj: any = { name: 'test' };
    circularObj.self = circularObj;

    const mockReq: Request = { body: circularObj } as Request;
    const size = calculateRequestSize(mockReq);

    // Should handle circular references without crashing
    expect(typeof size).toBe('number');
    expect(size).toBeGreaterThanOrEqual(0);

    console.warn = originalConsoleWarn;
  });

  it('should handle Buffer body', () => {
    const mockReq: Request = { body: Buffer.from('test data') } as Request;
    expect(calculateRequestSize(mockReq)).toBe(9);
  });

  it('should handle number body', () => {
    const mockReq: Request = { body: 42 } as Request;
    expect(calculateRequestSize(mockReq)).toBe(2);
  });

  it('should handle boolean body', () => {
    const mockReq: Request = { body: true } as Request;
    expect(calculateRequestSize(mockReq)).toBe(4);
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

  it('should handle circular references gracefully', () => {
    const originalConsoleWarn = console.warn;
    console.warn = jest.fn();

    const circularRef: any = {};
    circularRef.a = circularRef;
    const size = calculateResponseSize(circularRef);

    // Should handle circular references without crashing
    expect(typeof size).toBe('number');
    expect(size).toBeGreaterThanOrEqual(0);

    console.warn = originalConsoleWarn;
  });

  it('should calculate size for a response body with unicode characters', () => {
    const responseBody = { emoji: '😊' };
    expect(calculateResponseSize(responseBody)).toBe(16);
  });

  it('should handle number response body', () => {
    expect(calculateResponseSize(42)).toBe(2);
  });

  it('should handle boolean response body', () => {
    expect(calculateResponseSize(true)).toBe(4);
    expect(calculateResponseSize(false)).toBe(5);
  });

  it('should handle large objects', () => {
    const largeObj = {
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: `item-${i}`,
      })),
      metadata: {
        total: 1000,
        timestamp: new Date().toISOString(),
      },
    };
    const size = calculateResponseSize(largeObj);
    expect(size).toBeGreaterThan(1000);
  });

  it('should handle nested objects with special characters', () => {
    const responseBody = {
      message: 'Hello, "world"!',
      data: {
        nested: {
          special: '🎉🎊🎈',
          numbers: [1, 2, 3],
        },
      },
    };
    const size = calculateResponseSize(responseBody);
    expect(size).toBeGreaterThan(0);
  });

  it('should handle JSON.stringify throwing error', () => {
    const circularObj: any = {};
    circularObj.self = circularObj;

    const size = calculateResponseSize(circularObj);
    expect(size).toBeGreaterThan(0);
  });

  it('should handle safeStringify with circular reference', () => {
    const circularObj: any = {};
    circularObj.self = circularObj;

    const size = calculateRequestSize({ body: circularObj } as any);
    expect(size).toBeGreaterThan(0);
  });

  it('should handle safeStringify with null', () => {
    const size = calculateResponseSize(null);
    expect(size).toBe(0);
  });

  it('should handle safeStringify with undefined', () => {
    const size = calculateResponseSize(undefined);
    expect(size).toBe(0);
  });

  it('should handle safeStringify with string', () => {
    const size = calculateResponseSize('test string');
    expect(size).toBeGreaterThan(0);
  });

  it('should handle safeStringify with number', () => {
    const size = calculateResponseSize(123);
    expect(size).toBeGreaterThan(0);
  });

  it('should handle safeStringify with boolean', () => {
    const size = calculateResponseSize(true);
    expect(size).toBeGreaterThan(0);
  });

  it('should handle safeStringify with Buffer', () => {
    const buffer = Buffer.from('test buffer');
    const size = calculateResponseSize(buffer);
    expect(size).toBeGreaterThan(0);
  });

  it('should handle safeStringify with object that throws on JSON.stringify', () => {
    const problematicObj = {
      toJSON: () => {
        throw new Error('JSON.stringify error');
      },
    };

    const size = calculateResponseSize(problematicObj);
    expect(size).toBeGreaterThan(0);
  });

  it('should handle calculateRequestSize with error', () => {
    const originalConsoleWarn = console.warn;
    console.warn = jest.fn();

    // Create an object that throws when accessed
    const req = {
      body: new Proxy(
        {},
        {
          get() {
            throw new Error('Request body error');
          },
        },
      ),
    } as any;

    const size = calculateRequestSize(req);
    expect(size).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(
      'Failed to calculate request size:',
      expect.any(Error),
    );

    console.warn = originalConsoleWarn;
  });

  it('should handle calculateResponseSize with error', () => {
    const originalConsoleWarn = console.warn;
    console.warn = jest.fn();

    // Create an object that throws when accessed
    const responseBody = new Proxy(
      {},
      {
        get() {
          throw new Error('Response body error');
        },
      },
    );

    const size = calculateResponseSize(responseBody);
    expect(size).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(
      'Failed to calculate response size:',
      expect.any(Error),
    );

    console.warn = originalConsoleWarn;
  });
});
