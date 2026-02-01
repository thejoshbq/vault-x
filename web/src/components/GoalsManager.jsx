import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Target, DollarSign, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader } from './PageHeader';

export const GoalsManager = ({ profileId }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [contributingTo, setContributingTo] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [expandedGoalId, setExpandedGoalId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    target: 0,
    current: 0,
    deadline: '',
    priority: 1,
  });

  useEffect(() => {
    loadGoals();
  }, [profileId]);

  const loadGoals = async () => {
    try {
      const data = await api.get(`/profiles/${profileId}/goals`);
      // Load transactions for each goal
      const goalsWithTransactions = await Promise.all(
        (data || []).map(async (goal) => {
          try {
            const transactions = await api.get(
              `/profiles/${profileId}/goals/${goal.id}/transactions`
            );
            return { ...goal, transactions: transactions || [] };
          } catch (err) {
            return { ...goal, transactions: [] };
          }
        })
      );
      setGoals(goalsWithTransactions);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingGoal) {
        await api.put(`/profiles/${profileId}/goals/${editingGoal.id}`, formData);
      } else {
        await api.post(`/profiles/${profileId}/goals`, formData);
      }
      await loadGoals();
      setEditingGoal(null);
      setShowAddForm(false);
      setFormData({ name: '', target: 0, current: 0, deadline: '', priority: 1 });
    } catch (err) {
      console.error('Failed to save goal:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.delete(`/profiles/${profileId}/goals/${id}`);
      await loadGoals();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const handleEdit = (goal) => {
    setFormData({
      name: goal.name,
      target: goal.target,
      current: goal.current,
      deadline: goal.deadline || '',
      priority: goal.priority || 1,
    });
    setEditingGoal(goal);
    setShowAddForm(true);
  };

  const handleContribute = async (goalId) => {
    const amount = parseFloat(contributionAmount);
    if (!amount || amount <= 0) return;

    try {
      await api.post(`/profiles/${profileId}/goals/${goalId}/transactions`, {
        amount,
        note: 'Manual contribution',
        date: new Date().toISOString().split('T')[0],
      });
      await loadGoals();
      setContributingTo(null);
      setContributionAmount('');
    } catch (err) {
      console.error('Failed to add contribution:', err);
    }
  };

  const handleDeleteTransaction = async (goalId, txId) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await api.delete(`/profiles/${profileId}/goals/${goalId}/transactions/${txId}`);
      await loadGoals();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  return (
    <div className="relative">
      {/* CRT scan line effect */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          icon={Target}
          title="SAVINGS_GOALS"
          subtitle="Track progress toward your targets"
        />
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingGoal(null);
            setFormData({ name: '', target: 0, current: 0, deadline: '', priority: 1 });
          }}
          className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg text-sm hover:bg-emerald-500/30"
        >
          <Plus size={16} /> Add Goal
        </button>
      </div>

      {showAddForm && (
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
          <h3 className="text-zinc-300 font-medium mb-4">
            {editingGoal ? 'Edit Goal' : 'Add New Goal'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
                Goal Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200"
                placeholder="e.g., Emergency Fund"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
                Target Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.target}
                onChange={(e) =>
                  setFormData({ ...formData, target: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
                Current Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.current}
                onChange={(e) =>
                  setFormData({ ...formData, current: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
                Deadline (optional)
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200"
              >
                <option value={1}>High</option>
                <option value={2}>Medium</option>
                <option value={3}>Low</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 py-2 rounded-lg hover:bg-emerald-500/30"
            >
              <Save size={16} className="inline mr-2" />
              {editingGoal ? 'Update' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingGoal(null);
              }}
              className="px-4 bg-zinc-800 border border-zinc-700 text-zinc-400 py-2 rounded-lg hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {goals.map((goal) => {
          const percentage = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
          const remaining = goal.target - goal.current;

          return (
            <div
              key={goal.id}
              className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Target size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-zinc-200 font-medium">{goal.name}</h3>
                    <p className="text-zinc-500 text-xs">
                      {goal.deadline && `Due: ${new Date(goal.deadline).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setContributingTo(goal.id);
                      setContributionAmount('');
                    }}
                    className="text-emerald-400 hover:text-emerald-300"
                    title="Add contribution"
                  >
                    <DollarSign size={14} />
                  </button>
                  <button
                    onClick={() => handleEdit(goal)}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Progress</span>
                  <span className="text-zinc-300 font-mono">
                    ${goal.current.toFixed(2)} / ${goal.target.toFixed(2)}
                  </span>
                </div>

                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400 font-medium">{percentage.toFixed(1)}%</span>
                  <span className="text-zinc-500">
                    ${remaining.toFixed(2)} remaining
                  </span>
                </div>

                {contributingTo === goal.id && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
                    <input
                      type="number"
                      step="0.01"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      placeholder="Amount"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 font-mono text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleContribute(goal.id)}
                      disabled={!contributionAmount || parseFloat(contributionAmount) <= 0}
                      className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg text-sm hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setContributingTo(null);
                        setContributionAmount('');
                      }}
                      className="text-zinc-400 hover:text-zinc-200 px-2"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Transaction History */}
                {goal.transactions && goal.transactions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <button
                      onClick={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                      className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${expandedGoalId === goal.id ? 'rotate-180' : ''}`}
                      />
                      {goal.transactions.length} transaction{goal.transactions.length !== 1 ? 's' : ''}
                    </button>

                    {expandedGoalId === goal.id && (
                      <div className="mt-2 space-y-1">
                        {goal.transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between text-xs bg-zinc-800/50 rounded px-2 py-1.5"
                          >
                            <div className="flex-1">
                              <div className="text-zinc-300 font-mono">+${tx.amount.toFixed(2)}</div>
                              {tx.note && <div className="text-zinc-500 text-xs">{tx.note}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">
                                {new Date(tx.date).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleDeleteTransaction(goal.id, tx.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          No goals yet. Click "Add Goal" to start tracking your savings targets.
        </div>
      )}
      </div>
    </div>
  );
};
