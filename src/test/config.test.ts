import config from '../config/config';

describe('config', () => {
  test('should export a valid config object', () => {
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  test('should have required properties', () => {
    expect(config).toHaveProperty('logBody');
    expect(config).toHaveProperty('logResponse');
    expect(config).toHaveProperty('retryLimit');
    expect(config).toHaveProperty('excludedHeaders');
    expect(config).toHaveProperty('debug');
    expect(config).toHaveProperty('externalApiUrl');
    expect(config).toHaveProperty('getIpInfo');
  });

  test('should have correct default values', () => {
    expect(config.logBody).toBe(true);
    expect(config.logResponse).toBe(true);
    expect(config.retryLimit).toBe(3);
    expect(config.excludedHeaders).toEqual([]);
    expect(config.debug).toBe(false);
    expect(config.externalApiUrl).toBe('');
    expect(config.getIpInfo).toEqual({});
  });

  test('should have correct types', () => {
    expect(typeof config.logBody).toBe('boolean');
    expect(typeof config.logResponse).toBe('boolean');
    expect(typeof config.retryLimit).toBe('number');
    expect(Array.isArray(config.excludedHeaders)).toBe(true);
    expect(typeof config.debug).toBe('boolean');
    expect(typeof config.externalApiUrl).toBe('string');
    expect(typeof config.getIpInfo).toBe('object');
  });
});
