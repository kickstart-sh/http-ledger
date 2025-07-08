import {
  generateRequestId,
  addRequestIdToResponse,
  shouldLogBasedOnSampling,
  getDefaultLogLevel,
  getConsoleMethod,
} from '../../utils/advancedFeatures';
import { Request, Response } from 'express';
import { LogData, LogLevel } from '../../types';

describe('Advanced Features Utilities', () => {
  describe('generateRequestId', () => {
    it('should generate a valid UUID v4 format', () => {
      const requestId = generateRequestId();
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('addRequestIdToResponse', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockReq = {
        headers: {},
      };
      mockRes = {
        setHeader: jest.fn(),
      };
    });

    it('should return existing request ID if present', () => {
      mockReq.headers = { 'x-request-id': 'existing-id' };
      const result = addRequestIdToResponse(
        mockReq as Request,
        mockRes as Response,
        true,
      );

      expect(result).toBe('existing-id');
      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });

    it('should generate and set request ID when auto-generate is enabled', () => {
      const result = addRequestIdToResponse(
        mockReq as Request,
        mockRes as Response,
        true,
      );

      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', result);
    });

    it('should not generate request ID when auto-generate is disabled', () => {
      const result = addRequestIdToResponse(
        mockReq as Request,
        mockRes as Response,
        false,
      );

      expect(result).toBeUndefined();
      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });

    it('should handle missing x-request-id header', () => {
      mockReq.headers = {};
      const result = addRequestIdToResponse(
        mockReq as Request,
        mockRes as Response,
        true,
      );

      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', result);
    });
  });

  describe('shouldLogBasedOnSampling', () => {
    it('should return true when sampling is undefined', () => {
      expect(shouldLogBasedOnSampling(undefined)).toBe(true);
    });

    it('should return true when sampling is 1', () => {
      expect(shouldLogBasedOnSampling(1)).toBe(true);
    });

    it('should return false when sampling is 0', () => {
      expect(shouldLogBasedOnSampling(0)).toBe(false);
    });

    it('should return false when sampling is negative', () => {
      expect(shouldLogBasedOnSampling(-0.1)).toBe(false);
    });

    it('should return true when random is below sampling rate', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.05);

      expect(shouldLogBasedOnSampling(0.1)).toBe(true);

      Math.random = originalRandom;
    });

    it('should return false when random is above sampling rate', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.9);

      expect(shouldLogBasedOnSampling(0.1)).toBe(false);

      Math.random = originalRandom;
    });

    it('should handle edge case when random equals sampling rate', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      expect(shouldLogBasedOnSampling(0.5)).toBe(false); // Math.random() < 0.5 is false

      Math.random = originalRandom;
    });
  });

  describe('getDefaultLogLevel', () => {
    it('should return error when error is present', () => {
      const logData: LogData = {
        method: 'GET',
        url: '/test',
        statusCode: 200,
        timeTaken: 100,
        requestSize: 0,
        responseSize: 0,
        timestamp: { request: '2024-01-01T00:00:00.000Z' },
        headers: {},
        queryParams: {},
        hostname: 'test',
        error: { message: 'Test error' },
      };

      expect(getDefaultLogLevel(logData)).toBe('error');
    });

    it('should return warn when status code is 400', () => {
      const logData: LogData = {
        method: 'GET',
        url: '/test',
        statusCode: 400,
        timeTaken: 100,
        requestSize: 0,
        responseSize: 0,
        timestamp: { request: '2024-01-01T00:00:00.000Z' },
        headers: {},
        queryParams: {},
        hostname: 'test',
      };

      expect(getDefaultLogLevel(logData)).toBe('warn');
    });

    it('should return warn when status code is 500', () => {
      const logData: LogData = {
        method: 'GET',
        url: '/test',
        statusCode: 500,
        timeTaken: 100,
        requestSize: 0,
        responseSize: 0,
        timestamp: { request: '2024-01-01T00:00:00.000Z' },
        headers: {},
        queryParams: {},
        hostname: 'test',
      };

      expect(getDefaultLogLevel(logData)).toBe('warn');
    });

    it('should return info when status code is 200', () => {
      const logData: LogData = {
        method: 'GET',
        url: '/test',
        statusCode: 200,
        timeTaken: 100,
        requestSize: 0,
        responseSize: 0,
        timestamp: { request: '2024-01-01T00:00:00.000Z' },
        headers: {},
        queryParams: {},
        hostname: 'test',
      };

      expect(getDefaultLogLevel(logData)).toBe('info');
    });

    it('should return info when status code is 300', () => {
      const logData: LogData = {
        method: 'GET',
        url: '/test',
        statusCode: 300,
        timeTaken: 100,
        requestSize: 0,
        responseSize: 0,
        timestamp: { request: '2024-01-01T00:00:00.000Z' },
        headers: {},
        queryParams: {},
        hostname: 'test',
      };

      expect(getDefaultLogLevel(logData)).toBe('info');
    });
  });

  describe('getConsoleMethod', () => {
    it('should return error for error log level', () => {
      expect(getConsoleMethod('error')).toBe('error');
    });

    it('should return warn for warn log level', () => {
      expect(getConsoleMethod('warn')).toBe('warn');
    });

    it('should return log for info log level', () => {
      expect(getConsoleMethod('info')).toBe('log');
    });

    it('should return log for unknown log level', () => {
      expect(getConsoleMethod('unknown' as LogLevel)).toBe('log');
    });
  });
});
