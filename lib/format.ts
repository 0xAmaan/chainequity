/**
 * Format token amount from wei (18 decimals) to human-readable format
 */
export const formatTokenAmount = (
  amountWei: string | number,
  decimals: number = 18,
  maxDecimals: number = 2,
): string => {
  const amount = typeof amountWei === "string" ? parseFloat(amountWei) : amountWei;
  const divisor = Math.pow(10, decimals);
  const humanReadable = amount / divisor;

  return humanReadable.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

/**
 * Format token amount with compact notation (K, M, B, T)
 */
export const formatTokenAmountCompact = (
  amountWei: string | number,
  decimals: number = 18,
): string => {
  const amount = typeof amountWei === "string" ? parseFloat(amountWei) : amountWei;
  const divisor = Math.pow(10, decimals);
  const humanReadable = amount / divisor;

  if (humanReadable >= 1e12) {
    return `${(humanReadable / 1e12).toFixed(2)}T`;
  } else if (humanReadable >= 1e9) {
    return `${(humanReadable / 1e9).toFixed(2)}B`;
  } else if (humanReadable >= 1e6) {
    return `${(humanReadable / 1e6).toFixed(2)}M`;
  } else if (humanReadable >= 1e3) {
    return `${(humanReadable / 1e3).toFixed(2)}K`;
  } else {
    return humanReadable.toFixed(2);
  }
};
