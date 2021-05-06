const PetCoin = artifacts.require("./PetCoin.sol");
const Caver = require("caver-js");
const chai = require("chai");
const truffleAssert = require("truffle-assertions");
const config = require("config");

const DECIMAL18 = Caver.utils.toBN("1000000000000000000");

var testAccounts = config.testAccounts;

contract("PetCoin", async (accounts) => {
  // 컨트랙트 인스턴스를 상위 레벨에 저장해
  // 모든 함수에서 접근할 수 있도록 합니다.
  var petCoinInstance;
  var owner = accounts[0];

  // 각 테스트가 진행되기 전에 실행됩니다.
  before(async function () {
    // set contract instance into a variable
    petCoinInstance = await PetCoin.new({ from: owner });
  });

  // 테스터 1에게 10000 BPT를 전송하고 그 잔고가 증가함을 확인한다.
  it("#1 check transfer", async function () {
    var amount = Caver.utils.toBN(10000).mul(DECIMAL18);
    var recipient = testAccounts[0].address;

    await petCoinInstance.transfer(recipient, amount);
    var balance = await petCoinInstance.balanceOf(recipient);

    chai.expect(balance.eq(amount)).to.equal(true);
  });

  // 테스터 2에게 5000 BPT를 7.5초후 지급하는 것으로 lockUp 설정한 다음,
  // 시스템 소유자의 잔고가 줄어들고, 수신자의 잔고가 증가했음을 확인한다.
  // lockUp 해제를 시도한 후, lockUp 잔고가 그대로 있고, 수신자의 잔고도 0으로 있음을 확인한다.
  it("#2 check lockUp reserve", async function () {
    var recipient = testAccounts[1].address;
    var amount = Caver.utils.toBN(5000).mul(DECIMAL18);

    // 7.5초 후 제한 해제
    var releaseTime = parseInt(
      new Date(new Date().getTime() + 7.5 * 1000).getTime() / 1000,
      10
    );

    var ownerBalanceBefore = await petCoinInstance.balanceOf(owner);

    await petCoinInstance.lockUp(
      recipient,
      amount,
      Caver.utils.toBN(releaseTime)
    );

    var ownerBalanceAfter = await petCoinInstance.balanceOf(owner);
    chai
      .expect(ownerBalanceBefore.sub(ownerBalanceAfter).eq(amount))
      .to.equal(true);

    var recipientBalance = await petCoinInstance.balanceOf(recipient);
    chai.expect(recipientBalance.eq(amount)).to.equal(true);

    var lockUpCount1 = await petCoinInstance.getLockUpCount(recipient);
    var lockUpTotal1 = Caver.utils.toBN(0);
    for (let i = 0; i < lockUpCount1.toNumber(); i++) {
      var obj = await petCoinInstance.getLockUp(recipient, Caver.utils.toBN(i));
      lockUpTotal1 = lockUpTotal1.add(obj.amount);
    }
    chai.expect(lockUpTotal1.eq(amount)).to.equal(true);

    await petCoinInstance.lockUpRelease(recipient);

    var lockUpCount2 = await petCoinInstance.getLockUpCount(recipient);
    var lockUpTotal2 = Caver.utils.toBN(0);
    for (let i = 0; i < lockUpCount2.toNumber(); i++) {
      var obj = await petCoinInstance.getLockUp(recipient, Caver.utils.toBN(i));
      lockUpTotal2 = lockUpTotal2.add(obj.amount);
    }
    chai.expect(lockUpTotal2.eq(amount)).to.equal(true);
  });

  // 10초를 그냥 보낸 다음
  // 수신자의 잔고가 5000 BPC로 증가했음을 확인하고
  // lockUp 잔고가 0으로 줄어들었음을 확인한다.

  it("#3 check lockUp release", async function () {
    var recipient = testAccounts[1].address;
    var amount = Caver.utils.toBN(5000).mul(DECIMAL18);

    function timeout(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    await timeout(10000);

    await petCoinInstance.lockUpRelease(recipient);

    var recipientBalance = await petCoinInstance.balanceOf(recipient);
    chai.expect(recipientBalance.eq(amount)).to.equal(true);

    var lockUpCount3 = await petCoinInstance.getLockUpCount(recipient);
    var lockUpTotal3 = Caver.utils.toBN(0);
    for (let i = 0; i < lockUpCount3.toNumber(); i++) {
      var obj = await petCoinInstance.getLockUp(recipient, Caver.utils.toBN(i));
      lockUpTotal3 = lockUpTotal3.add(obj.amount);
    }
    chai.expect(lockUpTotal3.eq(Caver.utils.toBN(0))).to.equal(true);
  });
});
