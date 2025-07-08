import { Request } from 'express';

/**
 * Calculates the time taken in milliseconds based on the provided start time.
 * @param startTime - A tuple containing seconds and nanoseconds representing the start time.
 * @returns The time taken in milliseconds as a number with 2 decimal places.
 */
export const calculateTimeTaken = (startTime: [number, number]): number => {
  try {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const timeInMs = seconds * 1000 + nanoseconds / 1e6;
    return Number(timeInMs.toFixed(2));
  } catch (error) {
    // Fallback to Date.now() if hrtime fails
    console.warn(
      'Failed to calculate time using hrtime, falling back to Date.now()',
    );
    return 0;
  }
};

/**
 * Safely stringifies an object for size calculation
 */
const safeStringify = (obj: unknown): string => {
  try {
    if (obj === null || obj === undefined) {
      return '';
    }

    if (typeof obj === 'string') {
      return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }

    if (Buffer.isBuffer(obj)) {
      return obj.toString();
    }

    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
};

/**
 * Calculates the byte length of the request body.
 * @param req - The Express Request object.
 * @returns The size of the request body in bytes.
 */
export const calculateRequestSize = (req: Request): number => {
  try {
    if (!req.body) {
      return 0;
    }

    const bodyString = safeStringify(req.body);
    return Buffer.byteLength(bodyString, 'utf8');
  } catch (error) {
    console.warn('Failed to calculate request size:', error);
    return 0;
  }
};

/**
 * Calculates the size of a response body in bytes, handling different data types.
 * @param responseBody - The response body data.
 * @returns The size of the response body in bytes.
 */
export const calculateResponseSize = (responseBody: unknown): number => {
  try {
    if (responseBody === null || responseBody === undefined) {
      return 0;
    }

    if (typeof responseBody === 'string') {
      return Buffer.byteLength(responseBody, 'utf8');
    }

    if (Buffer.isBuffer(responseBody)) {
      return responseBody.length;
    }

    if (typeof responseBody === 'number' || typeof responseBody === 'boolean') {
      return Buffer.byteLength(String(responseBody), 'utf8');
    }

    // For objects, try to stringify them
    const responseString = safeStringify(responseBody);
    return Buffer.byteLength(responseString, 'utf8');
  } catch (error) {
    console.warn('Failed to calculate response size:', error);
    return 0;
  }
};
