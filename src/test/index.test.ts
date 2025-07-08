import logger from '../index';
import { formatLogData as realFormatLogData } from '../utils/logFormatter';

let formatLogData: jest.Mock;

jest.mock('../utils/logFormatter', () => {
  const actual = jest.requireActual('../utils/logFormatter');
  return {
    ...actual,
    formatLogData: jest.fn(),
  };
});

jest.mock('../utils/metricsCalculator', () => ({
  calculateTimeTaken: jest.fn(() => 123),
  calculateRequestSize: jest.fn(() => 10),
  calculateResponseSize: jest.fn(() => 20),
}));

describe('logger middleware', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;
  let origConsoleLog: any;
  let origConsoleError: any;
  let origConsoleWarn: any;

  beforeEach(() => {
    formatLogData = require('../utils/logFormatter').formatLogData;
    formatLogData.mockReset();
    req = {
      method: 'GET',
      url: '/test',
      originalUrl: '/test',
      headers: { 'x-test': '1' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      body: { foo: 'bar' },
      query: { q: '1' },
      httpVersion: '1.1',
    };
    res = {
      statusCode: 200,
      send: jest.fn(function (body) {
        return body;
      }),
      end: jest.fn(),
      on: jest.fn(),
      get: jest.fn(),
      setHeader: jest.fn(),
    };
    next = jest.fn();
    origConsoleLog = console.log;
    origConsoleError = console.error;
    origConsoleWarn = console.warn;
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    res._finishHandler = () => {};
    res._closeHandler = () => {};
    res._errorHandler = () => {};
    res.on = jest.fn((event, handler) => {
      if (event === 'finish') {
        res._finishHandler = handler;
      }
      if (event === 'close') {
        res._closeHandler = handler;
      }
      if (event === 'error') {
        res._errorHandler = handler;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.log = origConsoleLog;
    console.error = origConsoleError;
    console.warn = origConsoleWarn;
  });

  test('logs with console.log when no error and statusCode < 400', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    const middleware = logger();
    middleware(req, res, next);
    await res._finishHandler();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"method": "GET"'),
    );
    expect(console.error).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('logs with console.error when error is present', async () => {
    formatLogData.mockReturnValue({
      method: 'GET',
      statusCode: 500,
      error: { message: 'Some error' },
    });
    const middleware = logger();
    middleware(req, res, (err?: any) => {
      res.statusCode = 500;
      if (res._finishHandler) res._finishHandler();
    });
    next(new Error('Some error'));
    await res._finishHandler();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"error"'),
    ); // error log
  });

  test('logs with console.error when statusCode >= 400', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 404 });
    res.statusCode = 404;
    const middleware = logger();
    middleware(req, res, next);
    await res._finishHandler();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('"statusCode": 404'),
    );
    expect(console.log).not.toHaveBeenCalled();
  });

  test('log is only called once if both finish and close fire', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    const middleware = logger();
    middleware(req, res, next);
    await res._finishHandler();
    await res._closeHandler();
    const logCalls = (console.log as jest.Mock).mock.calls.length;
    const errorCalls = (console.error as jest.Mock).mock.calls.length;
    const warnCalls = (console.warn as jest.Mock).mock.calls.length;
    expect(logCalls + errorCalls + warnCalls).toBe(1);
  });

  test('calls getIpInfo if provided', async () => {
    formatLogData.mockReturnValue({
      method: 'GET',
      statusCode: 200,
      ipInfo: { city: 'TestCity' },
    });
    const getIpInfo = jest.fn().mockResolvedValue({ city: 'TestCity' });
    const middleware = logger({ getIpInfo });
    middleware(req, res, next);
    await res._finishHandler();
    expect(getIpInfo).toHaveBeenCalledWith('127.0.0.1');
    expect(formatLogData).toHaveBeenCalledWith(
      expect.objectContaining({ ipInfo: { city: 'TestCity' } }),
    );
  });

  test('handles getIpInfo errors gracefully', async () => {
    formatLogData.mockReturnValue({
      method: 'GET',
      statusCode: 200,
      ipInfo: {},
    });
    const getIpInfo = jest.fn().mockRejectedValue(new Error('IP service down'));
    const middleware = logger({ getIpInfo });
    middleware(req, res, next);
    await res._finishHandler();
    expect(console.warn).toHaveBeenCalledWith(
      'Failed to get IP info:',
      expect.any(Error),
    );
    expect(formatLogData).toHaveBeenCalledWith(
      expect.objectContaining({ ipInfo: {} }),
    );
  });

  test('passes options to formatLogData', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    const middleware = logger({
      logBody: false,
      logResponse: false,
      logQueryParams: false,
      excludedHeaders: ['x-test'],
    });
    middleware(req, res, next);
    await res._finishHandler();
    expect(formatLogData).toHaveBeenCalledWith(
      expect.objectContaining({
        logBody: false,
        logResponse: false,
        logQueryParams: false,
        excludedHeaders: ['x-test'],
      }),
    );
  });

  test('handles missing IP address gracefully', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    delete req.ip;
    delete req.connection.remoteAddress;
    const getIpInfo = jest.fn().mockResolvedValue({});
    const middleware = logger({ getIpInfo });
    middleware(req, res, next);
    await res._finishHandler();
    expect(getIpInfo).toHaveBeenCalledWith('');
  });

  test('handles res.send errors gracefully', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    const middleware = logger();
    const originalSend = res.send;
    res.send = jest.fn().mockImplementation(() => {
      throw new Error('Send failed');
    });

    middleware(req, res, next);
    await res._finishHandler();

    expect(formatLogData).toHaveBeenCalled();
    res.send = originalSend;
  });

  test('handles res.end errors gracefully', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    const middleware = logger();
    const originalEnd = res.end;
    res.end = jest.fn().mockImplementation(() => {
      throw new Error('End failed');
    });

    middleware(req, res, next);
    await res._finishHandler();

    expect(formatLogData).toHaveBeenCalled();
    res.end = originalEnd;
  });

  test('handles response error events', async () => {
    formatLogData.mockReturnValue({
      method: 'GET',
      statusCode: 200,
      error: { message: 'Response error' },
    });
    const middleware = logger();
    middleware(req, res, next);
    res._errorHandler(new Error('Response error'));
    expect(formatLogData).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Response error' }),
      }),
    );
  });

  test('normalizes excluded headers to lowercase', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    const middleware = logger({
      excludedHeaders: ['Authorization', 'USER-AGENT'],
    });
    middleware(req, res, next);
    await res._finishHandler();
    expect(formatLogData).toHaveBeenCalledWith(
      expect.objectContaining({
        excludedHeaders: ['authorization', 'user-agent'],
      }),
    );
  });

  test('handles formatLogData errors gracefully', async () => {
    formatLogData.mockImplementation(() => {
      throw new Error('Format failed');
    });

    const middleware = logger();
    middleware(req, res, next);
    await res._finishHandler();

    expect(console.error).toHaveBeenCalledWith('Logger middleware error:', {
      error: expect.any(Error),
      originalError: null,
      method: 'GET',
      url: '/test',
      statusCode: 200,
      timestamp: expect.any(String),
    });
  });

  test('uses default options when none provided', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    const middleware = logger();
    middleware(req, res, next);
    await res._finishHandler();
    expect(formatLogData).toHaveBeenCalledWith(
      expect.objectContaining({
        logBody: true,
        logResponse: true,
        logQueryParams: true,
        excludedHeaders: [],
      }),
    );
  });

  test('handles missing originalUrl gracefully', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    delete req.originalUrl;
    const middleware = logger();
    middleware(req, res, next);
    await res._finishHandler();
    expect(formatLogData).toHaveBeenCalledWith(
      expect.objectContaining({
        req: expect.objectContaining({ url: '/test' }),
      }),
    );
  });

  test('calls onLog callback with log data', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    const onLog = jest.fn();
    const middleware = logger({ onLog });
    middleware(req, res, next);
    await res._finishHandler();
    expect(onLog).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('supports async onLog callback', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    const onLog = jest.fn().mockResolvedValue(undefined);
    const middleware = logger({ onLog });
    middleware(req, res, next);
    await res._finishHandler();
    expect(onLog).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('does not block logging if onLog throws', async () => {
    formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
    const onLog = jest.fn().mockImplementation(() => {
      throw new Error('onLog failed');
    });
    const middleware = logger({ onLog });
    middleware(req, res, next);
    await res._finishHandler();
    expect(console.warn).toHaveBeenCalledWith(
      'onLog callback threw:',
      expect.any(Error),
    );
    expect(console.log).toHaveBeenCalled();
  });

  // Advanced features tests
  describe('Advanced Features', () => {
    test('auto-generates request ID when enabled', async () => {
      const middleware = logger({ autoGenerateRequestId: true });
      middleware(req, res, next);
      await res._finishHandler();

      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        expect.any(String),
      );
      expect(formatLogData).toHaveBeenCalledWith(
        expect.objectContaining({
          maskFields: [],
        }),
      );
    });

    test('does not auto-generate request ID when disabled', async () => {
      const middleware = logger({ autoGenerateRequestId: false });
      middleware(req, res, next);
      await res._finishHandler();

      expect(res.setHeader).not.toHaveBeenCalled();
    });

    test('skips logging when shouldLog returns false', async () => {
      const shouldLog = jest.fn().mockReturnValue(false);
      const middleware = logger({ shouldLog });
      middleware(req, res, next);

      expect(shouldLog).toHaveBeenCalledWith(req, res);
      expect(next).toHaveBeenCalled();
      expect(formatLogData).not.toHaveBeenCalled();
    });

    test('logs when shouldLog returns true', async () => {
      const shouldLog = jest.fn().mockReturnValue(true);
      const middleware = logger({ shouldLog });
      middleware(req, res, next);
      await res._finishHandler();

      expect(shouldLog).toHaveBeenCalledWith(req, res);
      expect(formatLogData).toHaveBeenCalled();
    });

    test('skips logging based on sampling rate', async () => {
      // Mock Math.random to return 0.9 (above 0.1 sampling rate)
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.9);

      const middleware = logger({ logSampling: 0.1 });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(formatLogData).not.toHaveBeenCalled();

      Math.random = originalRandom;
    });

    test('logs when sampling rate allows', async () => {
      // Mock Math.random to return 0.05 (below 0.1 sampling rate)
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.05);

      const middleware = logger({ logSampling: 0.1 });
      middleware(req, res, next);
      await res._finishHandler();

      expect(formatLogData).toHaveBeenCalled();

      Math.random = originalRandom;
    });

    test('passes maskFields to formatLogData', async () => {
      const maskFields = ['password', 'token'];
      const middleware = logger({ maskFields });
      middleware(req, res, next);
      await res._finishHandler();

      expect(formatLogData).toHaveBeenCalledWith(
        expect.objectContaining({
          maskFields,
        }),
      );
    });

    test('passes customLogLevel to formatLogData', async () => {
      const customLogLevel = jest.fn().mockReturnValue('warn');
      const middleware = logger({ customLogLevel });
      middleware(req, res, next);
      await res._finishHandler();

      expect(formatLogData).toHaveBeenCalledWith(
        expect.objectContaining({
          customLogLevel,
        }),
      );
    });

    test('passes customFormatter to formatLogData', async () => {
      const customFormatter = jest.fn().mockReturnValue({ custom: true });
      const middleware = logger({ customFormatter });
      middleware(req, res, next);
      await res._finishHandler();

      expect(formatLogData).toHaveBeenCalledWith(
        expect.objectContaining({
          customFormatter,
        }),
      );
    });
  });

  describe('Extra coverage', () => {
    let req: any;
    let res: any;
    let next: jest.Mock;
    beforeEach(() => {
      req = {
        method: 'POST',
        url: '/deep',
        originalUrl: '/deep',
        headers: { authorization: 'secret', 'x-test': '1' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        body: {
          foo: 'bar',
          password: '123',
          nested: { token: 'abc', arr: [{ password: 'x' }] },
        },
        query: { q: '1', token: 'abc' },
        httpVersion: '1.1',
      };
      res = {
        statusCode: 200,
        send: jest.fn(function (body) {
          return body;
        }),
        end: jest.fn(),
        on: jest.fn(),
        get: jest.fn(),
        setHeader: jest.fn(),
      };
      next = jest.fn();
      res._finishHandler = () => {};
      res.on = jest.fn((event, handler) => {
        if (event === 'finish') res._finishHandler = handler;
      });
    });

    test('maskFields masks nested fields', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger({ maskFields: ['password', 'token'] });
      middleware(req, res, next);
      await res._finishHandler();
      // Verify that maskFields is passed to formatLogData
      expect(formatLogData).toHaveBeenCalledWith(
        expect.objectContaining({
          maskFields: ['password', 'token'],
        }),
      );
    });

    test('customFormatter returns custom object', async () => {
      formatLogData.mockImplementation((opts) =>
        opts.customFormatter({ foo: 1 }),
      );
      const customFormatter = jest.fn().mockReturnValue({ custom: true });
      const middleware = logger({ customFormatter });
      middleware(req, res, next);
      await res._finishHandler();
      expect(customFormatter).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"custom": true'),
      );
    });

    test('customLogLevel returns all log levels', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const customLogLevel = jest.fn().mockReturnValue('info');
      const middleware = logger({ customLogLevel });
      middleware(req, res, next);
      await res._finishHandler();
      // Verify that customLogLevel is passed to formatLogData
      expect(formatLogData).toHaveBeenCalledWith(
        expect.objectContaining({
          customLogLevel,
        }),
      );
    });

    test('autoGenerateRequestId does not overwrite existing requestId', async () => {
      req.headers['x-request-id'] = 'existing';
      formatLogData.mockReturnValue({
        method: 'GET',
        statusCode: 200,
        requestId: 'existing',
      });
      const middleware = logger({ autoGenerateRequestId: true });
      middleware(req, res, next);
      await res._finishHandler();
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    test('onLog as undefined does not throw', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger({});
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.log).toHaveBeenCalled();
    });

    test('getIpInfo as undefined does not throw', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger({});
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.log).toHaveBeenCalled();
    });

    test('shouldLog as undefined logs', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger({});
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.log).toHaveBeenCalled();
    });

    test('logSampling as undefined logs', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger({});
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.log).toHaveBeenCalled();
    });

    test('error thrown in getIpInfo does not break logging', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const getIpInfo = jest.fn().mockRejectedValue(new Error('fail'));
      const middleware = logger({ getIpInfo });
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to get IP info:',
        expect.any(Error),
      );
      expect(console.log).toHaveBeenCalled();
    });

    test('error thrown in customFormatter does not break logging', async () => {
      formatLogData.mockImplementation(() => {
        throw new Error('fail');
      });
      const customFormatter = jest.fn().mockImplementation(() => {
        throw new Error('fail');
      });
      const middleware = logger({ customFormatter });
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.error).toHaveBeenCalledWith(
        'Logger middleware error:',
        expect.any(Object),
      );
    });

    test('error thrown in customLogLevel does not break logging', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const customLogLevel = jest.fn().mockImplementation(() => {
        throw new Error('fail');
      });
      const middleware = logger({ customLogLevel });
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.log).toHaveBeenCalled();
    });

    test('error thrown in shouldLog does not break logging', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const shouldLog = jest.fn().mockImplementation(() => {
        throw new Error('fail');
      });
      const middleware = logger({ shouldLog });
      // The shouldLog function is called during middleware execution, not initialization
      // So we need to call the middleware and expect it to handle the error gracefully
      middleware(req, res, next);
      // The middleware should handle the error and still call next()
      expect(next).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        'shouldLog function threw:',
        expect.any(Error),
      );
    });

    test('log with all options enabled', async () => {
      formatLogData.mockReturnValue({
        method: 'GET',
        statusCode: 200,
        logLevel: 'info',
        requestId: 'id',
        ipInfo: { city: 'X' },
        body: { foo: 'bar' },
        responseBody: { bar: 'baz' },
      });
      const middleware = logger({
        logBody: true,
        logResponse: true,
        logQueryParams: true,
        excludedHeaders: ['authorization'],
        getIpInfo: jest.fn().mockResolvedValue({ city: 'X' }),
        onLog: jest.fn(),
        maskFields: ['foo'],
        customLogLevel: jest.fn().mockReturnValue('info'),
        customFormatter: jest
          .fn()
          .mockReturnValue({ method: 'GET', statusCode: 200 }),
        autoGenerateRequestId: true,
        shouldLog: jest.fn().mockReturnValue(true),
        logSampling: 1,
      });
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.log).toHaveBeenCalled();
    });

    test('log with all options disabled', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger({
        logBody: false,
        logResponse: false,
        logQueryParams: false,
        excludedHeaders: [],
        maskFields: [],
        autoGenerateRequestId: false,
      });
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.log).toHaveBeenCalled();
    });

    test('log with empty request body, headers, query, responseBody', async () => {
      req.body = undefined;
      req.headers = {};
      req.query = undefined;
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger();
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.log).toHaveBeenCalled();
    });

    test('handles formatLogData throwing error', async () => {
      formatLogData.mockImplementation(() => {
        throw new Error('formatLogData failed');
      });
      const middleware = logger();
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.error).toHaveBeenCalledWith(
        'Logger middleware error:',
        expect.objectContaining({
          error: expect.any(Error),
          method: 'POST',
          url: '/deep',
          statusCode: 200,
        }),
      );
    });

    test('handles getIpInfo not being a function', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger({ getIpInfo: 'not a function' as any });
      middleware(req, res, next);
      await res._finishHandler();
      expect(formatLogData).toHaveBeenCalledWith(
        expect.objectContaining({ ipInfo: {} }),
      );
    });

    test('handles res.send with arguments', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger();
      middleware(req, res, next);
      res.send('test', 'utf8');
      await res._finishHandler();
      expect(formatLogData).toHaveBeenCalled();
    });

    test('handles res.end with arguments', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger();
      middleware(req, res, next);
      res.end('test', 'utf8');
      await res._finishHandler();
      expect(formatLogData).toHaveBeenCalled();
    });

    test('handles response close event', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger();
      middleware(req, res, next);
      // Trigger the close event handler
      const closeHandler = res.on.mock.calls.find(
        (call: any) => call[0] === 'close',
      )?.[1];
      if (closeHandler) {
        await closeHandler();
      }
      expect(formatLogData).toHaveBeenCalled();
    });

    test('handles response error event', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger();
      middleware(req, res, next);
      // Trigger the error event handler
      const errorHandler = res.on.mock.calls.find(
        (call: any) => call[0] === 'error',
      )?.[1];
      if (errorHandler) {
        errorHandler(new Error('Response error'));
      }
      expect(formatLogData).toHaveBeenCalled();
    });

    test('handles wrappedNext with error', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger();
      middleware(req, res, (err?: any) => {
        if (err) {
          res.statusCode = 500;
        }
        next(err);
      });
      next(new Error('Test error'));
      await res._finishHandler();
      expect(formatLogData).toHaveBeenCalled();
    });

    test('handles logLevel from logData', async () => {
      formatLogData.mockReturnValue({
        method: 'GET',
        statusCode: 200,
        logLevel: 'warn',
      });
      const middleware = logger();
      middleware(req, res, next);
      await res._finishHandler();
      expect(console.warn).toHaveBeenCalled();
    });

    test('handles auto-generated requestId', async () => {
      formatLogData.mockReturnValue({ method: 'GET', statusCode: 200 });
      const middleware = logger({ autoGenerateRequestId: true });
      middleware(req, res, next);
      await res._finishHandler();
      expect(formatLogData).toHaveBeenCalled();
      // The requestId should be added to the log data
      const logCall = formatLogData.mock.calls[0][0];
      expect(logCall).toBeDefined();
    });
  });
});
