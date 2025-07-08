import { Config } from '../types';

const config: Config = {
  logBody: true,
  logResponse: true,
  retryLimit: 3,
  excludedHeaders: [],
  debug: false,
  externalApiUrl: '',
  getIpInfo: {},
};

export default config;
