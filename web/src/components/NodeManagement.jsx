import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, Repeat, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader } from './PageHeader';
import { CategorySection } from './CategorySection';

export const NodeManagement = ({ profileId, onUpdate }) => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [formData, setFormData] = useState({});
  const [flows, setFlows] = useState([]);
  const [expandedNodeFlows, setExpandedNodeFlows] = useState({});

  useEffect(() => {
    loadNodes();
  }, [profileId]);

  const loadNodes = async () => {
    try {
      const data = await api.get(`/profiles/${profileId}/nodes`);
      setNodes(data || []);
    } catch (err) {
      console.error('Failed to load nodes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFlows = async () => {
    try {
      const data = await api.get(`/profiles/${profileId}/flows`);
      setFlows(data || []);
    } catch (error) {
      console.error('Failed to load flows:', error);
    }
  };

  useEffect(() => {
    if (profileId) {
      loadFlows();
    }
  }, [profileId]);

  const categories = [
    {
      id: 'income',
      title: 'INCOME_SOURCES',
      icon: TrendingUp,
      type: 'income',
      color: 'emerald',
      fields: ['label', 'institution', 'amount'],
      labels: { amount: 'Monthly Amount', institution: 'Employer' }
    },
    {
      id: 'fixed-expenses',
      title: 'FIXED_EXPENSES',
      icon: CreditCard,
      type: 'expense',
      color: 'red',
      fields: ['label', 'amount'],
      labels: { amount: 'Monthly Cost' }
    },
    {
      id: 'subscriptions',
      title: 'SUBSCRIPTIONS',
      icon: Repeat,
      type: 'expense',
      color: 'amber',
      fields: ['label', 'amount', 'institution'],
      labels: { amount: 'Monthly Cost', institution: 'Service Provider' },
      metadata: { subscription: true }
    },
    {
      id: 'budgets',
      title: 'BUDGETED_EXPENSES',
      icon: Wallet,
      type: 'budget',
      color: 'purple',
      fields: ['label', 'amount'],
      labels: { amount: 'Monthly Budget' }
    },
    {
      id: 'assets',
      title: 'ASSETS_PORTFOLIO',
      icon: DollarSign,
      types: ['account', 'savings', 'investment'],
      color: 'cyan',
      fields: ['label', 'institution', 'balance', 'apy'],
      labels: { balance: 'Current Balance', institution: 'Financial Institution', apy: 'APY %' }
    }
  ];

  const handleSave = async (category) => {
    try {
      const payload = {
        type: category.types ? formData.accountType || 'savings' : category.type,
        label: formData.label,
        institution: formData.institution || '',
        amount: parseFloat(formData.amount) || 0,
        balance: parseFloat(formData.balance) || 0,
        apy: parseFloat(formData.apy) || 0,
        metadata: JSON.stringify(category.metadata || {})
      };

      if (editingNode) {
        await api.put(`/profiles/${profileId}/nodes/${editingNode.id}`, payload);
      } else {
        const result = await api.post(`/profiles/${profileId}/nodes`, payload);

        if (!result.id || result.id === 0) {
          throw new Error('Failed to create node: invalid node ID received');
        }

        // If creating a budget type node, also create a budget entry
        if (payload.type === 'budget') {
          await api.post(`/profiles/${profileId}/budgets`, {
            node_id: result.id,
            name: payload.label,
            budgeted: payload.amount,
            period: 'monthly',
          });
        }
      }

      await loadNodes();
      setActiveCategory(null);
      setEditingNode(null);
      setFormData({});
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  const handleDelete = async (nodeId) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/profiles/${profileId}/nodes/${nodeId}`);
      await loadNodes();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const startEdit = (node, category) => {
    setEditingNode(node);
    setActiveCategory(category.id);
    setFormData({
      label: node.label,
      institution: node.institution || '',
      amount: node.amount || 0,
      balance: node.balance || 0,
      apy: node.apy || 0,
      accountType: node.type
    });
  };

  const startAdd = (category) => {
    setActiveCategory(category.id);
    setEditingNode(null);
    setFormData({
      label: '',
      institution: '',
      amount: 0,
      balance: 0,
      apy: 0,
      accountType: category.types ? category.types[0] : category.type
    });
  };

  const cancelEdit = () => {
    setActiveCategory(null);
    setEditingNode(null);
    setFormData({});
  };

  const getNodesForCategory = (category) => {
    if (category.types) {
      return nodes.filter(n => category.types.includes(n.type));
    }
    if (category.metadata?.subscription) {
      return nodes.filter(n => {
        if (n.type !== 'expense') return false;
        try {
          const meta = JSON.parse(n.metadata || '{}');
          return meta.subscription === true;
        } catch {
          return false;
        }
      });
    }
    return nodes.filter(n => {
      if (n.type !== category.type) return false;
      try {
        const meta = JSON.parse(n.metadata || '{}');
        return !meta.subscription;
      } catch {
        return !n.metadata?.includes('subscription');
      }
    });
  };

  const handleFlowCreate = async (flowData) => {
    try {
      await api.post(`/profiles/${profileId}/flows`, flowData);
      await loadFlows();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to create flow:', error);
    }
  };

  const handleFlowDelete = async (flowId) => {
    try {
      await api.delete(`/profiles/${profileId}/flows/${flowId}`);
      await loadFlows();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete flow:', error);
    }
  };

  const toggleFlows = (nodeId) => {
    setExpandedNodeFlows(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
      </div>
    );
  }

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
        <PageHeader
          icon={DollarSign}
          title="MANAGE_ITEMS"
          subtitle="Configure income, expenses, assets, and budget categories"
        />

        <div className="text-xs font-mono text-cyan-400 mb-2 tracking-wider">
          // FINANCIAL_ITEMS
        </div>

        <div className="grid gap-4">
          {categories.map(category => (
            <CategorySection
              key={category.id}
              category={category}
              categoryNodes={getNodesForCategory(category)}
              isEditing={activeCategory === category.id}
              formData={formData}
              startAdd={startAdd}
              startEdit={startEdit}
              handleSave={handleSave}
              handleDelete={handleDelete}
              setFormData={setFormData}
              cancelEdit={cancelEdit}
              editingNode={editingNode}
              flows={flows}
              nodes={nodes}
              expandedNodeFlows={expandedNodeFlows}
              toggleFlows={toggleFlows}
              handleFlowCreate={handleFlowCreate}
              handleFlowDelete={handleFlowDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
