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
  var ownerBalance = 0;

  // 각 테스트가 진행되기 전에 실행됩니다.
  before(async function () {
    // set contract instance into a variable
    petCoinInstance = await PetCoin.new({ from: owner });

    // owner를 변경한다.
    petCoinInstance.transferOwner(testAccounts[0].address);
  });

  // `owner`의 잔고만 있고, 다른 계정에는 잔고가 없음을 확인한다.
  it("#1 check initial settings", async function () {
    var amount = Caver.utils.toBN(1000000000).mul(DECIMAL18);

    ownerBalance = await petCoinInstance.balanceOf(owner);
    chai.expect(ownerBalance.eq(amount)).to.equal(true);

    var amountZero = Caver.utils.toBN(0);
    var balance;

    balance = await petCoinInstance.balanceOf(testAccounts[0].address);
    chai.expect(balance.eq(amountZero)).to.equal(true);

    balance = await petCoinInstance.balanceOf(testAccounts[1].address);
    chai.expect(balance.eq(amountZero)).to.equal(true);
  });

  // `owner`가 아닌 계정에서 lockUp를 시도하면 오류가 발생한다.
  it("#2 lock up permission", async function () {
    var recipient = testAccounts[1].address;
    var amount = Caver.utils.toBN(12345).mul(DECIMAL18);

    // 10초 후 제한 해제
    var releaseTime = parseInt(
      new Date(new Date().getTime() + 10 * 1000).getTime() / 1000,
      10
    );

    try {
      await petCoinInstance.lockUp(
        recipient,
        amount,
        Caver.utils.toBN(releaseTime)
      );

      chai.expect(true).to.equal(false);
    } catch (ex) {
      chai.expect(!!ex).to.equal(true);
    }
  });
});
