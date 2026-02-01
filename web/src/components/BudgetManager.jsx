import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, Trash2, Check, X, CreditCard } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader } from './PageHeader';

export const BudgetManager = ({ profileId }) => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgets();
  }, [profileId]);

  const loadBudgets = async () => {
    try {
      const data = await api.get(`/profiles/${profileId}/budgets`);
      // Load transactions for each budget
      const budgetsWithTransactions = await Promise.all(
        (data || []).map(async (budget) => {
          try {
            const transactions = await api.get(
              `/profiles/${profileId}/budgets/${budget.id}/transactions`
            );
            const spent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
            return { ...budget, transactions, spent };
          } catch (err) {
            return { ...budget, transactions: [], spent: 0 };
          }
        })
      );
      setBudgets(budgetsWithTransactions);
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    if (!confirm('Delete this budget and all its transactions?')) return;
    try {
      await api.delete(`/profiles/${profileId}/budgets/${budgetId}`);
      await loadBudgets();
    } catch (err) {
      console.error('Failed to delete budget:', err);
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

      <div className="space-y-4">
      <PageHeader
        icon={CreditCard}
        title="BUDGETS"
        subtitle="Track spending and manage transactions"
      />

      <div className="text-xs font-mono text-cyan-400 mb-3 tracking-wider">
        // BUDGET_TRACKING
      </div>

      {budgets.map((budget) => (
        <BudgetItem
          key={budget.id}
          budget={budget}
          profileId={profileId}
          onUpdate={loadBudgets}
          onDelete={handleDeleteBudget}
        />
      ))}

      {budgets.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p>No budgets yet.</p>
          <p className="text-xs mt-2">Create budgets by adding expense items in "Manage Items"</p>
        </div>
      )}
      </div>
    </div>
  );
};

const BudgetItem = ({ budget, profileId, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');

  const spent = budget.spent || 0;
  const remaining = budget.budgeted - spent;
  const percentage = budget.budgeted > 0 ? (spent / budget.budgeted) * 100 : 0;

  const handleAddTransaction = async () => {
    if (newAmount && parseFloat(newAmount) > 0) {
      try {
        await api.post(
          `/profiles/${profileId}/budgets/${budget.id}/transactions`,
          {
            amount: parseFloat(newAmount),
            note: newNote,
            date: new Date().toISOString().split('T')[0],
          }
        );
        setNewAmount('');
        setNewNote('');
        setShowInput(false);
        await onUpdate();
      } catch (err) {
        console.error('Failed to add transaction:', err);
      }
    }
  };

  const handleDeleteTransaction = async (txId) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await api.delete(
        `/profiles/${profileId}/budgets/${budget.id}/transactions/${txId}`
      );
      await onUpdate();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const getStatusColor = () =>
    percentage >= 100
      ? 'text-red-400 border-red-500/30 bg-red-500/10'
      : percentage >= 80
      ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      : 'text-green-400 border-green-500/30 bg-green-500/10';

  const getBarColor = () =>
    percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div
      className={`border rounded-lg transition-all duration-200 ${
        isExpanded
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-zinc-800 bg-zinc-900/50'
      }`}
    >
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ChevronRight
              size={14}
              className={`text-zinc-500 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
            <span className="font-mono text-sm text-green-400">[{budget.name.toUpperCase()}]</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${getStatusColor()}`}>
              {percentage.toFixed(0)}%
            </span>
            {percentage >= 100 && (
              <span className="text-xs font-mono text-red-400 ml-2">// EXCEEDED</span>
            )}
            {percentage >= 80 && percentage < 100 && (
              <span className="text-xs font-mono text-amber-400 ml-2">// WARNING</span>
            )}
            {percentage < 80 && (
              <span className="text-xs font-mono text-green-400 ml-2">// NOMINAL</span>
            )}
            <span className="text-zinc-400 font-mono text-sm">
              ${spent.toFixed(2)} / ${budget.budgeted}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(budget.id);
              }}
              className="text-red-400 hover:text-red-300 ml-2"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden shadow-md">
          <div
            className={`h-full rounded-full transition-all duration-500 shadow-lg ${getBarColor()} ${
              spent > budget.budgeted ? 'shadow-red-500/50' : 'shadow-green-500/50'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-800">
          <div className="text-xs font-mono text-amber-400 mt-3 mb-2 tracking-wider">
            // NEW_TRANSACTION
          </div>
          {!showInput ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInput(true);
              }}
              className="w-full mt-3 py-2 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:border-green-500/50 hover:text-green-400 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={14} /> Add Transaction
            </button>
          ) : (
            <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-zinc-200 font-mono text-sm focus:outline-none focus:border-green-500/50"
                    autoFocus
                  />
                </div>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Note"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 text-sm focus:outline-none focus:border-green-500/50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddTransaction}
                  className="flex-1 bg-green-500/20 border border-green-500/30 text-green-400 py-2 rounded-lg text-sm font-medium hover:bg-green-500/30 flex items-center justify-center gap-2"
                >
                  <Check size={14} /> Add
                </button>
                <button
                  onClick={() => {
                    setShowInput(false);
                    setNewAmount('');
                    setNewNote('');
                  }}
                  className="px-4 bg-zinc-800 border border-zinc-700 text-zinc-400 py-2 rounded-lg text-sm hover:bg-zinc-700"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {budget.transactions && budget.transactions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <h4 className="text-zinc-400 text-xs uppercase tracking-wider mb-2">
                Transaction History
              </h4>
              <div className="space-y-2">
                {budget.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="text-zinc-300 text-sm">{tx.note || 'No note'}</div>
                      <div className="text-zinc-500 text-xs">
                        {new Date(tx.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-200 font-mono text-sm">
                        ${tx.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between text-sm">
            <span className="text-zinc-500">Remaining</span>
            <span className={`font-mono ${remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
              ${remaining.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
