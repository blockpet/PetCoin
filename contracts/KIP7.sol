pragma solidity ^0.5.6;

import "./IKIP7.sol";
import "./KIP13.sol";
import "./IKIP7Receiver.sol";
import "./math/SafeMath.sol";
import "./utils/Address.sol";
import "./utils/ITimeLock.sol";
import "./access/roles/OwnerRole.sol";

/**
 * @dev Implementation of the `IKIP7` interface.
 *
 * 최초 BPC 생성을 위한 `mint` 기능은 있지만, 이후 `mint` 기능은 허용되지 않는다.
 *
 * 함수 수행 결과가 실패했을 때, `false`를 리턴하는 것이 아니고, `revert` 한다.
 *
 * 최초 참여자에게 제공하는 토큰의 `lockUp` 기능이 구현되어 있다.
 */
contract KIP7 is KIP13, IKIP7, ITimeLock, OwnerRole {
    using SafeMath for uint256;
    using Address for address;

    // Equals to `bytes4(keccak256("onKIP7Received(address,address,uint256,bytes)"))`
    // which can be also obtained as `IKIP7Receiver(0).onKIP7Received.selector`
    bytes4 private constant _KIP7_RECEIVED = 0x9d188c22;

    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    struct LockUpTicket {
        uint256 amount;
        uint256 releaseTime;
    }

    mapping(address => LockUpTicket[]) private _lockedBalances;

    // 총 공급 토큰의 합계
    uint256 private _totalSupply;

    /*
     *     bytes4(keccak256('totalSupply()')) == 0x18160ddd
     *     bytes4(keccak256('balanceOf(address)')) == 0x70a08231
     *     bytes4(keccak256('transfer(address,uint256)')) == 0xa9059cbb
     *     bytes4(keccak256('allowance(address,address)')) == 0xdd62ed3e
     *     bytes4(keccak256('approve(address,uint256)')) == 0x095ea7b3
     *     bytes4(keccak256('transferFrom(address,address,uint256)')) == 0x23b872dd
     *     bytes4(keccak256("safeTransfer(address,uint256)")) == 0x423f6cef
     *     bytes4(keccak256("safeTransfer(address,uint256,bytes)")) == 0xeb795549
     *     bytes4(keccak256("safeTransferFrom(address,address,uint256)")) == 0x42842e0e
     *     bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)")) == 0xb88d4fde
     *     bytes4(keccak256('lockUp(address,uint256,uint256)')) == 0x531d8bbd
     *     bytes4(keccak256('lockUpRelease(address)')) == 0x710092d1
     *     bytes4(keccak256('getLockUpCount(address)')) == 0xc8dff52b
     *     bytes4(keccak256('getLockUp(address,uint16)')) == 0xbc16f940
     *     bytes4(keccak256('isOwner(address)')) == 0x2f54bf6e
     *     bytes4(keccak256('transferOwner(address)')) == 0x4fb2e45d
     *     bytes4(keccak256('renounceOwner()')) == 0x28c23a45
     *
     *     => 0x18160ddd ^ 0x70a08231 ^ 0xa9059cbb ^ 0xdd62ed3e ^ 0x095ea7b3 ^ 0x23b872dd ^ 0x423f6cef ^ 0xeb795549 ^ 0x42842e0e ^ 0xb88d4fde ^ 0x531d8bbd ^ 0x710092d1 ^ 0xc8dff52b ^ 0xbc16f940 ^ 0x2f54bf6e ^ 0x4fb2e45d ^ 0x28c23a45 == 0x7b880700
     */
    bytes4 private constant _INTERFACE_ID_KIP7 = 0x7b880700;

    constructor() public {
        // register the supported interfaces to conform to KIP7 via KIP13
        _registerInterface(_INTERFACE_ID_KIP7);
    }

    /**
     * @dev See `IKIP7.totalSupply`.
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See `IKIP7.balanceOf`.
     */
    function balanceOf(address account) public view returns (uint256) {
        if (_lockedBalances[account].length > 0) {
            uint256 locked = 0;
            for (uint256 i = 0; i < _lockedBalances[account].length; i++) {
                locked = locked.add(_lockedBalances[account][i].amount);
            }

            return _balances[account] + locked;
        } else {
            return _balances[account];
        }
    }

    /**
     * @dev See `IKIP7.transfer`.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /**
     * @dev See `IKIP7.allowance`.
     */
    function allowance(address owner, address spender)
        public
        view
        returns (uint256)
    {
        return _allowances[owner][spender];
    }

    /**
     * @dev See `IKIP7.approve`.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 value) public returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    /**
     * @dev See `IKIP7.transferFrom`.
     *
     * Emits an `Approval` event indicating the updated allowance. This is not
     * required by the KIP. See the note at the beginning of `KIP7`;
     *
     * Requirements:
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `value`.
     * - the caller must have allowance for `sender`'s tokens of at least
     * `amount`.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            msg.sender,
            _allowances[sender][msg.sender].sub(amount)
        );
        return true;
    }

    /**
     * @dev  Moves `amount` tokens from the caller's account to `recipient`.
     */
    function safeTransfer(address recipient, uint256 amount) public {
        safeTransfer(recipient, amount, "");
    }

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     */
    function safeTransfer(
        address recipient,
        uint256 amount,
        bytes memory data
    ) public {
        transfer(recipient, amount);
        require(
            _checkOnKIP7Received(msg.sender, recipient, amount, data),
            "KIP7: transfer to non KIP7Receiver implementer"
        );
    }

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the allowance mechanism.
     * `amount` is then deducted from the caller's allowance.
     */
    function safeTransferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public {
        safeTransferFrom(sender, recipient, amount, "");
    }

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the allowance mechanism.
     * `amount` is then deducted from the caller's allowance.
     */
    function safeTransferFrom(
        address sender,
        address recipient,
        uint256 amount,
        bytes memory data
    ) public {
        transferFrom(sender, recipient, amount);
        require(
            _checkOnKIP7Received(sender, recipient, amount, data),
            "KIP7: transfer to non KIP7Receiver implementer"
        );
    }

    /**
     * @dev `beneficiary`에 `amount`의 토큰을 `releaseTime`에 지급을 예약한다.
     */
    function lockUp(
        address beneficiary,
        uint256 amount,
        uint256 releaseTime
    ) public onlyOwner returns (bool) {
        _lockUp(beneficiary, amount, releaseTime);
        return true;
    }

    /**
     * @dev `beneficiary`에 약정된 지급 예약 목록에서 예정일시가 경과된 항목에 대하여 지급을 수행한다.
     */
    function lockUpRelease(address beneficiary) public returns (bool) {
        _lockUpRelease(beneficiary);
        return true;
    }

    /**
     * @dev `beneficiary`에 지급이 예약된 Lock up 갯수를 리턴한다.
     */
    function getLockUpCount(address beneficiary) public view returns (uint256) {
        uint256 count = 0;

        for (uint256 i = 0; i < _lockedBalances[beneficiary].length; i++) {
            count += _lockedBalances[beneficiary][i].amount > 0 ? 1 : 0;
        }

        return count;
    }

    /**
     * @dev `beneficiary`에 지급이 예약된 정보를 리턴한다.
     */
    function getLockUp(address beneficiary, uint256 index)
        public
        view
        returns (uint256 amount, uint256 releaseTime)
    {
        require(
            _lockedBalances[beneficiary].length > 0,
            "KIP7: empty array lockUps"
        );
        require(
            0 <= index && index < _lockedBalances[beneficiary].length,
            "KIP7: invalid index of array lockUps"
        );

        LockUpTicket memory obj = _lockedBalances[beneficiary][index];

        return (obj.amount, obj.releaseTime);
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     *
     * This is internal function is equivalent to `transfer`, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a `Transfer` event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), "KIP7: transfer from the zero address");
        require(recipient != address(0), "KIP7: transfer to the zero address");

        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a `Transfer` event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "KIP7: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a `Transfer` event with `to` set to the zero address.
     *
     * Requirements
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 value) internal {
        require(account != address(0), "KIP7: burn from the zero address");

        _totalSupply = _totalSupply.sub(value);
        _balances[account] = _balances[account].sub(value);
        emit Transfer(account, address(0), value);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner`s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an `Approval` event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(
        address owner,
        address spender,
        uint256 value
    ) internal {
        require(owner != address(0), "KIP7: approve from the zero address");
        require(spender != address(0), "KIP7: approve to the zero address");

        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    /**
     * @dev Destroys `amount` tokens from `account`.`amount` is then deducted
     * from the caller's allowance.
     *
     * See `_burn` and `_approve`.
     */
    function _burnFrom(address account, uint256 amount) internal {
        _burn(account, amount);
        _approve(
            account,
            msg.sender,
            _allowances[account][msg.sender].sub(amount)
        );
    }

    /**
     * @dev Internal function to invoke `onKIP7Received` on a target address.
     * The call is not executed if the target address is not a contract.
     */
    function _checkOnKIP7Received(
        address sender,
        address recipient,
        uint256 amount,
        bytes memory _data
    ) internal returns (bool) {
        if (!recipient.isContract()) {
            return true;
        }

        bytes4 retval =
            IKIP7Receiver(recipient).onKIP7Received(
                msg.sender,
                sender,
                amount,
                _data
            );
        return (retval == _KIP7_RECEIVED);
    }

    /**
     * @dev Internal function to reserve to send token at reserved time.
     */
    function _lockUp(
        address beneficiary,
        uint256 amount,
        uint256 releaseTime
    ) internal returns (bool) {
        require(
            beneficiary != address(0),
            "KIP7: lockUp from the zero address"
        );
        require(releaseTime > now, "KIP7: lockUp from the past time");

        LockUpTicket memory ticket;
        ticket.amount = amount;
        ticket.releaseTime = releaseTime;

        _lockedBalances[beneficiary].push(ticket);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);

        emit LockedUp(beneficiary, amount, releaseTime);
    }

    /**
     * @dev Internal function to release token at reserved time.
     */
    function _lockUpRelease(address beneficiary) public returns (bool) {
        require(
            beneficiary != address(0),
            "KIP7: lockUpRelease from the zero address"
        );
        require(
            msg.sender == beneficiary || isOwner(msg.sender),
            "KIP7: lockUpRelease from the address that is NOT beneficiary"
        );

        for (uint256 i = _lockedBalances[beneficiary].length; i > 0; i--) {
            LockUpTicket memory ticket = _lockedBalances[beneficiary][i - 1];

            if (ticket.amount > uint256(0) && ticket.releaseTime <= now) {
                _lockedBalances[beneficiary][i - 1].amount = uint256(0);
                _balances[beneficiary] = _balances[beneficiary].add(
                    ticket.amount
                );

                delete _lockedBalances[beneficiary][i - 1];

                emit LockUpReleased(beneficiary, ticket.amount);
            }
        }

        return true;
    }
}
