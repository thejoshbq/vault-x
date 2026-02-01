import React, { useState, useEffect } from 'react';
import { ArrowRight, Trash2, Plus } from 'lucide-react';

export const FlowSection = ({ node, flows, nodes, onFlowCreate, onFlowDelete }) => {
  const [addingFlow, setAddingFlow] = useState(false);
  const [flowForm, setFlowForm] = useState({ nodeId: '', amount: '' });
  const [allowSplit, setAllowSplit] = useState(false);

  // Get flows involving this node
  const outgoingFlows = flows.filter(f => f.from_node_id === node.id);
  const incomingFlows = flows.filter(f => f.to_node_id === node.id);

  // Define valid connection rules
  const getValidDestinations = (sourceNode) => {
    const rules = {
      'income': ['account', 'savings', 'investment'],
      'account': ['savings', 'investment', 'expense', 'budget'],
      'savings': ['account'],
      'investment': [],
      'expense': [],
      'budget': []
    };
    const validTypes = rules[sourceNode.type] || [];
    return nodes.filter(n => n.id !== sourceNode.id && validTypes.includes(n.type));
  };

  const getValidSources = (destNode) => {
    const rules = {
      'income': [],
      'account': ['income', 'savings'],
      'savings': ['income', 'account'],
      'investment': ['income', 'account'],
      'expense': ['account'],
      'budget': ['account']
    };
    const validTypes = rules[destNode.type] || [];
    return nodes.filter(n => n.id !== destNode.id && validTypes.includes(n.type));
  };

  const validDestinations = getValidDestinations(node);
  const validSources = getValidSources(node);
  const canSendFlows = validDestinations.length > 0;
  const canReceiveFlows = validSources.length > 0;

  const getValidationMessage = () => {
    if (['expense', 'budget'].includes(node.type)) {
      return "💡 Expenses and budgets can only receive money, not send it";
    }
    if (node.type === 'income') {
      return "💡 Income sources can only send money, not receive it";
    }
    if (node.type === 'investment') {
      return "💡 Investments can only receive money, not send it";
    }
    return "";
  };

  const handleAddFlow = () => {
    if (flowForm.nodeId && flowForm.amount) {
      onFlowCreate({
        from_node_id: canSendFlows ? node.id : parseInt(flowForm.nodeId),
        to_node_id: canSendFlows ? parseInt(flowForm.nodeId) : node.id,
        amount: parseFloat(flowForm.amount),
        label: '',
        is_recurring: true
      });
      setFlowForm({ nodeId: '', amount: '' });
      setAddingFlow(false);
    }
  };

  // Check if the selected destination is an expense or budget
  const isExpenseDestination = () => {
    if (!flowForm.nodeId) return false;
    // Normalize both to strings for comparison
    const selectedNode = nodes.find(n => String(n.id) === String(flowForm.nodeId));
    return selectedNode && ['expense', 'budget'].includes(selectedNode.type);
  };

  // Get the amount from expense/budget node
  const getExpenseAmount = () => {
    if (!flowForm.nodeId) return 0;
    // Normalize both to strings for comparison
    const selectedNode = nodes.find(n => String(n.id) === String(flowForm.nodeId));
    return selectedNode?.amount || 0;
  };

  // Check if amount should be locked (expense destination and split not allowed)
  const isAmountLocked = () => {
    return canSendFlows && isExpenseDestination() && !allowSplit;
  };

  // Auto-fill expense amount when split mode is disabled
  useEffect(() => {
    if (!allowSplit && canSendFlows && isExpenseDestination()) {
      const expenseAmount = getExpenseAmount();
      if (expenseAmount > 0) {
        setFlowForm(prev => ({ ...prev, amount: expenseAmount.toString() }));
      }
    }
  }, [allowSplit]);

  // Reset split mode when closing form
  useEffect(() => {
    if (!addingFlow) {
      setAllowSplit(false);
    }
  }, [addingFlow]);

  return (
    <div className="mt-3 pt-3 border-t border-zinc-700/50">
      <div className="text-xs text-zinc-400 mb-2">Money Flow</div>

      {/* Outgoing flows */}
      {outgoingFlows.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-emerald-500/70 mb-1">Outgoing:</div>
          {outgoingFlows.map(flow => {
            const destNode = nodes.find(n => n.id === flow.to_node_id);
            return (
              <div key={flow.id} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <ArrowRight size={12} className="text-zinc-500" />
                  <span>{destNode?.label}</span>
                  <span className="text-emerald-500">${flow.amount.toFixed(2)}</span>
                </div>
                <button onClick={() => onFlowDelete(flow.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Incoming flows */}
      {incomingFlows.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-blue-500/70 mb-1">Incoming:</div>
          {incomingFlows.map(flow => {
            const srcNode = nodes.find(n => n.id === flow.from_node_id);
            return (
              <div key={flow.id} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <ArrowRight size={12} className="text-zinc-500 rotate-180" />
                  <span>{srcNode?.label}</span>
                  <span className="text-blue-500">${flow.amount.toFixed(2)}</span>
                </div>
                <button onClick={() => onFlowDelete(flow.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add flow button */}
      {(canSendFlows || canReceiveFlows) && !addingFlow && (
        <button
          onClick={() => setAddingFlow(true)}
          className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
        >
          <Plus size={12} /> Add flow
        </button>
      )}

      {/* Add flow form */}
      {addingFlow && (
        <div className="mt-2 p-2 bg-zinc-800/50 rounded border border-zinc-700">
          <select
            value={flowForm.nodeId}
            onChange={(e) => {
              const selectedNodeId = e.target.value;
              // Normalize comparison
              const selectedNode = nodes.find(n => String(n.id) === String(selectedNodeId));

              // Auto-fill amount if selecting an expense/budget and not in split mode
              if (canSendFlows && selectedNode && ['expense', 'budget'].includes(selectedNode.type) && !allowSplit) {
                setFlowForm({ nodeId: selectedNodeId, amount: (selectedNode.amount || 0).toString() });
              } else {
                setFlowForm({ ...flowForm, nodeId: selectedNodeId });
              }
            }}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs mb-2"
          >
            <option value="">Select {canSendFlows ? 'destination' : 'source'}</option>
            {(canSendFlows ? validDestinations : validSources).map(n => (
              <option key={n.id} value={n.id}>{n.label} {n.amount ? `($${n.amount})` : ''}</option>
            ))}
          </select>

          {/* Split mode checkbox - only show for expense destinations */}
          {canSendFlows && isExpenseDestination() && (
            <div className="mb-2">
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowSplit}
                  onChange={(e) => setAllowSplit(e.target.checked)}
                  className="rounded border-zinc-700"
                />
                <span>Allow split payment (multiple flows to this expense)</span>
              </label>
              {allowSplit && (
                <p className="text-xs text-zinc-500 mt-1 ml-5">
                  💡 You can create multiple flows to split the expense amount
                </p>
              )}
            </div>
          )}

          {/* Amount input - locked for expenses unless split is enabled */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-zinc-500">Amount</label>
              {isAmountLocked() && (
                <span className="text-xs text-amber-500 flex items-center gap-1">
                  🔒 Locked to expense amount
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              value={flowForm.amount}
              onChange={(e) => setFlowForm({ ...flowForm, amount: e.target.value })}
              placeholder="Amount"
              disabled={isAmountLocked()}
              className={`w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs mb-2 ${
                isAmountLocked() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddFlow}
              disabled={!flowForm.nodeId || !flowForm.amount || parseFloat(flowForm.amount) <= 0}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded text-xs"
            >
              Save
            </button>
            <button
              onClick={() => {
                setAddingFlow(false);
                setFlowForm({ nodeId: '', amount: '' });
              }}
              className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Validation message */}
      {!canSendFlows && !canReceiveFlows && (
        <div className="text-xs text-zinc-500 italic">{getValidationMessage()}</div>
      )}
    </div>
  );
};
