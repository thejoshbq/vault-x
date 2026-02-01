import React, { useState, useEffect } from 'react';

// ============================================
// MATRIX-STYLE SANKEY DIAGRAM
// Flowing data streams with binary rain effect
// ============================================

const MatrixSankey = ({ nodes, flows }) => {
  const [particles, setParticles] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredFlow, setHoveredFlow] = useState(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => {
        const newParticles = flows.flatMap((flow, fi) => {
          if (Math.random() > 0.7 && flow.amount > 0) {
            return [{
              id: `${fi}-${Date.now()}-${Math.random()}`,
              flowIndex: fi,
              progress: 0,
              speed: 0.015 + Math.random() * 0.025,
              char: Math.random() > 0.5 ? '1' : '0',
              opacity: 0.7 + Math.random() * 0.3
            }];
          }
          return [];
        });
        
        return [...prev, ...newParticles]
          .map(p => ({ ...p, progress: p.progress + p.speed }))
          .filter(p => p.progress < 1)
          .slice(-60);
      });
    }, 80);
    
    return () => clearInterval(interval);
  }, [flows]);

  const width = 900, height = 520;
  const nodeWidth = 140, nodeHeight = 48;
  const padding = { left: 50, top: 70 };
  
  // Organize nodes into columns by type
  const columns = {
    income: { x: padding.left, nodes: nodes.filter(n => n.type === 'income') },
    account: { x: padding.left + 260, nodes: nodes.filter(n => n.type === 'account') },
    distribution: { x: padding.left + 520, nodes: nodes.filter(n => ['savings', 'investment', 'expense'].includes(n.type)) },
  };
  
  // Position nodes within their columns
  const positionedNodes = {};
  
  columns.income.nodes.forEach((node, i) => { 
    positionedNodes[node.id] = { ...node, x: columns.income.x, y: padding.top + 80 + i * 100 }; 
  });
  
  columns.account.nodes.forEach((node, i) => { 
    positionedNodes[node.id] = { ...node, x: columns.account.x, y: padding.top + 100 + i * 120 }; 
  });
  
  const savingsInv = columns.distribution.nodes.filter(n => ['savings', 'investment'].includes(n.type));
  const expenses = columns.distribution.nodes.filter(n => n.type === 'expense');
  
  savingsInv.forEach((node, i) => { 
    positionedNodes[node.id] = { ...node, x: columns.distribution.x, y: padding.top + 20 + i * 60 }; 
  });
  
  expenses.forEach((node, i) => { 
    positionedNodes[node.id] = { ...node, x: columns.distribution.x, y: padding.top + 220 + i * 55 }; 
  });

  // Generate bezier curve path between nodes
  const getPath = (flow) => {
    const from = positionedNodes[flow.from], to = positionedNodes[flow.to];
    if (!from || !to) return { path: '', midpoint: { x: 0, y: 0 } };
    
    const x1 = from.x + nodeWidth, y1 = from.y + nodeHeight / 2;
    const x2 = to.x, y2 = to.y + nodeHeight / 2;
    const cx = (x1 + x2) / 2;
    
    return {
      path: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
      midpoint: { x: cx, y: (y1 + y2) / 2 }
    };
  };

  // Calculate point position along bezier curve
  const getPointOnPath = (flow, progress) => {
    const from = positionedNodes[flow.from], to = positionedNodes[flow.to];
    if (!from || !to) return { x: 0, y: 0 };
    
    const x1 = from.x + nodeWidth, y1 = from.y + nodeHeight / 2;
    const x2 = to.x, y2 = to.y + nodeHeight / 2;
    const t = progress;
    
    // Cubic bezier calculation
    const cx1 = (x1 + x2) / 2, cy1 = y1;
    const cx2 = (x1 + x2) / 2, cy2 = y2;
    
    const x = Math.pow(1-t, 3) * x1 + 3 * Math.pow(1-t, 2) * t * cx1 + 3 * (1-t) * t * t * cx2 + Math.pow(t, 3) * x2;
    const y = Math.pow(1-t, 3) * y1 + 3 * Math.pow(1-t, 2) * t * cy1 + 3 * (1-t) * t * t * cy2 + Math.pow(t, 3) * y2;
    
    return { x, y };
  };

  // Color scheme by node type
  const nodeColors = {
    income: '#00ff41',      // Matrix green
    account: '#00d4ff',     // Cyan
    savings: '#bf00ff',     // Purple
    investment: '#ff0080',  // Pink
    expense: '#ffb800',     // Amber
  };

  // Calculate flow thickness based on amount
  const maxFlow = Math.max(...flows.map(f => f.amount), 1);
  const getFlowThickness = (amount) => Math.max(2, (amount / maxFlow) * 16);

  return (
    <div className="relative bg-black rounded-xl border border-green-500/30 p-4 overflow-hidden">
      {/* Animated matrix rain background */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        {[...Array(40)].map((_, i) => (
          <div 
            key={i} 
            className="absolute text-green-500 font-mono text-xs"
            style={{ 
              left: `${(i * 2.5)}%`, 
              animation: `matrixFall ${3 + Math.random() * 4}s linear infinite`,
              animationDelay: `${Math.random() * 3}s`
            }}
          >
            {[...Array(10)].map((_, j) => (
              <div key={j} style={{ opacity: 1 - j * 0.1 }}>
                {Math.random() > 0.5 ? '1' : '0'}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-500 font-mono text-sm tracking-wider">MATRIX_FLOW // CASH_FLOW_VISUALIZATION</span>
        </div>
        <div className="text-green-500/50 font-mono text-xs">
          {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
        </div>
      </div>
      
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          {/* Glow filters */}
          <filter id="matrixGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="strongGlow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="subtleGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background grid */}
        <g className="opacity-15">
          {[...Array(25)].map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2={height} stroke="#00ff41" strokeWidth="0.5" />
          ))}
          {[...Array(15)].map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 40} x2={width} y2={i * 40} stroke="#00ff41" strokeWidth="0.5" />
          ))}
        </g>
        
        {/* Flow paths */}
        {flows.map((flow, i) => {
          const { path } = getPath(flow);
          const toNode = positionedNodes[flow.to];
          const color = toNode ? nodeColors[toNode.type] : '#00ff41';
          const isHighlighted = hoveredFlow === i || hoveredNode === flow.from || hoveredNode === flow.to;
          const thickness = getFlowThickness(flow.amount);
          
          return (
            <g key={i}>
              {/* Path background (dashed) */}
              <path 
                d={path} 
                fill="none" 
                stroke={color} 
                strokeWidth={thickness} 
                opacity={isHighlighted ? 0.5 : 0.2} 
                strokeDasharray="6 4"
                className="transition-opacity duration-300"
              />
              {/* Path glow */}
              <path 
                d={path} 
                fill="none" 
                stroke={color} 
                strokeWidth={isHighlighted ? 3 : 1.5} 
                opacity={isHighlighted ? 0.9 : 0.5} 
                filter="url(#matrixGlow)"
                className="transition-all duration-300"
                onMouseEnter={() => setHoveredFlow(i)}
                onMouseLeave={() => setHoveredFlow(null)}
                style={{ cursor: 'pointer' }}
              />
              {/* Amount label on hover */}
              {isHighlighted && (
                <g>
                  <rect 
                    x={getPath(flow).midpoint.x - 35} 
                    y={getPath(flow).midpoint.y - 12} 
                    width="70" 
                    height="24" 
                    rx="4"
                    fill="black"
                    stroke={color}
                    strokeWidth="1"
                  />
                  <text 
                    x={getPath(flow).midpoint.x} 
                    y={getPath(flow).midpoint.y + 4} 
                    fill={color} 
                    fontSize="11" 
                    textAnchor="middle" 
                    className="font-mono"
                  >
                    ${flow.amount.toLocaleString()}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        
        {/* Animated particles */}
        {particles.map((p) => {
          const flow = flows[p.flowIndex];
          if (!flow) return null;
          const pos = getPointOnPath(flow, p.progress);
          const toNode = positionedNodes[flow.to];
          const color = toNode ? nodeColors[toNode.type] : '#00ff41';
          
          return (
            <g key={p.id}>
              {/* Particle glow */}
              <circle 
                cx={pos.x} 
                cy={pos.y} 
                r="4" 
                fill={color} 
                opacity={p.opacity * 0.5}
                filter="url(#strongGlow)" 
              />
              {/* Particle core */}
              <circle 
                cx={pos.x} 
                cy={pos.y} 
                r="2" 
                fill={color}
                opacity={p.opacity}
              />
              {/* Binary character */}
              <text 
                x={pos.x} 
                y={pos.y + 4} 
                fill={color} 
                fontSize="8" 
                textAnchor="middle" 
                className="font-mono"
                opacity={p.opacity * 0.8}
              >
                {p.char}
              </text>
            </g>
          );
        })}
        
        {/* Nodes */}
        {Object.values(positionedNodes).map((node) => {
          const color = nodeColors[node.type];
          const isHovered = hoveredNode === node.id;
          
          return (
            <g 
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Node background */}
              <rect 
                x={node.x} 
                y={node.y} 
                width={nodeWidth} 
                height={nodeHeight} 
                rx="4"
                fill="black" 
                stroke={color} 
                strokeWidth={isHovered ? 2 : 1}
                filter={isHovered ? "url(#matrixGlow)" : "url(#subtleGlow)"}
                className="transition-all duration-200"
              />
              
              {/* Node fill gradient */}
              <rect 
                x={node.x} 
                y={node.y} 
                width={nodeWidth} 
                height={nodeHeight} 
                rx="4"
                fill={`${color}15`}
              />
              
              {/* Animated scan line */}
              <rect 
                x={node.x + 3} 
                y={node.y + 3} 
                width={nodeWidth - 6} 
                height="2" 
                fill={color} 
                opacity={isHovered ? 0.5 : 0.25}
              >
                <animate 
                  attributeName="y" 
                  values={`${node.y + 3};${node.y + nodeHeight - 5};${node.y + 3}`} 
                  dur="2.5s" 
                  repeatCount="indefinite" 
                />
              </rect>
              
              {/* Corner brackets */}
              <path 
                d={`M ${node.x + 8} ${node.y} L ${node.x} ${node.y} L ${node.x} ${node.y + 8}`} 
                fill="none" 
                stroke={color} 
                strokeWidth="2"
                opacity="0.7"
              />
              <path 
                d={`M ${node.x + nodeWidth - 8} ${node.y} L ${node.x + nodeWidth} ${node.y} L ${node.x + nodeWidth} ${node.y + 8}`} 
                fill="none" 
                stroke={color} 
                strokeWidth="2"
                opacity="0.7"
              />
              <path 
                d={`M ${node.x + 8} ${node.y + nodeHeight} L ${node.x} ${node.y + nodeHeight} L ${node.x} ${node.y + nodeHeight - 8}`} 
                fill="none" 
                stroke={color} 
                strokeWidth="2"
                opacity="0.7"
              />
              <path 
                d={`M ${node.x + nodeWidth - 8} ${node.y + nodeHeight} L ${node.x + nodeWidth} ${node.y + nodeHeight} L ${node.x + nodeWidth} ${node.y + nodeHeight - 8}`} 
                fill="none" 
                stroke={color} 
                strokeWidth="2"
                opacity="0.7"
              />
              
              {/* Node label */}
              <text 
                x={node.x + nodeWidth / 2} 
                y={node.y + 20} 
                fill={color} 
                fontSize="11" 
                textAnchor="middle" 
                className="font-mono font-bold tracking-wide"
              >
                {node.label.toUpperCase()}
              </text>
              
              {/* Node value */}
              <text 
                x={node.x + nodeWidth / 2} 
                y={node.y + 36} 
                fill={color} 
                fontSize="12" 
                textAnchor="middle" 
                className="font-mono"
                opacity="0.8"
              >
                ${(node.amount || node.balance || node.budgeted || 0).toLocaleString()}
              </text>
            </g>
          );
        })}
        
        {/* Column headers */}
        <g className="font-mono">
          <text x={columns.income.x + nodeWidth/2} y={35} fill="#00ff41" fontSize="10" textAnchor="middle" className="tracking-widest">
            [INCOME_STREAM]
          </text>
          <text x={columns.account.x + nodeWidth/2} y={35} fill="#00d4ff" fontSize="10" textAnchor="middle" className="tracking-widest">
            [ROUTING_NODE]
          </text>
          <text x={columns.distribution.x + nodeWidth/2} y={35} fill="#bf00ff" fontSize="10" textAnchor="middle" className="tracking-widest">
            [DISTRIBUTION]
          </text>
        </g>
        
        {/* Legend */}
        <g transform={`translate(${width - 150}, ${height - 120})`}>
          <rect x="-10" y="-10" width="150" height="115" rx="4" fill="black" stroke="#00ff41" strokeWidth="0.5" opacity="0.8" />
          <text x="0" y="8" fill="#00ff41" fontSize="9" className="font-mono tracking-wider">[LEGEND]</text>
          {Object.entries(nodeColors).map(([type, color], i) => (
            <g key={type} transform={`translate(0, ${22 + i * 18})`}>
              <rect x="0" y="-6" width="12" height="12" rx="2" fill={color} opacity="0.8" />
              <text x="18" y="3" fill={color} fontSize="9" className="font-mono uppercase">{type}</text>
            </g>
          ))}
        </g>
      </svg>
      
      {/* CSS for matrix fall animation */}
      <style>{`
        @keyframes matrixFall {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ============================================
// DEMO DATA
// ============================================
const sampleNodes = [
  { id: 'musc', type: 'income', label: 'MUSC', amount: 3183.61 },
  { id: 'lumberjills', type: 'income', label: "Lumber Jill's", amount: 180.96 },
  { id: 'checking', type: 'account', label: 'Checking', balance: 2400 },
  { id: 'robinhood', type: 'account', label: 'Robinhood', balance: 570 },
  { id: 'emergency', type: 'savings', label: 'Emergency Fund', balance: 1195.93 },
  { id: 'roth', type: 'investment', label: 'Roth IRA', balance: 358 },
  { id: 'managed', type: 'investment', label: 'Portfolio', balance: 212 },
  { id: 'housing', type: 'expense', label: 'Housing', budgeted: 1600 },
  { id: 'transport', type: 'expense', label: 'Transport', budgeted: 160 },
  { id: 'subscriptions', type: 'expense', label: 'Subscriptions', budgeted: 253 },
];

const sampleFlows = [
  { from: 'musc', to: 'checking', amount: 3183.61 },
  { from: 'lumberjills', to: 'checking', amount: 180.96 },
  { from: 'checking', to: 'robinhood', amount: 340 },
  { from: 'robinhood', to: 'roth', amount: 35 },
  { from: 'robinhood', to: 'managed', amount: 5 },
  { from: 'robinhood', to: 'emergency', amount: 300 },
  { from: 'checking', to: 'housing', amount: 1600 },
  { from: 'checking', to: 'transport', amount: 160 },
  { from: 'checking', to: 'subscriptions', amount: 253 },
];

// ============================================
// EXPORT DEMO APP
// ============================================
export default function MatrixSankeyDemo() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-500 font-mono mb-2">MATRIX_FLOW</h1>
          <p className="text-green-500/60 font-mono text-sm">Cash Flow Visualization System</p>
        </div>
        
        <MatrixSankey nodes={sampleNodes} flows={sampleFlows} />
        
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="bg-black border border-green-500/30 rounded-xl p-4">
            <h3 className="text-green-400 font-mono mb-2">// INTERACTIONS</h3>
            <ul className="text-green-500/70 space-y-1 font-mono text-xs">
              <li>• Hover nodes to highlight connections</li>
              <li>• Hover flows to see transfer amounts</li>
              <li>• Watch binary particles flow in real-time</li>
              <li>• Flow thickness = transaction amount</li>
            </ul>
          </div>
          <div className="bg-black border border-green-500/30 rounded-xl p-4">
            <h3 className="text-green-400 font-mono mb-2">// USAGE</h3>
            <pre className="text-green-500/70 text-xs overflow-x-auto">
{`<MatrixSankey 
  nodes={[
    { id: 'income1', type: 'income', 
      label: 'Salary', amount: 5000 },
    { id: 'checking', type: 'account',
      label: 'Checking', balance: 2400 },
    // ...
  ]}
  flows={[
    { from: 'income1', to: 'checking', 
      amount: 5000 },
    // ...
  ]}
/>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// Also export the component separately for integration
export { MatrixSankey };
