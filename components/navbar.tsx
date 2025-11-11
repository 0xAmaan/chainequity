"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { WalletConnect } from "./wallet-connect";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { gatedEquityContract } from "@/lib/frontend/contract";
import { ShieldCheck } from "lucide-react";

export const Navbar = () => {
  const pathname = usePathname();
  const account = useActiveAccount();

  const { data: owner } = useReadContract({
    contract: gatedEquityContract,
    method: "function owner() view returns (address)",
    params: [],
  });

  const isOwner = account?.address && owner &&
    account.address.toLowerCase() === owner.toLowerCase();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/captable", label: "Cap Table" },
    { href: "/activity", label: "Activity" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <nav className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
            ChainEquity
          </Link>
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
  );
};
