pragma solidity ^0.5.6;

import "./KIP7Burnable.sol";
import "./KIP7Pausable.sol";
import "./KIP7Metadata.sol";

/**
 * BPC is burnable, pausable but NOT mintable
 * Initial supply is given to the owner run the contract for the first time.
 */
contract PetCoin is KIP7Burnable, KIP7Pausable, KIP7Metadata {
    string public constant NAME = "PetCompany";
    string public constant SYMBOL = "BPC";
    uint8 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY =
        1000000000 * (10**uint256(DECIMALS));

    constructor() public KIP7Metadata(NAME, SYMBOL, DECIMALS) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
