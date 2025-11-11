"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "./wallet-connect";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { ContractSelectorModal } from "./contract-selector-modal";
import { ShieldCheck, Coins, ChevronDown } from "lucide-react";
import { NavbarContractInfo } from "./navbar-contract-info";

export const Navbar = () => {
  const pathname = usePathname();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [contractData, setContractData] = useState<any>(null);

  // Check if we're on a contract page
  const isContractPage = pathname?.startsWith("/contracts/");

  // Build contract-specific nav items
  const contractAddress = contractData?.contract_address;
  const baseNavItems = contractAddress ? [
    { href: `/contracts/${contractAddress}/home`, label: "Home" },
    { href: `/contracts/${contractAddress}/captable`, label: "Cap Table" },
    { href: `/contracts/${contractAddress}/activity`, label: "Activity" },
  ] : [];

  // Add Admin tab only for contract owner
  const navItems = isOwner && contractAddress
    ? [...baseNavItems, { href: `/contracts/${contractAddress}/admin`, label: "Admin" }]
    : baseNavItems;

  return (
    <>
      {/* Only mount NavbarContractInfo on contract pages */}
      {isContractPage && (
        <NavbarContractInfo
          onOwnershipChange={setIsOwner}
          onContractDataChange={setContractData}
        />
      )}

      <nav className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
              ChainEquity
            </Link>

            {/* Contract Selector Button */}
            {isContractPage && contractData && (
              <Button
                variant="outline"
                onClick={() => setSelectorOpen(true)}
                className="hidden md:flex items-center gap-2"
              >
                <Coins className="h-4 w-4" />
                <span className="font-medium">{contractData.name}</span>
                <span className="text-muted-foreground">({contractData.symbol})</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}

            {/* Nav Items (only show on contract pages) */}
            {isContractPage && (
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Deploy button on non-contract pages */}
            {!isContractPage && pathname !== "/deploy" && (
              <Link href="/deploy">
                <Button variant="outline" size="sm">
                  <Coins className="mr-2 h-4 w-4" />
                  Deploy Token
                </Button>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isOwner && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 gap-1.5 px-2.5 py-0.5 rounded-md">
                <ShieldCheck className="h-3 w-3" />
                Admin
              </Badge>
            )}
            <WalletConnect />
          </div>
        </div>
      </nav>

      {/* Contract Selector Modal */}
      <ContractSelectorModal open={selectorOpen} onOpenChange={setSelectorOpen} />
    </>
  );
};
