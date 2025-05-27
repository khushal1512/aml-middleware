import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

// --- Types ---
interface Transaction {
  txid: string;
  source_address: string;
  target_address: string;
  amount_sats: number;
  fee_sats: number;
  pattern_type: 'normal' | 'coin_burst' | 'peel_chain' | 'mixer';
  hop_index: number;
  timestamp: number;
  parent_txid: string | null;
  chain_id: string | null;
}

interface ChainState {
  chain_id: string;
  pattern_type: 'normal' | 'coin_burst' | 'peel_chain' | 'mixer';
  current_hop: number;
  max_hops: number;
  remaining_sats: number;
  last_txid: string;
  last_address: string;
  completed: boolean;
}

// --- Utility Generators ---
function generateTxId(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateAddress(): string {
  const prefixes = ['1', '3', 'bc1q'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const length = prefix === 'bc1q' ? 39 : 33;
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let addr = prefix;
  for (let i = addr.length; i < length; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Stateful Graph Engine ---
class PatternEngine {
  private activeChains: ChainState[] = [];
  private allTransactions: Transaction[] = [];
  private addressPool: string[] = [];

  constructor() {
    for (let i = 0; i < 50; i++) {
      this.addressPool.push(generateAddress());
    }
  }

  private getRandomPoolAddress(): string {
    return this.addressPool[Math.floor(Math.random() * this.addressPool.length)];
  }

  generateBatch(): Transaction[] {
    const batch: Transaction[] = [];
    const batchSize = randomInt(5, 10);

    // Continue active chains
    const chainsToProcess = this.activeChains.filter(c => !c.completed);
    for (const chain of chainsToProcess) {
      if (batch.length >= batchSize) break;

      switch (chain.pattern_type) {
        case 'peel_chain': {
          const peelAmount = randomInt(10000, 50000);
          const fee = randomInt(200, 1500);
          const txid = generateTxId();
          const targetAddr = generateAddress();

          const tx: Transaction = {
            txid,
            source_address: chain.last_address,
            target_address: targetAddr,
            amount_sats: peelAmount,
            fee_sats: fee,
            pattern_type: 'peel_chain',
            hop_index: chain.current_hop,
            timestamp: Date.now(),
            parent_txid: chain.last_txid,
            chain_id: chain.chain_id,
          };

          batch.push(tx);
          chain.last_txid = txid;
          chain.last_address = targetAddr;
          chain.remaining_sats -= (peelAmount + fee);
          chain.current_hop++;

          if (chain.current_hop >= chain.max_hops || chain.remaining_sats < 20000) {
            chain.completed = true;
          }
          break;
        }

        case 'coin_burst': {
          const dustCount = randomInt(3, 6);
          for (let d = 0; d < dustCount && batch.length < batchSize; d++) {
            const dustAmount = randomInt(546, 5000);
            const fee = randomInt(100, 500);
            const txid = generateTxId();

            const tx: Transaction = {
              txid,
              source_address: chain.last_address,
              target_address: generateAddress(),
              amount_sats: dustAmount,
              fee_sats: fee,
              pattern_type: 'coin_burst',
              hop_index: chain.current_hop + d,
              timestamp: Date.now(),
              parent_txid: chain.last_txid,
              chain_id: chain.chain_id,
            };
            batch.push(tx);
            chain.remaining_sats -= (dustAmount + fee);
          }
          chain.current_hop += dustCount;
          if (chain.current_hop >= chain.max_hops || chain.remaining_sats < 5000) {
            chain.completed = true;
          }
          break;
        }

        case 'mixer': {
          const outputCount = randomInt(3, 5);
          const perOutput = Math.floor(chain.remaining_sats / (outputCount + 1));
          for (let m = 0; m < outputCount && batch.length < batchSize; m++) {
            const fee = randomInt(500, 2000);
            const txid = generateTxId();

            const tx: Transaction = {
              txid,
              source_address: chain.last_address,
              target_address: generateAddress(),
              amount_sats: perOutput,
              fee_sats: fee,
              pattern_type: 'mixer',
              hop_index: chain.current_hop + m,
              timestamp: Date.now(),
              parent_txid: chain.last_txid,
              chain_id: chain.chain_id,
            };
            batch.push(tx);
          }
          chain.completed = true;
          break;
        }

        default:
          chain.completed = true;
      }
    }

    // Clean completed chains
    this.activeChains = this.activeChains.filter(c => !c.completed);

    // Fill remaining slots with normals or spawn new patterns
    while (batch.length < batchSize) {
      const roll = Math.random();

      if (roll < 0.15 && this.activeChains.length < 5) {
        // Start a Peel Chain
        const chainId = crypto.randomBytes(8).toString('hex');
        const sourceAddr = this.getRandomPoolAddress();
        const initialAmount = randomInt(500000, 5000000);
        const txid = generateTxId();
        const targetAddr = generateAddress();
        const fee = randomInt(500, 2000);

        const tx: Transaction = {
          txid,
          source_address: sourceAddr,
          target_address: targetAddr,
          amount_sats: initialAmount,
          fee_sats: fee,
          pattern_type: 'peel_chain',
          hop_index: 0,
          timestamp: Date.now(),
          parent_txid: null,
          chain_id: chainId,
        };

        batch.push(tx);
        this.activeChains.push({
          chain_id: chainId,
          pattern_type: 'peel_chain',
          current_hop: 1,
          max_hops: randomInt(5, 12),
          remaining_sats: initialAmount - fee,
          last_txid: txid,
          last_address: targetAddr,
          completed: false,
        });
      } else if (roll < 0.25 && this.activeChains.length < 5) {
        // Start a Coin Burst
        const chainId = crypto.randomBytes(8).toString('hex');
        const sourceAddr = this.getRandomPoolAddress();
        const totalAmount = randomInt(200000, 1000000);
        const txid = generateTxId();
        const targetAddr = generateAddress();
        const fee = randomInt(300, 1000);

        const tx: Transaction = {
          txid,
          source_address: sourceAddr,
          target_address: targetAddr,
          amount_sats: totalAmount,
          fee_sats: fee,
          pattern_type: 'coin_burst',
          hop_index: 0,
          timestamp: Date.now(),
          parent_txid: null,
          chain_id: chainId,
        };

        batch.push(tx);
        this.activeChains.push({
          chain_id: chainId,
          pattern_type: 'coin_burst',
          current_hop: 1,
          max_hops: randomInt(20, 30),
          remaining_sats: totalAmount - fee,
          last_txid: txid,
          last_address: targetAddr,
          completed: false,
        });
      } else if (roll < 0.32 && this.activeChains.length < 5) {
        // Start a Mixer
        const chainId = crypto.randomBytes(8).toString('hex');
        const inputCount = randomInt(3, 6);
        const mergeAddr = generateAddress();
        let totalMixed = 0;

        for (let i = 0; i < inputCount && batch.length < batchSize; i++) {
          const amt = randomInt(100000, 500000);
          totalMixed += amt;
          const fee = randomInt(500, 2000);
          const txid = generateTxId();

          const tx: Transaction = {
            txid,
            source_address: this.getRandomPoolAddress(),
            target_address: mergeAddr,
            amount_sats: amt,
            fee_sats: fee,
            pattern_type: 'mixer',
            hop_index: i,
            timestamp: Date.now(),
            parent_txid: null,
            chain_id: chainId,
          };
          batch.push(tx);
        }

        const lastTxid = batch[batch.length - 1]?.txid || generateTxId();
        this.activeChains.push({
          chain_id: chainId,
          pattern_type: 'mixer',
          current_hop: inputCount,
          max_hops: inputCount + randomInt(3, 5),
          remaining_sats: totalMixed,
          last_txid: lastTxid,
          last_address: mergeAddr,
          completed: false,
        });
      } else {
        // Normal transaction
        const sourceAddr = this.getRandomPoolAddress();
        const targetAddr = Math.random() > 0.5 ? this.getRandomPoolAddress() : generateAddress();
        const amount = randomInt(50000, 2000000);
        const fee = randomInt(200, 3000);
        const txid = generateTxId();

        // Sometimes chain normals together
        const parentTx = this.allTransactions.length > 0 && Math.random() > 0.6
          ? this.allTransactions[randomInt(
              Math.max(0, this.allTransactions.length - 20),
              this.allTransactions.length - 1
            )]
          : null;

        const tx: Transaction = {
          txid,
          source_address: parentTx ? parentTx.target_address : sourceAddr,
          target_address: targetAddr,
          amount_sats: amount,
          fee_sats: fee,
          pattern_type: 'normal',
          hop_index: parentTx ? parentTx.hop_index + 1 : 0,
          timestamp: Date.now(),
          parent_txid: parentTx ? parentTx.txid : null,
          chain_id: null,
        };
        batch.push(tx);
      }
    }

    this.allTransactions.push(...batch);

    // Keep memory bounded
    if (this.allTransactions.length > 2000) {
      this.allTransactions = this.allTransactions.slice(-1000);
    }

    return batch;
  }
}

// --- WebSocket Server ---
const PORT = parseInt(process.env.PORT || '8080', 10);
const wss = new WebSocketServer({ port: PORT });
const engine = new PatternEngine();

console.log(`[Mempool Server] WebSocket listening on ws://localhost:${PORT}`);

const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  console.log('[Mempool Server] Client connected');
  clients.add(ws);

  ws.on('close', () => {
    console.log('[Mempool Server] Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (err: Error) => {
    console.error('[Mempool Server] Socket error:', err.message);
    clients.delete(ws);
  });
});

// Emit batches every 4 seconds
setInterval(() => {
  if (clients.size === 0) return;

  const batch = engine.generateBatch();
  const payload = JSON.stringify({
    type: 'tx_batch',
    data: batch,
    server_time: Date.now(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });

  const patternCounts = batch.reduce((acc, tx) => {
    acc[tx.pattern_type] = (acc[tx.pattern_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`[Mempool Server] Emitted ${batch.length} txs:`, patternCounts);
}, 4000);

console.log('[Mempool Server] Pattern engine started, emitting every 4s');