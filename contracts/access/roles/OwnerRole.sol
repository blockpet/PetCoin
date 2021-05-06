pragma solidity ^0.5.6;

import "../Roles.sol";

contract OwnerRole {
    using Roles for Roles.Role;

    event OwnerAdded(address indexed account);
    event OwnerRemoved(address indexed account);

    Roles.Role private _owners;

    constructor() internal {
        _addOwner(msg.sender);
    }

    modifier onlyOwner() {
        require(
            isOwner(msg.sender),
            "OwnerRole: caller does not have the Owner role"
        );
        _;
    }

    function isOwner(address account) public view returns (bool) {
        return _owners.has(account);
    }

    function transferOwner(address account) public onlyOwner {
        _addOwner(account);
        _removeOwner(msg.sender);
    }

    function renounceOwner() public onlyOwner {
        _removeOwner(msg.sender);
    }

    function _addOwner(address account) internal {
        _owners.add(account);
        emit OwnerAdded(account);
    }

    function _removeOwner(address account) internal {
        _owners.remove(account);
        emit OwnerRemoved(account);
    }
}
