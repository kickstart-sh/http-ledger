# HTTP Ledger - Express Logging Middleware

[![npm version](https://img.shields.io/npm/v/http-ledger.svg)](https://www.npmjs.com/package/http-ledger)
[![npm downloads](https://img.shields.io/npm/dm/http-ledger.svg)](https://www.npmjs.com/package/http-ledger)
[![bundlephobia minzip](https://img.shields.io/bundlephobia/minzip/http-ledger)](https://bundlephobia.com/package/http-ledger)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/shrinath-nayak/http-ledger/ci.yml?branch=main)](https://github.com/kickstart-sh/http-ledger/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/kickstart-sh/http-ledger/pulls)

A comprehensive Express.js middleware for detailed API request and response logging with beautiful console output, error handling, performance metrics, and advanced features like field masking, custom formatters, and log sampling.

## ✨ Features

- **Comprehensive Logging**: Captures method, URL, status code, timing, request/response sizes, headers, query parameters, and bodies
- **Advanced Security**: Field masking for sensitive data (passwords, tokens, etc.)
- **Custom Logging**: Custom formatters, log levels, and selective logging
- **Performance Optimized**: Log sampling and conditional logging
- **Request Tracking**: Auto-generated request IDs for request tracing
- **Error Handling**: Robust error handling with graceful fallbacks
- **IP Information**: Optional IP geolocation support
- **Performance Metrics**: Request/response size calculation and timing
- **Flexible Configuration**: Highly customizable logging options
- **TypeScript Support**: Full TypeScript support with type definitions
- **Multiple Module Systems**: Supports both CommonJS and ES Modules
- **High Performance**: Optimized for production use
- **Custom Log Handling**: Expose a callback to receive log data for custom processing

## 📦 Installation

```bash
npm install http-ledger
```

## 🚀 Quick Start

```javascript
const express = require('express');
const logger = require('http-ledger');

const app = express();

// Basic usage with default settings
app.use(logger());

// Advanced usage with all features
app.use(
  logger({
    // Basic logging options
    logBody: true,
    logResponse: true,
    logQueryParams: true,
    excludedHeaders: ['authorization', 'cookie'],

    // Security features
    maskFields: ['password', 'token', 'secret'],

    // Custom logging
    customLogLevel: (logData) => (logData.statusCode >= 500 ? 'error' : 'info'),
    customFormatter: (logData) => ({
      ...logData,
      customField: 'custom value',
    }),

    // Request tracking
    autoGenerateRequestId: true,

    // Selective logging
    shouldLog: (req, res) => req.method !== 'OPTIONS',
    logSampling: 0.1, // Log 10% of requests

    // IP geolocation
    getIpInfo: async (ip) => {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      return response.json();
    },

    // Custom log handling
    onLog: async (logData) => {
      await fetch('https://my-log-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
    },
  }),
);

app.listen(3000);
```

## ⚙️ Configuration Options

### Basic Logging Options

#### `logBody` (boolean, default: `true`)

Whether to include the request body in the log output.

```javascript
app.use(logger({ logBody: false })); // Disable request body logging
```

#### `logResponse` (boolean, default: `true`)

Whether to include the response body in the log output.

```javascript
app.use(logger({ logResponse: false })); // Disable response body logging
```

#### `logQueryParams` (boolean, default: `true`)

Whether to include query parameters in the log output.

```javascript
app.use(logger({ logQueryParams: false })); // Disable query parameter logging
```

#### `excludedHeaders` (string[], default: `[]`)

A list of header names (case-insensitive) to exclude from logs. Useful for removing sensitive headers.

```javascript
app.use(
  logger({
    excludedHeaders: ['authorization', 'cookie', 'x-api-key'],
  }),
);
```

### Security Features

#### `maskFields` (string[], default: `[]`)

A list of field names to mask in request/response bodies, headers, and query parameters. Sensitive values will be replaced with `***`.

```javascript
app.use(
  logger({
    maskFields: ['password', 'token', 'secret', 'apiKey', 'creditCard'],
  }),
);

// Input: { "user": "john", "password": "secret123" }
// Output: { "user": "john", "password": "***" }
```

**Nested field masking is supported:**

```javascript
app.use(
  logger({
    maskFields: ['user.password', 'data.secret', 'nested.deep.secret'],
  }),
);
```

### Custom Logging

#### `customLogLevel` (function, optional)

A custom function to determine the log level based on log data. Must return `'info'`, `'warn'`, or `'error'`.

```javascript
app.use(
  logger({
    customLogLevel: (logData) => {
      if (logData.statusCode >= 500) return 'error';
      if (logData.statusCode >= 400) return 'warn';
      if (logData.timeTaken > 1000) return 'warn'; // Slow requests
      return 'info';
    },
  }),
);
```

#### `customFormatter` (function, optional)

A custom function to format log data before output. Can transform or add additional fields.

```javascript
app.use(
  logger({
    customFormatter: (logData) => ({
      ...logData,
      environment: process.env.NODE_ENV,
      service: 'user-api',
      customTimestamp: new Date().toISOString(),
      // Add custom metrics
      isSlowRequest: logData.timeTaken > 1000,
      requestCategory: logData.method === 'GET' ? 'read' : 'write',
    }),
  }),
);
```

### Request Tracking

#### `autoGenerateRequestId` (boolean, default: `false`)

Whether to auto-generate a request ID if one is not present in the `X-Request-ID` header. The generated ID will be added to response headers.

```javascript
app.use(logger({ autoGenerateRequestId: true }));
// Adds X-Request-ID header to responses if not present
```

### Selective Logging

#### `shouldLog` (function, optional)

A function that determines whether to log a specific request. Return `false` to skip logging.

```javascript
app.use(
  logger({
    shouldLog: (req, res) => {
      // Skip health check endpoints
      if (req.path === '/health') return false;

      // Skip successful GET requests to static files
      if (
        req.method === 'GET' &&
        req.path.startsWith('/static/') &&
        res.statusCode === 200
      ) {
        return false;
      }

      return true;
    },
  }),
);
```

#### `logSampling` (number, optional)

A sampling rate between 0 and 1 to log only a percentage of requests. Useful for high-traffic applications.

```javascript
app.use(logger({ logSampling: 0.1 })); // Log 10% of requests
app.use(logger({ logSampling: 0.5 })); // Log 50% of requests
app.use(logger({ logSampling: 1.0 })); // Log all requests (default)
```

### External Integrations

#### `getIpInfo` (function, optional)

An async function that takes an IP address and returns IP-related information (e.g., geolocation).

```javascript
app.use(
  logger({
    getIpInfo: async (ip) => {
      try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return {
          country: data.country_name,
          city: data.city,
          region: data.region,
          timezone: data.timezone,
        };
      } catch (error) {
        return {}; // Return empty object on error
      }
    },
  }),
);
```

#### `onLog` (function, optional)

A callback that receives the full log data object after each request. Can be used to send logs to external services, databases, or custom endpoints. The callback is async-safe and will not block logging if it throws.

```javascript
app.use(
  logger({
    onLog: async (logData) => {
      // Send to external logging service
      await fetch('https://logs.example.com/api/logs', {
        method: 'POST',
        body: JSON.stringify(logData),
        headers: { Authorization: `Bearer ${process.env.LOG_API_KEY}` },
      });

      // Or save to database
      await db.logs.insert(logData);

      // Or send to monitoring service
      await monitoringService.track(logData);
    },
  }),
);
```

**Error handling in onLog:**

```javascript
app.use(
  logger({
    onLog: () => {
      throw new Error('External service down');
    },
  }),
);
// Console: onLog callback threw: Error: External service down
// Logging continues normally despite the error
```

## 📊 Log Output Format

The middleware outputs structured JSON logs with comprehensive information:

```json
{
  "method": "POST",
  "url": "/api/users?page=1&limit=10",
  "statusCode": 201,
  "timeTaken": 45.23,
  "requestSize": 256,
  "responseSize": 1024,
  "timestamp": {
    "request": "2024-01-01T12:00:00.000Z",
    "response": "2024-01-01T12:00:00.045Z"
  },
  "headers": {
    "user-agent": "Mozilla/5.0...",
    "accept": "application/json",
    "content-type": "application/json"
  },
  "queryParams": {
    "page": "1",
    "limit": "10"
  },
  "body": {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "***"
  },
  "responseBody": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "ipInfo": {
    "country": "United States",
    "city": "New York",
    "region": "NY",
    "timezone": "America/New_York"
  },
  "userAgent": "Mozilla/5.0...",
  "referer": "https://example.com/signup",
  "requestContentType": "application/json",
  "responseContentType": "application/json",
  "httpVersion": "1.1",
  "requestId": "req-abc123def456",
  "hostname": "server-01",
  "logLevel": "info"
}
```

## 🔧 Advanced Usage Examples

### Production Configuration

```javascript
app.use(
  logger({
    // Disable verbose logging in production
    logBody: process.env.NODE_ENV === 'development',
    logResponse: process.env.NODE_ENV === 'development',

    // Mask sensitive fields
    maskFields: ['password', 'token', 'secret', 'apiKey'],

    // Sample logs in high-traffic environments
    logSampling: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Custom log levels
    customLogLevel: (logData) => {
      if (logData.statusCode >= 500) return 'error';
      if (logData.statusCode >= 400) return 'warn';
      return 'info';
    },

    // Send to external logging service
    onLog: async (logData) => {
      await fetch(process.env.LOG_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(logData),
        headers: { Authorization: `Bearer ${process.env.LOG_API_KEY}` },
      });
    },
  }),
);
```

### Development Configuration

```javascript
app.use(
  logger({
    // Enable all logging for debugging
    logBody: true,
    logResponse: true,
    logQueryParams: true,

    // Exclude noisy headers
    excludedHeaders: ['user-agent', 'accept-encoding'],

    // Custom formatting for readability
    customFormatter: (logData) => ({
      ...logData,
      // Add color coding for different status codes
      color: logData.statusCode >= 400 ? 'red' : 'green',
      // Add request timing category
      timing: logData.timeTaken > 1000 ? 'slow' : 'fast',
    }),
  }),
);
```

### API Gateway Configuration

```javascript
app.use(
  logger({
    // Only log API requests
    shouldLog: (req, res) => req.path.startsWith('/api/'),

    // Auto-generate request IDs for tracing
    autoGenerateRequestId: true,

    // Mask API keys and tokens
    maskFields: ['apiKey', 'token', 'authorization'],

    // Custom log level based on business logic
    customLogLevel: (logData) => {
      if (logData.url.includes('/admin/')) return 'warn';
      if (logData.statusCode >= 500) return 'error';
      return 'info';
    },
  }),
);
```

## 🛡️ Error Handling

The middleware includes comprehensive error handling:

- **Graceful Degradation**: If any component fails, the middleware continues to function
- **Error Logging**: Errors are captured and included in the log output
- **Fallback Mechanisms**: Multiple fallback strategies for timing and size calculations
- **Safe JSON Serialization**: Handles circular references and complex objects
- **Async-Safe Callbacks**: `onLog` and `getIpInfo` callbacks won't break logging if they throw
- **Function Validation**: Invalid functions are safely ignored

## ⚡ Performance Considerations

- **Minimal Overhead**: Optimized for high-performance applications
- **Async Operations**: IP info fetching and onLog callback are non-blocking
- **Memory Efficient**: Streams large responses without buffering
- **Configurable Logging**: Disable expensive operations when not needed
- **Log Sampling**: Reduce logging overhead in high-traffic environments
- **Selective Logging**: Skip logging for specific requests or conditions

## 📝 TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import { Request, Response, NextFunction } from 'express';
import logger, { ApiLoggerOptions, LogData, LogLevel } from 'http-ledger';

const options: ApiLoggerOptions = {
  logBody: true,
  logResponse: true,
  excludedHeaders: ['authorization'],
  maskFields: ['password', 'token'],
  customLogLevel: (logData: LogData): LogLevel => {
    return logData.statusCode >= 500 ? 'error' : 'info';
  },
  getIpInfo: async (ip: string) => {
    return { country: 'US', city: 'New York' };
  },
  onLog: (logData: LogData) => {
    // Custom log handling
  },
};

app.use(logger(options));
```

## 📦 Module System Support

The package supports multiple module systems:

### CommonJS

```javascript
const logger = require('http-ledger');
```

### ES Modules

```javascript
import logger from 'http-ledger';
```

### TypeScript

```typescript
import logger, { ApiLoggerOptions, LogData } from 'http-ledger';
```

## 🛠️ Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Setup

```bash
git clone <repository>
cd http-ledger
npm install
```

### Available Scripts

- `npm run build` - Build both CommonJS and ES modules
- `npm run bundlesize` - Check bundle size of compiled output
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Testing

```bash
npm test
npm run test:watch
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 📋 Changelog

### v0.0.3

- **New:** Advanced security features with field masking
- **New:** Custom log formatters and log levels
- **New:** Request ID auto-generation
- **New:** Selective logging with `shouldLog` function
- **New:** Log sampling for high-traffic applications
- **Enhanced:** Improved error handling and type safety
- **Enhanced:** Better performance optimizations
- **Enhanced:** Comprehensive test coverage
- **Enhanced:** Updated dependencies

### v0.0.2

- Initial release with basic logging functionality

## 🆘 Support

For issues and questions, please open an issue on GitHub.
