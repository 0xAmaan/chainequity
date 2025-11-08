// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GatedEquityToken.sol";

contract DeployGatedEquity is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        GatedEquityToken token = new GatedEquityToken(
            "ChainEquity Demo Token",
            "CEQDEMO"
        );

        console.log("GatedEquityToken deployed at:", address(token));
        console.log("Owner:", token.owner());
        console.log("Name:", token.name());
        console.log("Symbol:", token.symbol());

        vm.stopBroadcast();
    }
}
