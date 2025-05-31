import React, { useMemo, useCallback, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeMouseHandler,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Transaction } from '../types/transaction';
import { truncateHash, patternLabel, patternColor, isSuspicious } from '../utils/formatters';
import { useUnit } from '../context/UnitContext';

interface LinkageGraphProps {
  transactions: Transaction[];
  onSelectTx?: (txid: string) => void;
}

function CustomNode({ data }: { data: any }) {
  const suspicious = isSuspicious(data.pattern_type);
  const borderColor = patternColor(data.pattern_type);

  return (
    <div
      className="bg-cream font-data text-[10px] relative"
      style={{
        border: `${suspicious ? '3px' : '2px'} solid ${borderColor}`,
        padding: '6px 8px',
        minWidth: '140px',
      }}
    >
      {suspicious && (
        <div
          className="absolute -top-4 left-0 font-data text-[8px] font-bold tracking-widest danger-pulse"
          style={{ color: '#DE4A3D' }}
        >
          ⚠ DANGER
        </div>
      )}
      <div className="font-bold mb-1" style={{ color: borderColor }}>
        {patternLabel(data.pattern_type)}
      </div>
      <div className="opacity-70 text-[9px]">{truncateHash(data.txid, 6)}</div>
      <div className="mt-1 text-[9px]">{data.amount}</div>
      {data.hop_index > 0 && (
        <div className="mt-1 text-[9px] opacity-50">HOP #{data.hop_index}</div>
      )}
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

export default function LinkageGraph({ transactions, onSelectTx }: LinkageGraphProps) {
  const { convert } = useUnit();
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const { nodes: flowNodes, edges: flowEdges, ancestorSet, descendantSet } = useMemo(() => {
    const recent = transactions.slice(-80);
    const txMap = new Map<string, Transaction>();
    recent.forEach((tx) => txMap.set(tx.txid, tx));

    // Build adjacency for ancestry / descendant tracing
    const childrenOf = new Map<string, string[]>();
    recent.forEach((tx) => {
      if (tx.parent_txid && txMap.has(tx.parent_txid)) {
        const existing = childrenOf.get(tx.parent_txid) || [];
        existing.push(tx.txid);
        childrenOf.set(tx.parent_txid, existing);
      }
    });

    // Trace ancestors
    const ancestors = new Set<string>();
    const descendants = new Set<string>();

    if (selectedTxId && txMap.has(selectedTxId)) {
      // Ancestors: walk parent_txid upwards
      let cursor: string | null = selectedTxId;
      while (cursor) {
        ancestors.add(cursor);
        const tx = txMap.get(cursor);
        cursor = tx?.parent_txid && txMap.has(tx.parent_txid) ? tx.parent_txid : null;
      }
      // Descendants: BFS downwards
      const queue = [selectedTxId];
      while (queue.length) {
        const current = queue.shift()!;
        descendants.add(current);
        const children = childrenOf.get(current) || [];
        children.forEach((c) => {
          if (!descendants.has(c)) queue.push(c);
        });
      }
    }

    // Layout: group by chain, then by hop
    const chainGroups = new Map<string, Transaction[]>();
    const unchained: Transaction[] = [];

    recent.forEach((tx) => {
      if (tx.chain_id) {
        const group = chainGroups.get(tx.chain_id) || [];
        group.push(tx);
        chainGroups.set(tx.chain_id, group);
      } else {
        unchained.push(tx);
      }
    });

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let yOffset = 0;

    // Layout chained transactions
    chainGroups.forEach((txs, _chainId) => {
      txs.sort((a, b) => a.hop_index - b.hop_index);
      txs.forEach((tx, idx) => {
        const isHighlighted =
          selectedTxId && (ancestors.has(tx.txid) || descendants.has(tx.txid));
        const isSelected = tx.txid === selectedTxId;

        nodes.push({
          id: tx.txid,
          type: 'custom',
          position: { x: idx * 200, y: yOffset },
          data: {
            txid: tx.txid,
            pattern_type: tx.pattern_type,
            amount: convert(tx.amount_sats),
            hop_index: tx.hop_index,
          },
          style: {
            opacity: selectedTxId ? (isHighlighted ? 1 : 0.2) : 1,
            outline: isSelected ? '3px solid #FE734C' : 'none',
          },
        });

        if (tx.parent_txid && txMap.has(tx.parent_txid)) {
          const edgeHighlight =
            selectedTxId && ancestors.has(tx.txid) && ancestors.has(tx.parent_txid);
          edges.push({
            id: `e-${tx.parent_txid}-${tx.txid}`,
            source: tx.parent_txid,
            target: tx.txid,
            type: 'smoothstep',
            style: {
              stroke: edgeHighlight
                ? '#FE734C'
                : patternColor(tx.pattern_type),
              strokeWidth: edgeHighlight ? 2.5 : 1.5,
              opacity: selectedTxId ? (edgeHighlight ? 1 : 0.15) : 0.7,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeHighlight ? '#FE734C' : patternColor(tx.pattern_type),
              width: 12,
              height: 12,
            },
          });
        }
      });
      yOffset += 120;
    });

    // Layout unchained transactions
    const cols = 5;
    unchained.forEach((tx, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const isHighlighted =
        selectedTxId && (ancestors.has(tx.txid) || descendants.has(tx.txid));
      const isSelected = tx.txid === selectedTxId;

      nodes.push({
        id: tx.txid,
        type: 'custom',
        position: { x: col * 200, y: yOffset + row * 100 },
        data: {
          txid: tx.txid,
          pattern_type: tx.pattern_type,
          amount: convert(tx.amount_sats),
          hop_index: tx.hop_index,
        },
        style: {
          opacity: selectedTxId ? (isHighlighted ? 1 : 0.2) : 1,
          outline: isSelected ? '3px solid #FE734C' : 'none',
        },
      });

      if (tx.parent_txid && txMap.has(tx.parent_txid)) {
        edges.push({
          id: `e-${tx.parent_txid}-${tx.txid}`,
          source: tx.parent_txid,
          target: tx.txid,
          type: 'smoothstep',
          style: {
            stroke: patternColor(tx.pattern_type),
            strokeWidth: 1.5,
            opacity: selectedTxId && !isHighlighted ? 0.15 : 0.7,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: patternColor(tx.pattern_type),
            width: 12,
            height: 12,
          },
        });
      }
    });

    return {
      nodes,
      edges,
      ancestorSet: ancestors,
      descendantSet: descendants,
    };
  }, [transactions, selectedTxId, convert]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  React.useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedTxId((prev) => (prev === node.id ? null : node.id));
      onSelectTx?.(node.id);
    },
    [onSelectTx]
  );

  return (
    <div className="retro-border" style={{ height: '500px', width: '100%' }}>
      <div className="border-b-2 border-charcoal px-3 py-1 flex items-center justify-between">
        <span className="font-data text-[10px] uppercase tracking-[0.15em]">
          ◆ LINKAGE GRAPH — {nodes.length} NODES / {edges.length} EDGES
        </span>
        {selectedTxId && (
          <button
            onClick={() => setSelectedTxId(null)}
            className="retro-btn text-[9px] py-0.5 px-2"
          >
            CLEAR SELECTION
          </button>
        )}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          position="bottom-left"
          style={{ border: '2px solid #2A2A2A', borderRadius: 0 }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2A2A2A"
          style={{ opacity: 0.15 }}
        />
        <MiniMap
          nodeColor={(n) => patternColor(n.data?.pattern_type || 'normal')}
          maskColor="rgba(255, 246, 229, 0.8)"
          style={{
            border: '2px solid #2A2A2A',
            borderRadius: 0,
            background: '#FFF6E5',
          }}
        />
      </ReactFlow>
    </div>
  );
}