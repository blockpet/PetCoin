import log4js from 'log4js';
import _ from 'lodash';
import dayjs from 'dayjs';
import CaverExtKAS from 'caver-js-ext-kas';

import PetCoin from './PetCoin.json';
import config from './config/config';

export const klaytnAPI = (() => {
  // private variables
  const DECIMAL_WEIGHT = 1000000000000000000;
  const GAS_LIMIT = '1000000';
  let config;
  let caver;
  let kip7;
  let methods;
  let DECIMAL18;
  let contract;

  /**
   * KAS 계정에서 Tx를 실행한다.
   * Owner 계정이 KAS 계정이다.
   *
   * @param {*} from
   * @param {*} input
   * @returns
   */
  async function sendTransactionKAS(from, input) {
    return caver.kas.wallet.requestFDSmartContractExecutionPaidByGlobalFeePayer(
      {
        from,
        to: config.smartContract,
        value: 0,
        input,
        gas: GAS_LIMIT,
        submit: true,
      }
    );
  }

  /**
   * 외부 계정에서 Tx를 실행한다.
   * fee payer를 KAS의 Global Fee Payer가 담당한다.
   *
   * @param {*} from
   * @param {*} input
   * @returns
   */
  async function sendTransaction(from, input) {
    const keyringContainer = new caver.keyringContainer();
    const keyring = keyringContainer.keyring.createFromPrivateKey(
      from.privateKey
    );
    keyringContainer.add(keyring);

    const tx = new caver.transaction.feeDelegatedSmartContractExecution({
      from: from.address,
      to: config.smartContract,
      input,
      gas: GAS_LIMIT,
    });

    await keyringContainer.sign(from.address, tx);
    kip7.setWallet(keyringContainer);

    const txResult =
      await caver.kas.wallet.requestFDRawTransactionPaidByGlobalFeePayer({
        rlp: tx.getRLPEncoding(),
        submit: true,
      });

    console.log('txResult', txResult);
    if (txResult?.transactionHash) {
      return await caver.kas.wallet.getTransaction(txResult.transactionHash);
    }
  }

  /**
   * 초 단위로 시긴을 계산하여 리턴
   *
   * @param {*} second
   * @returns
   */
  function calcReleaseTime(second) {
    return parseInt(
      new Date(new Date().getTime() + second * 1000).getTime() / 1000,
      10
    );
  }

  return {
    initialize: (options) => {
      config = options;
      const { smartContract, kas } = config;
      const { chainId, accessKeyId, secretAccessKey } = kas;

      caver = new CaverExtKAS(chainId, accessKeyId, secretAccessKey);
      caver.initKASAPI(chainId, accessKeyId, secretAccessKey);

      kip7 = new caver.kct.kip7(smartContract);
      contract = new caver.klay.Contract(PetCoin.abi, smartContract);

      const time = calcReleaseTime(600);
      console.log('cald now', dayjs());
      console.log('cald 10 sec', dayjs.unix(time));
      methods = _.reduce(
        PetCoin.abi,
        (output, doc) => {
          if (!doc || doc.type !== 'function') return output;
          const { name, type, inputs } = doc;
          return { ...output, [name]: { name, type, inputs } };
        },
        {}
      );

      DECIMAL18 = caver.utils.toBN('1000000000000000000');
    },

    balanceOf: async (address) => {
      try {
        // const balance = await kip7.balanceOf(address);
        const balance = await contract.methods.balanceOf(address).call();
        return balance / DECIMAL_WEIGHT;
      } catch (ex) {
        return -1;
      }
    },

    transfer: async (from, to, amount) => {
      const input = caver.abi.encodeFunctionCall(methods.transfer, [
        to,
        caver.utils.toBN(amount).mul(DECIMAL18),
      ]);

      return sendTransaction(from, input);
    },

    getLockUpCount: async (from, to) => {
      return await contract.methods.getLockUpCount(to).call();
    },

    getLockUp: async (from, to, index) => {
      const result = await contract.methods.getLockUp(to, index).call();
      return {
        amount: result.amount / DECIMAL18,
        releaseTime: dayjs.unix(result.releaseTime),
      };
    },

    lockUp: async (from, to, amount, releaseSec) => {
      const input = caver.abi.encodeFunctionCall(methods.lockUp, [
        to,
        caver.utils.toBN(amount).mul(DECIMAL18),
        caver.utils.toBN(calcReleaseTime(releaseSec)),
      ]);

      return sendTransaction(from, input);
    },

    lockUpRelease: async (from, to) => {
      // const input = caver.abi.encodeFunctionCall(methods.lockUpRelease, [to]);

      // return sendTransaction(from, input);
      try {
        const result = await contract.methods.lockUpRelease(to).call();
        console.log('lockUpRelease result', result);
      } catch (ex) {
        console.log('lockUpRelease ex', ex);
      }
    },
  };
})();
