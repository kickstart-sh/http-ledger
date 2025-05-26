import { Request } from 'express';

/**
 * The function `calculateTimeTaken` calculates the time taken in milliseconds based on the provided
 * start time.
 * @param startTime - The `startTime` parameter is a tuple containing two numbers representing the
 * start time in seconds and nanoseconds.
 * @returns The function `calculateTimeTaken` returns the time taken in milliseconds as a number with 2
 * decimal places.
 */
export const calculateTimeTaken = (startTime: [number, number]): number => {
  const [seconds, nanoseconds] = process.hrtime(startTime);
  return Number((seconds * 1000 + nanoseconds / 1e6).toFixed(2));
};

/**
 * The function calculates the byte length of the body of a request after converting it to a string.
 * @param {Request} req - The `calculateRequestSize` function takes a `Request` object as a parameter.
 * This `Request` object likely represents an HTTP request, and it contains information such as the
 * request body, headers, method, URL, etc.
 * @returns The function `calculateRequestSize` returns the byte length of the request body after
 * converting it to a string using `JSON.stringify`.
 */
export const calculateRequestSize = (req: Request): number => {
  const bodyString = JSON.stringify(req.body || {});
  return Buffer.byteLength(bodyString);
};

/**
 * The function `calculateResponseSize` calculates the size of a response body in bytes, handling
 * different data types such as strings and JSON objects.
 * @param {unknown} responseBody - The `responseBody` parameter in the `calculateResponseSize` function
 * is the data that represents the response body of an HTTP response. It can be of type `string`,
 * `Buffer`, or any other JSON-serializable object. The function calculates the size of this response
 * body in bytes based on
 * @returns The function `calculateResponseSize` returns the size of the response body in bytes. If the
 * response body is a string or a Buffer, it calculates the byte length of the response body directly.
 * If the response body is an object, it tries to stringify the object to JSON and then calculates the
 * byte length of the JSON string. If there are any errors during the JSON stringification process, it
 * returns 0. If the response body is falsy (null or undefined), it also returns 0.
 */
export const calculateResponseSize = (responseBody: unknown): number => {
  if (typeof responseBody === 'string' || Buffer.isBuffer(responseBody)) {
    return Buffer.byteLength(responseBody);
  } else if (responseBody) {
    try {
      return Buffer.byteLength(JSON.stringify(responseBody));
    } catch {
      return 0;
    }
  }
  return 0;
};
