import React, { useState, useEffect } from 'react';
import { Terminal, Activity, CreditCard, DollarSign, GitBranch, Shield, TrendingUp } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { PageHeader } from './components/PageHeader';
import { SankeyDiagram } from './components/SankeyDiagram';
import { NodeManagement } from './components/NodeManagement';
import { BudgetManager } from './components/BudgetManager';
import FinancialDashboard from './components/FinancialDashboard';
import { api } from './lib/api';

// Navigation Item Component
const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm ${
      active
        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
        : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
    }`}
  >
    <Icon size={16} />
    <span className="font-medium">{label}</span>
  </button>
);

// Dashboard View
const DashboardView = ({ profileId }) => {
  const [nodes, setNodes] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [nodesData, flowsData] = await Promise.all([
        api.get(`/profiles/${profileId}/nodes`),
        api.get(`/profiles/${profileId}/flows`),
      ]);
      setNodes(nodesData || []);
      setFlows(flowsData || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profileId]);

  const totalIncome = nodes
    .filter((n) => n.type === 'income')
    .reduce((sum, n) => sum + (n.amount || 0), 0);

  const totalAssets = nodes
    .filter((n) => ['savings', 'investment'].includes(n.type))
    .reduce((sum, n) => sum + (n.balance || 0), 0);

  const totalExpenses = flows
    .filter((f) => {
      const toNode = nodes.find((n) => n.id === f.to_node_id);
      return toNode && (toNode.type === 'expense' || toNode.type === 'budget');
    })
    .reduce((sum, f) => sum + f.amount, 0);

  const netSurplus = totalIncome - totalExpenses;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Terminal}
        title="DASHBOARD"
        subtitle={`Financial Overview - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Net Income', value: `$${totalIncome.toFixed(2)}`, color: 'green' },
          { label: 'Total Assets', value: `$${totalAssets.toFixed(2)}`, color: 'purple' },
          { label: 'Monthly Expenses', value: `$${totalExpenses.toFixed(2)}`, color: 'amber' },
          { label: 'Net Surplus', value: `$${netSurplus.toFixed(2)}`, color: 'cyan' },
        ].map((metric, i) => (
          <div key={i} className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
              {metric.label}
            </div>
            <div className={`text-xl font-mono ${metric.color === 'green' ? 'text-green-400' : `text-${metric.color}-400`}`}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-zinc-300 font-medium">Cash Flow</h2>
          <span className="text-xs text-zinc-500 font-mono">HOVER FOR DETAILS</span>
        </div>
        <SankeyDiagram nodes={nodes} flows={flows} />
      </div>
    </div>
  );
};

// Manage Items View (Financial Items + Flows)
const ManageItemsView = ({ profileId }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpdate = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <NodeManagement key={`nodes-${refreshKey}`} profileId={profileId} onUpdate={handleUpdate} />
  );
};

// App Shell
const AppShell = () => {
  const { activeProfile } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', icon: Terminal, label: 'Dashboard' },
    { id: 'financial-dashboard', icon: TrendingUp, label: 'Financials' },
    { id: 'items', icon: DollarSign, label: 'Manage Items' },
    { id: 'budgets', icon: CreditCard, label: 'Budgets' },
  ];

  const renderView = () => {
    if (!activeProfile) {
      return (
        <div className="text-center py-12 text-zinc-500">
          Please select or create a profile to continue
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView profileId={activeProfile.id} />;
      case 'financial-dashboard':
        return <FinancialDashboard profileId={activeProfile.id} />;
      case 'items':
        return <ManageItemsView profileId={activeProfile.id} />;
      case 'budgets':
        return <BudgetManager profileId={activeProfile.id} />;
      default:
        return <DashboardView profileId={activeProfile.id} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex">
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-zinc-800 bg-zinc-950/50 p-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-6">
          <div className="w-8 h-8 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-green-400" />
          </div>
          <div>
            <div className="text-zinc-200 font-medium text-sm">VAULT_X</div>
            <div className="text-green-500 text-xs font-mono">v2.0.26</div>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => setActiveView(item.id)}
            />
          ))}
        </nav>

        <div className="pt-4 border-t border-zinc-800">
          <ProfileSwitcher />
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-green-400" />
            <span className="text-zinc-200 font-medium text-sm">VAULT_X</span>
          </div>
          <ProfileSwitcher />
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-xs ${
                activeView === item.id
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'text-zinc-500'
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6 pt-28 lg:pt-6 max-w-5xl mx-auto">{renderView()}</div>
      </main>
    </div>
  );
};

// App Content (handles auth state)
function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <AppShell /> : <AuthScreen />;
}

// Root App Component
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
