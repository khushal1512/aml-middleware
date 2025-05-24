# Bitcoin Forensics & Linkage Dashboard

A Bitcoin simulation platform for identifying and visualizing suspicious transaction chains.

## Architecture

- **Server:** Node.js/TypeScript WebSocket server ("Mempool") that generates patterned transaction data
- **Client:** Vite/React frontend ("Investigator") with React Flow graph visualization

## Patterns Detected

- **Normal:** Standard 1-to-1 or 1-to-2 transactions
- **Coin Burst:** One source splitting into 20+ small dust transactions
- **Peel Chain:** Large input with small amounts peeled off in 5+ hops
- **Mixer/Tumbler:** Multiple inputs merging then splitting to fresh addresses

## Setup

### Server
```bash
cd server
npm install
npm run dev