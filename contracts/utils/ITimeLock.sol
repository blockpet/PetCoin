pragma solidity ^0.5.6;

import "../IKIP13.sol";

/**
 * @dev Interface of the KIP7 standard as defined in the KIP. Does not include
 * the optional functions; to access them see `KIP7Metadata`.
 * See http://kips.klaytn.com/KIPs/kip-7-fungible_token
 */
contract ITimeLock is IKIP13 {
    /**
     * @dev `beneficiary`에게 `amount`의 토큰을 `releaseTime`에 지급을 예약한다.
     * `releaseTime`이전에는 사용이 불가하다.
     * 예약이 성공하면 true를 리턴한다.
     */
    function lockUp(
        address beneficiary,
        uint256 amount,
        uint256 releaseTime
    ) public returns (bool);

    /**
     * @dev `beneficiary`에 지급이 예약된 `amount`의 토큰의 제한을
     * `releaseTime`이 경과한 것을 확인 후 푼다.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a `Transfer` event.
     */
    function lockUpRelease(address beneficiary) public returns (bool);

    /**
     * @dev `beneficiary`에 지급이 예약된 Lock up 갯수를 리턴한다.
     */
    function getLockUpCount(address beneficiary) public view returns (uint256);

    /**
     * @dev `beneficiary`에 지급이 예약된 정보를 리턴한다.
     */
    function getLockUp(address beneficiary, uint256 index)
        public
        view
        returns (uint256 amount, uint256 releaseTime);

    /**
     * @dev `beneficiary`에게 `amount`의 토큰을 `releaseTime`에 지급을 예약하였음을 알린다.
     */
    event LockedUp(address beneficiary, uint256 amount, uint256 releaseTime);

    /**
     * @dev `beneficiary`에게 `amount`의 토큰이 제한에서 풀려 지급되었음을 알린다.
     *
     */
    event LockUpReleased(address beneficiary, uint256 amount);
}
