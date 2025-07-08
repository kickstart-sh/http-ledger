import { Request, Response, NextFunction } from 'express';
import { ApiLoggerOptions, Timestamp, LogLevel } from './types';
import { formatLogData } from './utils/logFormatter';
import {
  calculateTimeTaken,
  calculateRequestSize,
  calculateResponseSize,
} from './utils/metricsCalculator';
import {
  addRequestIdToResponse,
  shouldLogBasedOnSampling,
  getDefaultLogLevel,
  getConsoleMethod,
} from './utils/advancedFeatures';

/**
 * Default options for the logger middleware
 */
const DEFAULT_OPTIONS = {
  logBody: true,
  logResponse: true,
  logQueryParams: true,
  excludedHeaders: [],
};

/**
 * logger is an Express middleware for comprehensive API request and response logging.
 * It captures details like method, URL, status code, time taken, request/response sizes,
 * headers, query parameters, bodies, and IP information.
 *
 * @param options - Configuration options for the logger.
 * - `logBody`: (boolean) Whether to include the request body in the log. Defaults to `true`.
 * - `logResponse`: (boolean) Whether to include the response body in the log. Defaults to `true`.
 * - `logQueryParams`: (boolean) Whether to include query parameters in the log. Defaults to `true`.
 * - `excludedHeaders`: (string[]) A list of header names (case-insensitive) to exclude from logs. Defaults to `[]`.
 * - `getIpInfo`: (function) An optional async function that takes an IP address string and returns
 * an object containing IP-related information (e.g., geo-location).
 * - `onLog`: (function) An optional callback that receives the log data object for custom processing.
 * - `maskFields`: (string[]) A list of field names to mask in body, headers, and query params.
 * - `customLogLevel`: (function) A custom function to determine log level based on log data.
 * - `customFormatter`: (function) A custom function to format log data before logging.
 * - `autoGenerateRequestId`: (boolean) Whether to auto-generate request ID if not present.
 * - `shouldLog`: (function) A function to decide whether to log a request.
 * - `logSampling`: (number) Sampling rate (0-1, e.g., 0.1 = 10% of requests).
 * @returns An Express middleware function.
 */
const logger = (options: ApiLoggerOptions = {}) => {
  const {
    logBody = DEFAULT_OPTIONS.logBody,
    logResponse = DEFAULT_OPTIONS.logResponse,
    logQueryParams = DEFAULT_OPTIONS.logQueryParams,
    excludedHeaders = DEFAULT_OPTIONS.excludedHeaders,
    getIpInfo,
    onLog,
    maskFields = [],
    customLogLevel,
    customFormatter,
    autoGenerateRequestId = false,
    shouldLog,
    logSampling,
  } = options;

  // Normalize excluded headers to lowercase for case-insensitive comparison
  const normalizedExcludedHeaders = excludedHeaders.map((header) =>
    header.toLowerCase(),
  );

  return (req: Request, res: Response, next: NextFunction) => {
    // Early exit if shouldLog function returns false
    if (shouldLog) {
      try {
        if (!shouldLog(req, res)) {
          return next();
        }
      } catch (err) {
        // If shouldLog throws, log the error but continue with logging
        console.warn('shouldLog function threw:', err);
      }
    }

    // Early exit if sampling excludes this request
    if (!shouldLogBasedOnSampling(logSampling)) {
      return next();
    }

    const startTime = process.hrtime();
    const timestamp: Timestamp = { request: new Date().toISOString() };
    let responseBody: unknown = null;
    let error: unknown = null;
    let logged = false;

    // Add request ID to response headers if auto-generate is enabled
    const requestId = addRequestIdToResponse(req, res, autoGenerateRequestId);

    // Store original methods to restore them if needed
    const originalSend = res.send;
    const originalEnd = res.end;

    // Override res.send to capture response body
    res.send = function (body: any) {
      try {
        responseBody = body;
        timestamp.response = new Date().toISOString();
        return originalSend.apply(res, arguments as any);
      } catch (err) {
        // If send fails, still try to log the error
        error = err;
        return originalSend.apply(res, arguments as any);
      }
    };

    // Override res.end to ensure timestamp is set
    res.end = function () {
      try {
        if (!timestamp.response) {
          timestamp.response = new Date().toISOString();
        }
        return originalEnd.apply(res, arguments as any);
      } catch (err) {
        error = err;
        return originalEnd.apply(res, arguments as any);
      }
    };

    /**
     * Wrapped next function to capture errors
     */
    const wrappedNext: NextFunction = (err?: any) => {
      if (err) {
        error = err;
      }
      next(err);
    };

    /**
     * Async function to log request and response data
     */
    const log = async (): Promise<void> => {
      if (logged) {
        return;
      }
      logged = true;

      try {
        const timeTaken = calculateTimeTaken(startTime);
        const requestSize = calculateRequestSize(req);
        const responseSize = calculateResponseSize(responseBody);

        // Get IP info if function is provided
        let ipInfo: Record<string, any> = {};
        if (getIpInfo && typeof getIpInfo === 'function') {
          try {
            const ip = req.ip || req.connection.remoteAddress || '';
            ipInfo = await getIpInfo(ip);
          } catch (ipError) {
            // Log IP info error but don't fail the entire logging
            console.warn('Failed to get IP info:', ipError);
          }
        }

        const logData = formatLogData({
          req,
          res,
          responseBody,
          timeTaken,
          excludedHeaders: normalizedExcludedHeaders,
          ipInfo,
          logBody,
          logResponse,
          timestamp,
          requestSize,
          responseSize,
          logQueryParams,
          error,
          maskFields,
          customFormatter,
          customLogLevel,
        });

        // Add request ID if auto-generated
        if (requestId) {
          logData.requestId = requestId;
        }

        // Determine log level
        const logLevel = logData.logLevel || getDefaultLogLevel(logData);

        // Call onLog callback if provided
        if (onLog) {
          try {
            await onLog(logData);
          } catch (cbErr) {
            console.warn('onLog callback threw:', cbErr);
          }
        }

        // Choose appropriate logging method based on log level
        const logFn = console[getConsoleMethod(logLevel)];
        logFn(JSON.stringify(logData, null, 2));
      } catch (logError) {
        // Fallback logging if the main logging fails
        console.error('Logger middleware error:', {
          error: logError,
          originalError: error,
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          timestamp: timestamp.request,
        });
      }
    };

    // Attach event listeners for response completion
    res.on('finish', log);
    res.on('close', log);
    res.on('error', (err) => {
      error = err;
      log();
    });

    // Call next to continue the middleware chain
    wrappedNext();
  };
};

export default logger;
