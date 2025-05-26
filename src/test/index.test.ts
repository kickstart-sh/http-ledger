import logger from '../index';
import { formatLogData } from '../utils/logFormatter';

jest.mock('../utils/logFormatter', () => ({
  formatLogData: jest.fn(() => ({ formatted: true })),
}));
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

  beforeEach(() => {
    req = {
      method: 'GET',
      url: '/test',
      headers: { 'x-test': '1' },
      ip: '127.0.0.1',
      body: { foo: 'bar' },
      query: { q: '1' },
    };
    res = {
      statusCode: 200,
      send: jest.fn(function (body) {
        return body;
      }),
      end: jest.fn(),
      on: jest.fn(),
    };
    next = jest.fn();
    origConsoleLog = console.log;
    origConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();

    res._finishHandler = () => {};
    res._closeHandler = () => {};
    res.on = jest.fn((event, handler) => {
      if (event === 'finish') {
        res._finishHandler = handler;
      }
      if (event === 'close') {
        res._closeHandler = handler;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.log = origConsoleLog;
    console.error = origConsoleError;
  });

  test('logs with console.log when no error and statusCode < 400', async () => {
    const middleware = logger();
    middleware(req, res, next);
    await res._finishHandler();
    expect(console.log).toHaveBeenCalledWith({ formatted: true });
    expect(console.error).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('logs with console.error when error is present', async () => {
    const middleware = logger();
    middleware(req, res, (err?: any) => {
      res.statusCode = 500;
      if (res._finishHandler) res._finishHandler();
    });
    next(new Error('Some error'));
    await res._finishHandler();
    expect(console.error).toHaveBeenCalledWith({ formatted: true });
  });

  test('logs with console.error when statusCode >= 400', async () => {
    res.statusCode = 404;
    const middleware = logger();
    middleware(req, res, next);
    await res._finishHandler();
    expect(console.error).toHaveBeenCalledWith({ formatted: true });
    expect(console.log).not.toHaveBeenCalled();
  });

  test('log is only called once if both finish and close fire', async () => {
    const middleware = logger();
    middleware(req, res, next);
    await res._finishHandler();
    await res._closeHandler();
    const logCalls = (console.log as jest.Mock).mock.calls.length;
    const errorCalls = (console.error as jest.Mock).mock.calls.length;
    expect(logCalls + errorCalls).toBe(1);
  });

  test('calls getIpInfo if provided', async () => {
    const getIpInfo = jest.fn().mockResolvedValue({ city: 'TestCity' });
    const middleware = logger({ getIpInfo });
    middleware(req, res, next);
    await res._finishHandler();
    expect(getIpInfo).toHaveBeenCalledWith('127.0.0.1');
    expect(formatLogData).toHaveBeenCalledWith(
      expect.objectContaining({ ipInfo: { city: 'TestCity' } }),
    );
  });

  test('passes options to formatLogData', async () => {
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
});
