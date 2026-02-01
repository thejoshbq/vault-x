import React from 'react';
import { Plus, Edit2, Trash2, Save, X, GitBranch } from 'lucide-react';
import { FlowSection } from './FlowSection';

const colorClasses = {
  emerald: 'text-green-400',
  red: 'text-red-400',
  amber: 'text-amber-400',
  purple: 'text-purple-400',
  cyan: 'text-cyan-400'
};

export const CategorySection = ({
  category,
  categoryNodes,
  isEditing,
  formData,
  startAdd,
  startEdit,
  handleSave,
  handleDelete,
  setFormData,
  cancelEdit,
  editingNode,
  flows,
  nodes,
  expandedNodeFlows,
  toggleFlows,
  handleFlowCreate,
  handleFlowDelete
}) => {
  const Icon = category.icon;

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/50">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon size={18} className={colorClasses[category.color]} />
          <h3 className="text-sm font-mono font-bold tracking-wider text-green-400">
            [{category.title}]
          </h3>
          <span className="text-xs text-zinc-600 font-mono">
            ({categoryNodes.length})
          </span>
          {categoryNodes.length > 0 && (
            <span className="text-xs text-green-400 font-mono">// ACTIVE</span>
          )}
        </div>
        <button
          onClick={() => startAdd(category)}
          className="text-zinc-500 hover:text-green-400 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {categoryNodes.length > 0 && (
        <div className="p-3">
          {categoryNodes.map((node) => (
            <div key={node.id} className="mb-3 last:mb-0">
              <div className="border border-zinc-800 rounded bg-zinc-950/50">
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-zinc-200 font-medium mb-1">
                        {node.label}
                      </div>
                      <div className="flex gap-3 text-xs">
                        {node.institution && (
                          <span className="text-zinc-500">
                            <span className="text-zinc-600">inst:</span> {node.institution}
                          </span>
                        )}
                        {node.amount > 0 && (
                          <span className="text-green-400">
                            <span className="text-zinc-600">amt:</span> ${node.amount.toFixed(2)}
                          </span>
                        )}
                        {node.balance > 0 && (
                          <span className="text-cyan-400">
                            <span className="text-zinc-600">bal:</span> ${node.balance.toFixed(2)}
                          </span>
                        )}
                        {node.apy > 0 && (
                          <span className="text-purple-400">
                            <span className="text-zinc-600">apy:</span> {node.apy}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleFlows(node.id)}
                        className="text-zinc-400 hover:text-emerald-500 p-1"
                        title="Manage flows"
                      >
                        <GitBranch size={14} />
                      </button>
                      <button
                        onClick={() => startEdit(node, category)}
                        className="text-zinc-400 hover:text-green-400 p-1"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(node.id)}
                        className="text-zinc-400 hover:text-red-400 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Expandable flow section */}
                {expandedNodeFlows[node.id] && (
                  <div className="px-3 pb-2">
                    <FlowSection
                      node={node}
                      flows={flows}
                      nodes={nodes}
                      onFlowCreate={handleFlowCreate}
                      onFlowDelete={handleFlowDelete}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(category); }} className="space-y-3">
            {category.types && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Account Type</label>
                <select
                  value={formData.accountType || 'savings'}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm"
                >
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                </select>
              </div>
            )}
            {category.fields.map((field) => (
              <div key={field}>
                <label className="block text-xs text-zinc-500 mb-1">
                  {category.labels?.[field] || field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type={field === 'amount' || field === 'balance' || field === 'apy' ? 'number' : 'text'}
                  step={field === 'amount' || field === 'balance' || field === 'apy' ? '0.01' : undefined}
                  value={formData[field] || ''}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm"
                  required={field === 'label'}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-2"
              >
                <Save size={14} />
                {editingNode ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm flex items-center gap-2"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
