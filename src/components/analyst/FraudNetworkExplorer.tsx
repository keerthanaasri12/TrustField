import React, { useState } from 'react';
import { NetworkGraph, GraphNode } from '../../types/domain.ts';
import { Share2, AlertTriangle, ShieldCheck, Smartphone, User, Landmark, HelpCircle, Layers } from 'lucide-react';

interface FraudNetworkExplorerProps {
  graph: NetworkGraph;
  highlightNodeId?: string;
}

export const FraudNetworkExplorer: React.FC<FraudNetworkExplorerProps> = ({
  graph,
  highlightNodeId = 'node-ben-quickpay',
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(
    graph.nodes.find((n) => n.id === highlightNodeId) || graph.nodes[0] || null
  );

  const getNodeIcon = (type: GraphNode['type']) => {
    switch (type) {
      case 'Customer':
        return <User className="w-4 h-4" />;
      case 'Account':
        return <Landmark className="w-4 h-4" />;
      case 'Device':
        return <Smartphone className="w-4 h-4" />;
      case 'Beneficiary':
        return <AlertTriangle className="w-4 h-4" />;
      case 'MuleCluster':
        return <Layers className="w-4 h-4" />;
      default:
        return <Share2 className="w-4 h-4" />;
    }
  };

  const getNodeColor = (node: GraphNode) => {
    if (node.flagged) {
      return node.type === 'MuleCluster'
        ? 'bg-purple-900/80 border-purple-500 text-purple-200'
        : 'bg-rose-950/80 border-rose-600 text-rose-200';
    }
    return 'bg-slate-900 border-slate-700 text-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Visual Graph Canvas / Representation */}
      <div className="bg-slate-950 rounded-xl p-6 border border-slate-800 text-white relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-100">
              <Share2 className="w-4 h-4 text-blue-400" />
              Interactive Entity Relationship Topology
            </h4>
            <p className="text-xs text-slate-400">
              Synthetic mule ring linkage and multi-hop entity mapping for Ravi Kumar
            </p>
          </div>
          <span className="text-[11px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
            Cluster Size: 8 Nodes
          </span>
        </div>

        {/* Visual Map Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          {/* Column 1: Customer & Account */}
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Customer Perimeter</span>
            {graph.nodes
              .filter((n) => n.type === 'Customer' || n.type === 'Account')
              .map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNode(node)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedNode?.id === node.id
                      ? 'ring-2 ring-blue-400 border-blue-500 bg-slate-850'
                      : getNodeColor(node)
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getNodeIcon(node.type)}
                    <span className="font-semibold text-xs">{node.label}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono">
                    {Object.entries(node.properties).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                  </div>
                </button>
              ))}
          </div>

          {/* Column 2: Devices & Payment Vectors */}
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Devices & Payee Vector</span>
            {graph.nodes
              .filter((n) => n.type === 'Device' || (n.type === 'Beneficiary' && n.id === 'node-ben-quickpay'))
              .map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNode(node)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedNode?.id === node.id
                      ? 'ring-2 ring-blue-400 border-blue-500 bg-slate-850'
                      : getNodeColor(node)
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getNodeIcon(node.type)}
                      <span className="font-semibold text-xs">{node.label}</span>
                    </div>
                    {node.flagged && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded">
                        Flagged
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono">
                    {Object.entries(node.properties).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                  </div>
                </button>
              ))}
          </div>

          {/* Column 3: Synthetic Mule Syndicate */}
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Mule Cluster Dispersion</span>
            {graph.nodes
              .filter((n) => n.type === 'MuleCluster' || (n.type === 'Beneficiary' && n.id !== 'node-ben-quickpay') || n.type === 'NetworkContext')
              .map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNode(node)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedNode?.id === node.id
                      ? 'ring-2 ring-blue-400 border-blue-500 bg-slate-850'
                      : getNodeColor(node)
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getNodeIcon(node.type)}
                      <span className="font-semibold text-xs">{node.label}</span>
                    </div>
                    {node.flagged && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded">
                        Syndicate Node
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono">
                    {Object.entries(node.properties).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Selected Entity Details Banner */}
        {selectedNode && (
          <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-400">Inspecting Entity: </span>
              <strong className="text-white font-mono">{selectedNode.label}</strong>
              <span className="text-slate-500 ml-2 font-mono">({selectedNode.type})</span>
            </div>
            <div className="text-slate-300 font-mono text-[11px]">
              {selectedNode.flagged ? (
                <span className="text-rose-400 font-semibold">Flagged: High Risk Association</span>
              ) : (
                <span className="text-emerald-400 font-semibold">Status: Trusted Identity Baseline</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Accessible Relationship Evidence Table (Required by Section F2 & I2) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-slate-900">
              Relationship Evidence Table (Accessible Audit View)
            </h4>
            <p className="text-xs text-slate-500">
              Full cryptographic and observational proof for all network links
            </p>
          </div>
          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
            {graph.edges.length} Verified Links
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">Relationship Type</th>
                <th className="p-3">Source Node</th>
                <th className="p-3">Target Node</th>
                <th className="p-3">Evidence Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {graph.edges.map((edge) => {
                const sourceNode = graph.nodes.find((n) => n.id === edge.source);
                const targetNode = graph.nodes.find((n) => n.id === edge.target);

                return (
                  <tr key={edge.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-semibold text-blue-700">
                      {edge.relationship}
                    </td>
                    <td className="p-3 font-medium text-slate-900">
                      {sourceNode ? sourceNode.label : edge.source}
                    </td>
                    <td className="p-3 font-medium text-slate-900">
                      {targetNode ? targetNode.label : edge.target}
                    </td>
                    <td className="p-3 text-slate-600">
                      {edge.evidence}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
