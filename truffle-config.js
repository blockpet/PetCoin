const config = require("config");
const HDWalletProvider = require("truffle-hdwallet-provider-klaytn");
const Caver = require("caver-js");

const GAS_LIMIT = 8500000;
const GAS_PRICE = null;

const { owner, devnet, testnet, mainnet, kas } = config || {};

module.exports = {
  networks: {
    devnet: {
      provider: () => new HDWalletProvider(owner.privateKey, devnet.url),
      network_id: devnet.networkId,
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
    kasBaobab: {
      provider: () =>
        new HDWalletProvider(
          owner.privateKey,
          new Caver.providers.HttpProvider(
            "https://node-api.klaytnapi.com/v1/klaytn",
            {
              headers: [
                {
                  name: "Authorization",
                  value:
                    "Basic " +
                    Buffer.from(
                      kas.accessKeyId + ":" + kas.secretAccessKey
                    ).toString("base64"),
                },
                { name: "x-chain-id", value: testnet.networkId },
              ],
              keepAlive: false,
            }
          )
        ),
      network_id: testnet.networkId,
      gas: GAS_LIMIT,
      gasPrice: GAS_PRICE,
    },
    kasCypress: {
      provider: () =>
        new HDWalletProvider(
          owner.privateKey,
          new Caver.providers.HttpProvider(
            "https://node-api.klaytnapi.com/v1/klaytn",
            {
              headers: [
                {
                  name: "Authorization",
                  value:
                    "Basic " +
                    Buffer.from(
                      kas.accessKeyId + ":" + kas.secretAccessKey
                    ).toString("base64"),
                },
                { name: "x-chain-id", value: mainnet.networkId },
              ],
              keepAlive: false,
            }
          )
        ),
      network_id: mainnet.networkId,
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
