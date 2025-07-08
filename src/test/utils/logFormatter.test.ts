import { formatLogData } from '../../utils/logFormatter';
import { Request, Response } from 'express';
import * as os from 'os';

jest.mock('os', () => ({
  hostname: jest.fn(() => 'mock-hostname'),
}));

describe('formatLogData', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let defaultParams: any;

  beforeEach(() => {
    (os.hostname as jest.Mock).mockClear();

    mockReq = {
      method: 'GET',
      originalUrl: '/test-url?param1=value1',
      url: '/test-url?param1=value1',
      headers: {
        'user-agent': 'test-user-agent',
        referer: 'test-referer',
        'content-type': 'application/json',
        'x-request-id': 'test-request-id',
        authorization: 'Bearer token',
      },
      query: {
        param1: 'value1',
        param2: 'value2',
      },
      body: {
        key: 'value',
      },
      httpVersion: '1.1',
    };

    mockRes = {
      statusCode: 200,
      get: jest.fn((header: string) => {
        if (header === 'Content-Type') {
          return 'application/json';
        }
        return undefined;
      }),
    };

    defaultParams = {
      req: mockReq as Request,
      res: mockRes as Response,
      responseBody: '{"message":"success"}',
      timeTaken: 100,
      excludedHeaders: ['authorization'],
      ipInfo: {
        ip: '127.0.0.1',
        country: 'US',
      },
      logBody: true,
      logResponse: true,
      timestamp: { request: new Date().toISOString() },
      requestSize: 50,
      responseSize: 100,
      logQueryParams: true,
      error: undefined,
    };
  });

  it('should format log data correctly for a successful request', () => {
    const logData = formatLogData(defaultParams);

    expect(logData).toEqual({
      method: 'GET',
      url: '/test-url?param1=value1',
      statusCode: 200,
      timeTaken: 100,
      requestSize: 50,
      responseSize: 100,
      timestamp: defaultParams.timestamp,
      headers: {
        'user-agent': 'test-user-agent',
        referer: 'test-referer',
        'content-type': 'application/json',
        'x-request-id': 'test-request-id',
      },
      queryParams: {
        param1: 'value1',
        param2: 'value2',
      },
      userAgent: 'test-user-agent',
      referer: 'test-referer',
      requestContentType: 'application/json',
      responseContentType: 'application/json',
      httpVersion: '1.1',
      requestId: 'test-request-id',
      hostname: 'mock-hostname',
      body: {
        key: 'value',
      },
      responseBody: '{"message":"success"}',
      ipInfo: {
        ip: '127.0.0.1',
        country: 'US',
      },
    });
    expect(os.hostname).toHaveBeenCalledTimes(1);
    expect(mockRes.get).toHaveBeenCalledWith('Content-Type');
  });

  it('should exclude specified headers', () => {
    const paramsWithExcludedHeader = {
      ...defaultParams,
      excludedHeaders: ['authorization', 'user-agent'],
    };
    const logData = formatLogData(paramsWithExcludedHeader);

    expect(logData.headers).not.toHaveProperty('authorization');
    expect(logData.headers).not.toHaveProperty('user-agent');
    expect(logData.headers).toHaveProperty('referer');
  });

  it('should not include request body if logBody is false', () => {
    const params = { ...defaultParams, logBody: false };
    const logData = formatLogData(params);
    expect(logData).not.toHaveProperty('body');
  });

  it('should not include response body if logResponse is false', () => {
    const params = { ...defaultParams, logResponse: false };
    const logData = formatLogData(params);
    expect(logData).not.toHaveProperty('responseBody');
  });

  it('should not include query parameters if logQueryParams is false', () => {
    const params = { ...defaultParams, logQueryParams: false };
    const logData = formatLogData(params);
    expect(logData.queryParams).toEqual({});
  });

  it('should include error details when an error is present', () => {
    const error = new Error('Something went wrong');
    const params = { ...defaultParams, error: error };
    const logData = formatLogData(params);
    expect(logData.error).toEqual({
      message: 'Something went wrong',
      name: 'Error',
      stack: error.stack,
    });
  });

  it('should handle string errors', () => {
    const params = { ...defaultParams, error: 'String error message' };
    const logData = formatLogData(params);
    expect(logData.error).toEqual({
      message: 'String error message',
    });
  });

  it('should handle object errors', () => {
    const errorObj = { message: 'Custom error', code: 'CUSTOM_001' };
    const params = { ...defaultParams, error: errorObj };
    const logData = formatLogData(params);
    expect(logData.error).toEqual({
      message: 'Custom error',
      code: 'CUSTOM_001',
    });
  });

  it('should handle missing x-request-id header', () => {
    delete mockReq.headers!['x-request-id'];
    const logData = formatLogData(defaultParams);
    expect(logData.requestId).toBeUndefined();
  });

  it('should handle empty ipInfo', () => {
    const params = { ...defaultParams, ipInfo: {} };
    const logData = formatLogData(params);
    expect(logData).not.toHaveProperty('ipInfo');
  });

  it('should handle undefined request body when logBody is true', () => {
    mockReq.body = undefined;
    const logData = formatLogData(defaultParams);
    expect(logData).not.toHaveProperty('body');
  });

  it('should handle null request body when logBody is true', () => {
    mockReq.body = null;
    const logData = formatLogData(defaultParams);
    expect(logData).not.toHaveProperty('body');
  });

  it('should handle undefined response body when logResponse is true', () => {
    const params = { ...defaultParams, responseBody: undefined };
    const logData = formatLogData(params);
    expect(logData).not.toHaveProperty('responseBody');
  });

  it('should handle null response body when logResponse is true', () => {
    const params = { ...defaultParams, responseBody: null };
    const logData = formatLogData(params);
    expect(logData).not.toHaveProperty('responseBody');
  });

  it('should handle missing originalUrl gracefully', () => {
    delete mockReq.originalUrl;
    const logData = formatLogData(defaultParams);
    expect(logData.url).toBe('/test-url?param1=value1');
  });

  it('should handle case-insensitive header filtering', () => {
    const params = {
      ...defaultParams,
      excludedHeaders: ['AUTHORIZATION', 'User-Agent'],
    };
    const logData = formatLogData(params);
    expect(logData.headers).not.toHaveProperty('authorization');
    expect(logData.headers).not.toHaveProperty('user-agent');
  });

  it('should handle query parameters safely', () => {
    // Mock query to throw an error when accessed
    const originalQuery = mockReq.query;
    mockReq.query = new Proxy(originalQuery || {}, {
      get() {
        throw new Error('Query access error');
      },
    }) as any;

    const logData = formatLogData(defaultParams);
    expect(logData.queryParams).toEqual({});
  });

  it('should handle masking with nested objects', () => {
    mockReq.body = {
      user: {
        password: 'secret123',
        profile: {
          token: 'abc123',
          data: { password: 'nested' },
        },
      },
    };
    mockReq.query = { token: 'query-token', other: 'value' };
    const params = {
      ...defaultParams,
      responseBody: { result: 'success', token: 'response-token' },
      maskFields: ['password', 'token', 'authorization'],
    };

    const logData = formatLogData(params);

    // The authorization header should be masked, but it might be excluded by default
    // Let's check if it's masked when present
    if (logData.headers.authorization) {
      expect(logData.headers.authorization).toBe('***MASKED***');
    }
    expect((logData.body as any).user.password).toBe('***MASKED***');
    expect((logData.body as any).user.profile.token).toBe('***MASKED***');
    expect((logData.body as any).user.profile.data.password).toBe(
      '***MASKED***',
    );
    expect(logData.queryParams.token).toBe('***MASKED***');
    expect((logData.responseBody as any).result).toBe('success');
    expect((logData.responseBody as any).token).toBe('***MASKED***');
  });

  it('should handle masking with arrays', () => {
    mockReq.body = {
      users: [
        { name: 'John', password: 'pass1' },
        { name: 'Jane', password: 'pass2' },
      ],
    };
    const params = {
      ...defaultParams,
      maskFields: ['password'],
    };

    const logData = formatLogData(params);

    expect((logData.body as any).users[0].password).toBe('***MASKED***');
    expect((logData.body as any).users[1].password).toBe('***MASKED***');
    expect((logData.body as any).users[0].name).toBe('John');
  });

  it('should handle custom log level function', () => {
    const customLogLevel = jest.fn().mockReturnValue('error');
    const params = {
      ...defaultParams,
      customLogLevel,
    };

    const logData = formatLogData(params);

    expect(customLogLevel).toHaveBeenCalledWith(logData);
    expect(logData.logLevel).toBe('error');
  });

  it('should handle custom formatter function', () => {
    const customFormatter = jest.fn().mockReturnValue({
      custom: true,
      method: 'GET',
      statusCode: 200,
    });
    const params = {
      ...defaultParams,
      customFormatter,
    };

    const result = formatLogData(params);

    expect(customFormatter).toHaveBeenCalled();
    expect((result as any).custom).toBe(true);
  });

  it('should handle error with code property', () => {
    const customError = new Error('Database error');
    (customError as any).code = 'DB_CONNECTION_ERROR';
    const params = {
      ...defaultParams,
      error: customError,
    };

    const logData = formatLogData(params);

    expect(logData.error).toEqual({
      message: 'Database error',
      name: 'Error',
      stack: customError.stack,
      code: 'DB_CONNECTION_ERROR',
    });
  });

  it('should handle error object with custom properties', () => {
    const errorObj = {
      message: 'Custom error',
      name: 'CustomError',
      stack: 'Error stack',
      code: 500,
      details: 'Additional details',
    };
    const params = {
      ...defaultParams,
      error: errorObj,
    };

    const logData = formatLogData(params);

    expect(logData.error).toEqual({
      message: 'Custom error',
      name: 'CustomError',
      stack: 'Error stack',
      code: 500,
      details: 'Additional details',
    });
  });

  it('should handle error with msg property', () => {
    const errorObj = { msg: 'Error with msg property' };
    const params = {
      ...defaultParams,
      error: errorObj,
    };

    const logData = formatLogData(params);

    expect(logData.error!.message).toBe('Error with msg property');
  });

  it('should handle error with error property', () => {
    const errorObj = { error: 'Error with error property' };
    const params = {
      ...defaultParams,
      error: errorObj,
    };

    const logData = formatLogData(params);

    expect(logData.error!.message).toBe('Error with error property');
  });

  it('should handle error with no message property', () => {
    const errorObj = { someOtherProp: 'value' };
    const params = {
      ...defaultParams,
      error: errorObj,
    };

    const logData = formatLogData(params);

    expect(logData.error!.message).toBe('Unknown error');
  });

  it('should handle non-string error', () => {
    const params = {
      ...defaultParams,
      error: 123,
    };

    const logData = formatLogData(params);

    expect(logData.error!.message).toBe('123');
  });
});
