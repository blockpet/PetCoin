const config = require("config");
const HDWalletProvider = require("@truffle/hdwallet-provider");

const GAS_LIMIT = 8500000;
const GAS_PRICE = null;

const { owner, testnet, mainnet } = config || {};

module.exports = {
  networks: {
    development: {
      // host: "localhost",
      // port: 8545,
      // network_id: "*",
      provider: () => new HDWalletProvider(owner.privateKey, testnet.url),
      network_id: testnet.networkId,
      gas: GAS_LIMIT,
      gasPrice: GAS_PRICE,
    },
    testnet: {
      provider: () => new HDWalletProvider(owner.privateKey, testnet.url),
      network_id: testnet.networkId,
      gas: GAS_LIMIT,
      gasPrice: GAS_PRICE,
    },
    mainnet: {
      provider: () => new HDWalletProvider(owner.privateKey, mainnet.url),
      network_id: mainnet.network_id,
      gas: GAS_LIMIT,
      gasPrice: GAS_PRICE,
    },
  },
  compilers: {
    solc: {
      version: "0.5.6",
    },
  },
  mocha: {
    enableTimeouts: false,
    before_timeout: 120000, // Here is 2min but can be whatever timeout is suitable for you.
  },
};
