import log4js from 'log4js';
import _ from 'lodash';
import CaverExtKAS from 'caver-js-ext-kas';

import PetCoin from '../../build/contracts/PetCoin.json';
import config from './config/config';
import { klaytnAPI } from './klaytnAPI';

log4js.configure(config.log);
const logger = log4js.getLogger();

const message = 'JS Bootstrap app run successfully!';

const bootstrap = async () => {
  klaytnAPI.initialize(config.klaytn);

  try {
    const result = await klaytnAPI.deploySmartContract({
      json: PetCoin.abi,
      byteCode: PetCoin.bytecode,
      from: config.klaytn.owner,
      gas: 1000000,
    });
    console.log('smart contract deploy result', result);
  } catch (ex) {
    console.log('tx ex', ex);
  }

  // const owner = config.klaytn.owner;
  // const test1 = config.klaytn.testAccounts[0];
  // const test2 = config.klaytn.testAccounts[1];

  // const balance = await klaytnAPI.balanceOf(owner.address);
  // console.log(`balance of owner is `, balance);

  // const balance1 = await klaytnAPI.balanceOf(test1.address);
  // console.log(`balance of ${test1} is `, balance1);

  // const balance2 = await klaytnAPI.balanceOf(test2.address);
  // console.log(`balance of ${test2} is `, balance2);

  // const count = await klaytnAPI.getLockUpCount(owner, test2.address);
  // console.log('lockup count', count);

  // if (count > 0) {
  //   const lockup = await klaytnAPI.getLockUp(owner, test2.address, 0);
  //   console.log('lockup', lockup);
  // }

  // 24시간 Tx lockup
  // try {
  //   const tx = await klaytnAPI.lockUp(
  //     owner,
  //     test2.address,
  //     10000,
  //     60 * 60 * 24
  //   );
  //   console.log('tx', tx);
  // } catch (ex) {
  //   console.log('tx ex', ex);
  // }

  // try {
  //   const tx = await klaytnAPI.lockUpRelease(owner, test2.address);
  //   console.log('tx', tx);
  // } catch (ex) {
  //   console.log('tx ex', ex);
  // }

  // try {
  //   const tx = await klaytnAPI.transfer(test1, test2.address, 1000);
  //   console.log('tx', tx);
  // } catch (ex) {
  //   console.log('tx ex', ex);
  // }
};

bootstrap();
