// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";


abstract contract AbstractDebtToken is ERC20{

    uint public constant DECIMALS = 1e18;

    uint public constant ONE_YEAR = 365 days;

    uint public debtIndex;

    uint public initialDebtIndex;

    uint public lastUpdateTimestamp;

    mapping(address => uint) public borrowerDebt; 

    event DebtIndexUpdated(uint newDebtIndex);


    constructor(string memory name, string memory symbol, uint _debtIndex) ERC20(name, symbol) {
        initialDebtIndex = _debtIndex;
        debtIndex = _debtIndex;
        lastUpdateTimestamp = block.timestamp;
    }

    function mint(address borrower, uint amount) external {
        _mint(borrower, amount);
    }

    function burn(address borrower, uint amount) external {
        _burn(borrower, amount);
    }

    function recalculateDebtIndex(uint borrowingRate) external returns (uint) {
        console.log("DEBT-TOKEN borrowing rate %s", borrowingRate);
        console.log("DEBT-TOKEN initital debt index %s", debtIndex);
        //console.log("block.timestamp %s", block.timestamp);
        //console.log("lastUpdateTimestamp %s", lastUpdateTimestamp);
        uint timeElapsed = getElapsedTime();
        console.log("DEBT-TOKEN elapsed time %s", timeElapsed);
        //console.log("timeElapsed %s", timeElapsed);
        uint interestAccrued = (borrowingRate * timeElapsed) / ONE_YEAR;
        console.log("DEBT-TOKEN interestAccrued %s", interestAccrued);
        debtIndex = (debtIndex * (DECIMALS + interestAccrued)) / DECIMALS;
        console.log("DEBT-TOKEN  debtIndex %s", debtIndex);
        lastUpdateTimestamp = block.timestamp;
        emit DebtIndexUpdated(debtIndex);
        return debtIndex;
    }

    function getTotalDebtAccrued(address user) public view returns (uint) {
        return balanceOf(user);
    } 

    function getDebtIndex() public view returns (uint) {
        return debtIndex;
    }

    function getInitialDebtIndex() public view returns (uint) {
        return initialDebtIndex;
    }

    function getElapsedTime() public view virtual returns (uint) {
        return block.timestamp - lastUpdateTimestamp;
    }

    function _beforeTokenTransfer(address from,address to, uint256 amount) internal pure override {
        // Allow minting and burning but disallow transfers between non-zero addresses
        require(
            from == address(0) || to == address(0),
            "Debt tokens are non-transferable"
        );
    }
}