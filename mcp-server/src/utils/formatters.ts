export function truncateHash(hash: string, chars: number = 8): string {
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

export function truncateAddress(addr: string, chars: number = 6): string {
  if (addr.length <= chars * 2) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export function satsToBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}

export function formatSats(sats: number): string {
  return sats.toLocaleString() + " sat";
}

export function formatDualUnit(sats: number): string {
  return `${formatSats(sats)} (${satsToBtc(sats)} BTC)`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString();
}

export function patternLabel(pattern: string): string {
  const labels: Record<string, string> = {
    normal: "NORMAL",
    coin_burst: "COIN BURST",
    peel_chain: "PEEL CHAIN",
    mixer: "MIXER/TUMBLER",
  };
  return labels[pattern] ?? pattern.toUpperCase();
}

export function riskLevelEmoji(level: string): string {
  const emojis: Record<string, string> = {
    LOW: "🟢",
    MEDIUM: "🟡",
    HIGH: "🟠",
    CRITICAL: "🔴",
  };
  return emojis[level] ?? "⚪";
}