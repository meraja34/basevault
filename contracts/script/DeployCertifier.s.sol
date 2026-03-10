// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BaseVaultCertifier.sol";

contract DeployCertifier is Script {
    function run() external {
        // V6 BaseVault on Base Mainnet
        address baseVault = 0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3;

        uint256 registrationFee = 0;
        uint256 perCertFee = 0;
        uint256 batchDiscountBps = 0;

        vm.startBroadcast();

        BaseVaultCertifier certifier = new BaseVaultCertifier(
            baseVault,
            registrationFee,
            perCertFee,
            batchDiscountBps
        );

        console.log("BaseVaultCertifier deployed at:", address(certifier));
        console.log("BaseVault reference:", baseVault);
        console.log("Registration fee:", registrationFee);
        console.log("Per cert fee:", perCertFee);
        console.log("Batch discount bps:", batchDiscountBps);

        vm.stopBroadcast();
    }
}
