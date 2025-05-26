import { Request, Response, NextFunction } from 'express';
import { ApiLoggerOptions, Timestamp } from './types';
import { formatLogData } from './utils/logFormatter';
import {
  calculateTimeTaken,
  calculateRequestSize,
  calculateResponseSize,
} from './utils/metricsCalculator';

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
 * @returns An Express middleware function.
 */
const logger = (options: ApiLoggerOptions = {}) => {
  const {
    logBody = true,
    logResponse = true,
    logQueryParams = true,
    excludedHeaders = [],
    getIpInfo,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();
    const timestamp: Timestamp = { request: new Date().toISOString() };
    let responseBody: unknown = null;
    let error: unknown = null;
    let logged = false;

    const originalSend = res.send;
    res.send = function (body: any) {
      responseBody = body;
      timestamp.response = new Date().toISOString();
      return originalSend.apply(res, arguments as any);
    };

    const originalEnd = res.end;
    res.end = function () {
      if (!timestamp.response) {
        timestamp.response = new Date().toISOString();
      }
      return originalEnd.apply(res, arguments as any);
    };

    /**
     * The function `wrappedNext` in TypeScript handles errors by assigning them to a variable and then
     * passing them to the `next` function.
     * @param {any} [err] - The `err` parameter in the `wrappedNext` function is used to handle any
     * errors that may occur during the execution of the function. If an error is passed to the
     * function, it will be stored in the `error` variable and then passed to the `next` function.
     */
    const wrappedNext: NextFunction = (err?: any) => {
      if (err) {
        error = err;
      }
      next(err);
    };

    /**
     * The `log` function asynchronously logs request and response data, including timing, sizes, IP
     * information, and error handling.
     * @returns The `log` function is returning either a console error message with the log data in a
     * formatted JSON string if there is an error or the response status code is greater than or equal
     * to 400, or a console log message with the log data in a formatted JSON string otherwise.
     */
    const log = async () => {
      if (logged) {
        return;
      }
      logged = true;

      const timeTaken = calculateTimeTaken(startTime);
      const requestSize = calculateRequestSize(req);
      const responseSize = calculateResponseSize(responseBody);

      const ipInfo = getIpInfo ? await getIpInfo(req.ip || '') : {};

      const logData = formatLogData({
        req,
        res,
        responseBody,
        timeTaken,
        excludedHeaders,
        ipInfo,
        logBody,
        logResponse,
        timestamp,
        requestSize,
        responseSize,
        logQueryParams,
        error,
      });

      if (error || res.statusCode >= 400) {
        console.error(JSON.stringify(logData, null, 2));
      } else {
        console.log(JSON.stringify(logData, null, 2));
      }
    };

    res.on('finish', log);
    res.on('close', log);

    wrappedNext();
  };
};

export default logger;
