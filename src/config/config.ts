interface Config {
  logBody: boolean;
  logResponse: boolean;
  retryLimit: number;
  excludedHeaders: string[];
  debug: boolean;
  externalApiUrl?: string;
  getIpInfo?: any;
}

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
