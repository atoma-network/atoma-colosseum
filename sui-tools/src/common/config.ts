import { NetworkConfigs } from "./types";

// Network configuration
export const NETWORK_CONFIG: NetworkConfigs = {
  MAINNET: {
    fullnode: "https://fullnode.mainnet.sui.io",
    faucet: undefined,
  },
  TESTNET: {
    fullnode: "https://fullnode.testnet.sui.io",
    faucet: "https://faucet.testnet.sui.io/gas",
  },
};
