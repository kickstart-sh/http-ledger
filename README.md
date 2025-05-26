# http-ledger

[![npm version](https://img.shields.io/npm/v/http-ledger.svg)](https://www.npmjs.com/package/http-ledger)
[![npm downloads](https://img.shields.io/npm/dm/http-ledger.svg)](https://www.npmjs.com/package/http-ledger)
[![bundlephobia minzip](https://img.shields.io/bundlephobia/minzip/http-ledger)](https://bundlephobia.com/package/http-ledger)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/shrinath-nayak/http-ledger/ci.yml?branch=main)](https://github.com/shrinath-nayak/http-ledger/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/shrinath-nayak/http-ledger/pulls)

An Express middleware for comprehensive API request and response logging with beautified console output.

## Features

- Logs HTTP method, URL, status code, time taken, request/response sizes, headers, query parameters, and more
- Optionally logs request and response bodies
- Excludes sensitive headers from logs
- Supports custom IP info enrichment (e.g., geo-location)
- Pretty-prints logs to the console
- Handles errors and logs them appropriately
- Fully typed with TypeScript
- Easily configurable

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Configuration Options](#configuration-options)
- [What Gets Logged?](#what-gets-logged)
- [Example Log Output](#example-log-output)
- [TypeScript Support](#typescript-support)
- [Development](#development)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Installation

```sh
npm install http-ledger
```

## Usage

```ts
import express from 'express';
import logger from 'http-ledger';

const app = express();

app.use(express.json());

// Basic usage with defaults
app.use(logger());

// With custom options
app.use(
  logger({
    logBody: true,
    logResponse: true,
    logQueryParams: true,
    excludedHeaders: ['authorization', 'cookie'],
    getIpInfo: async (ip) => {
      // Example: Use geoip-lite or any external service
      // return geoip.lookup(ip) || {};
      return {};
    },
  }),
);

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Configuration Options

| Option            | Type       | Default     | Description                                                                     |
| ----------------- | ---------- | ----------- | ------------------------------------------------------------------------------- |
| `logBody`         | `boolean`  | `true`      | Whether to log the request body                                                 |
| `logResponse`     | `boolean`  | `true`      | Whether to log the response body                                                |
| `logQueryParams`  | `boolean`  | `true`      | Whether to log query parameters                                                 |
| `excludedHeaders` | `string[]` | `[]`        | List of header names (case-insensitive) to exclude from logs                    |
| `getIpInfo`       | `function` | `undefined` | Optional async function to enrich logs with IP information (e.g., geo-location) |

## What Gets Logged?

- HTTP method, URL, status code, and HTTP version
- Time taken (ms) for the request-response cycle
- Request and response sizes (bytes)
- Request headers (excluding those in `excludedHeaders`)
- Query parameters (if enabled)
- Request body (if enabled)
- Response body (if enabled)
- User-Agent, Referer, Content-Type, and X-Request-Id headers
- Hostname of the server
- IP info (if provided by `getIpInfo`)
- Error details (if any)

## Example Log Output

```json
{
  "method": "GET",
  "url": "/hello?foo=bar",
  "statusCode": 200,
  "timeTaken": 12.34,
  "requestSize": 2,
  "responseSize": 27,
  "timestamp": {
    "request": "2024-06-01T12:00:00.000Z",
    "response": "2024-06-01T12:00:00.012Z"
  },
  "headers": {
    "user-agent": "PostmanRuntime/7.29.0",
    "accept": "*/*"
  },
  "queryParams": {
    "foo": "bar"
  },
  "userAgent": "PostmanRuntime/7.29.0",
  "referer": undefined,
  "requestContentType": "application/json",
  "responseContentType": "application/json",
  "httpVersion": "1.1",
  "requestId": undefined,
  "hostname": "my-server",
  "body": {},
  "responseBody": "{\"message\":\"Hello, world!\"}",
  "ipInfo": {
    "country": "US"
  }
}
```

## TypeScript Support

All types are exported from [`src/types/index.ts`](src/types/index.ts).

## Development

### Scripts

- `npm run build` – Build the project (CJS and ESM)
- `npm test` – Run all tests
- `npm run format` – Format code with Prettier
- `npm run clean` – Remove build output

### Linting & Formatting

- ESLint and Prettier are configured. Run `npm run format` before committing.

### Testing

- Uses Jest for unit testing. All tests are in [`src/test/`](src/test/).

## FAQ

### How do I exclude sensitive headers from logs?

Use the `excludedHeaders` option to specify an array of header names (case-insensitive) you want to exclude.

### Can I log additional metadata?

You can extend the logger by wrapping it or forking the middleware to add custom fields.

### Does this middleware support async IP lookups?

Yes, provide an async `getIpInfo` function to enrich logs with IP-based data.

### Is this package tree-shakable?

Yes, it is fully ESM-compatible and tree-shakable.

## Contributing

Contributions are welcome! Please open issues or pull requests.

## License

MIT © [Shrinath Nayak](https://snayak.dev)
