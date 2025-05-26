export function truncateHash(hash: string, chars: number = 8): string {
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

export function truncateAddress(addr: string, chars: number = 6): string {
  if (addr.length <= chars * 2) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function patternLabel(pattern: string): string {
  switch (pattern) {
    case 'normal':
      return 'NORMAL';
    case 'coin_burst':
      return 'COIN BURST';
    case 'peel_chain':
      return 'PEEL CHAIN';
    case 'mixer':
      return 'MIXER';
    default:
      return pattern.toUpperCase();
  }
}

export function patternColor(pattern: string): string {
  switch (pattern) {
    case 'normal':
      return '#2A2A2A';
    case 'coin_burst':
      return '#FE734C';
    case 'peel_chain':
      return '#D4A33B';
    case 'mixer':
      return '#DE4A3D';
    default:
      return '#2A2A2A';
  }
}

export function isSuspicious(pattern: string): boolean {
  return pattern === 'mixer' || pattern === 'peel_chain' || pattern === 'coin_burst';
}