// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {GatedEquityToken} from "../src/GatedEquityToken.sol";

contract DeployGatedEquity is Script {
    function run() external {
        vm.startBroadcast();

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
