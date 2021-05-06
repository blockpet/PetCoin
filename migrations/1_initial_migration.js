const Migrations = artifacts.require("./Migrations.sol");
const PetCoin = artifacts.require("./PetCoin.sol");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(PetCoin);
};
