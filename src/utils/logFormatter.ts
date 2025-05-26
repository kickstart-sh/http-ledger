import os from 'os';
import { FormatLogDataParams, LogData } from '../types';

/**
 * The `formatLogData` function in TypeScript formats log data based on specified parameters.
 * @param {FormatLogDataParams} params - The `formatLogData` function takes in a parameter object
 * `params` of type `FormatLogDataParams`, which contains the following properties:
 * @returns The `formatLogData` function returns a `LogData` object containing various log-related
 * information such as method, URL, status code, time taken, request and response sizes, headers, query
 * parameters, user agent, referer, content types, HTTP version, request ID, hostname, request body,
 * response body, IP information, and error details.
 */
export const formatLogData = (params: FormatLogDataParams): LogData => {
  const {
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
  } = params;

  const filteredHeaders: Record<string, string | string[] | undefined> = {};
  for (const key in req.headers) {
    if (
      Object.prototype.hasOwnProperty.call(req.headers, key) &&
      !excludedHeaders.includes(key.toLowerCase())
    ) {
      filteredHeaders[key] = req.headers[key];
    }
  }

  const queryParamsToLog = logQueryParams ? req.query : {};

  const log: LogData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    timeTaken,
    requestSize,
    responseSize,
    timestamp,
    headers: filteredHeaders,
    queryParams: queryParamsToLog,
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'],
    requestContentType: req.headers['content-type'],
    responseContentType: res.get('Content-Type'),
    httpVersion: req.httpVersion,
    requestId: req.headers['x-request-id'],
    hostname: os.hostname(),
  };

  if (logBody && req.body) {
    log.body = req.body;
  }

  if (logResponse && responseBody) {
    log.responseBody = responseBody;
  }

  if (Object.keys(ipInfo).length > 0) {
    log.ipInfo = ipInfo;
  }

  if (error) {
    log.error = error;
  }

  return log;
};
