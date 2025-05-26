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
      timestamp: new Date().toISOString(),
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
    expect(logData.error).toBe(error);
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

  it('should handle undefined response body when logResponse is true', () => {
    const params = { ...defaultParams, responseBody: undefined };
    const logData = formatLogData(params);
    expect(logData).not.toHaveProperty('responseBody');
  });
});
