"use client";

import { ReactNode } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CopyableAddressProps {
  address: string;
  className?: string;
  children?: ReactNode;
}

export const CopyableAddress = ({ address, className = "", children }: CopyableAddressProps) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Copied to clipboard");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onClick={handleCopy}
            className={`cursor-pointer hover:text-primary transition-colors ${className}`}
          >
            {children || address}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to copy</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
