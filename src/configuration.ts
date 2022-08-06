import { readFileSync } from 'fs';

export function extractKey(path: string) {
  return readFileSync(path)
    .toString()
    .replace(/\n|\r/g, '')
    .replace(/[-]+[\w\s]+[-]+/g, '');
}

export interface ConfigInterface {
  nodeEnv: string;
  toncenter: {
    token?: string;
    host: string;
  };
  bot: {
    name: string;
    token: string;
    path: string;
    domain: string;
  };
  blockchain: {
    deployerSeed: string;
    deployerAddress: string;
    walletAuction: string;
  };
  tonAuth: { apiHost: string; secret: string };
  tonApiToken: string;
}

// const apiHost = 'c0ae69885a4b.ngrok.io';
// apiHost: 'dns-app-33kdn.ondigitalocean.app',
const apiHost = process.env.APP_API_HOST;
const baseConfig = {
  nodeEnv: process.env.NODE_ENV,
  bot: {
    name: process.env.BOT_NAME,
    token: process.env.BOT_TOKEN,
    path: process.env.BOT_PATH,
    domain: process.env.BOT_DOMAIN,
  },
  toncenter: {
    token: process.env.TONCENTER_TOKEN ?? null,
    host: process.env.TONCENTER_HOST,
    endpoint: process.env.TONCENTER_ENDPOINT,
  },
  blockchain: {
    oldDeployerSeed: process.env.WALLET_DEPLOYER,
    deployerSeed: process.env.WALLET_DEPLOYER,
    deployerAddress: process.env.WALLET_ADDRESS,
    walletAuction: process.env.WALLET_AUCTION,
    walletHighload: process.env.WALLET_HIGHLOAD,
    walletHighloadMnemonic: process.env.WALLET_HIGHLOAD_MNEMONIC,
  },
  tonApiToken: process.env.TONAPI_KEY,
  tonAuth: {
    apiHost: process.env.APP_API_HOST,
    secret: process.env.TON_AUTH_SECRET,
  },
};
const devConfig: ConfigInterface = {
  ...baseConfig,
};

const stageConfig: ConfigInterface = {
  ...baseConfig,
};

const testnetConfig: ConfigInterface = {
  ...baseConfig,
};

const prodConfig: ConfigInterface = {
  ...baseConfig,
};

let config: ConfigInterface;

switch (process.env.APP_ENV) {
  case 'development':
    config = { ...devConfig };
    break;
  case 'stage':
    config = { ...stageConfig };
    break;
  case 'testnet':
    config = { ...testnetConfig };
    break;
  case 'production':
  default:
    config = { ...prodConfig };
}

export default () => ({
  environment: process.env.NODE_ENV,
  server: {
    jwtSecret: process.env.JWT_SECRET_KEY,
    httpPort: 3000,
    httpProtocol: 'http',
  },
  app: {
    ...config,
  },
});
