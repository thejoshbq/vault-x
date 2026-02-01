import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Home, DollarSign, CreditCard, PiggyBank, TrendingUp, Target, Activity, Plus, X, Check, ChevronDown, ChevronRight, Shield, Terminal, User, LogOut, Eye, EyeOff } from 'lucide-react';

// ============================================
// API CLIENT
// ============================================
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
    return fetch(`${API_BASE}${path}`, { ...options, headers });
  }

  async get(path) { const res = await this.request(path); return res.json(); }
  async post(path, data) { return (await this.request(path, { method: 'POST', body: JSON.stringify(data) })).json(); }
  async put(path, data) { return (await this.request(path, { method: 'PUT', body: JSON.stringify(data) })).json(); }
  async delete(path) { await this.request(path, { method: 'DELETE' }); return true; }
}

const api = new ApiClient();

// ============================================
// AUTH CONTEXT
// ============================================
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const storedProfiles = localStorage.getItem('profiles');
    const storedActiveProfile = localStorage.getItem('activeProfile');
    if (stored && api.accessToken) {
      setUser(JSON.parse(stored));
      if (storedProfiles) setProfiles(JSON.parse(storedProfiles));
      if (storedActiveProfile) setActiveProfile(JSON.parse(storedActiveProfile));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error('Invalid credentials');
    const data = await response.json();
    api.setTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    setProfiles(data.profiles);
    const defaultProfile = data.profiles.find(p => p.is_owner) || data.profiles[0];
    setActiveProfile(defaultProfile);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('profiles', JSON.stringify(data.profiles));
    localStorage.setItem('activeProfile', JSON.stringify(defaultProfile));
    return data;
  };

  const register = async (email, password, name) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Registration failed'); }
    const data = await response.json();
    api.setTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    setProfiles(data.profiles);
    setActiveProfile(data.profiles[0]);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('profiles', JSON.stringify(data.profiles));
    localStorage.setItem('activeProfile', JSON.stringify(data.profiles[0]));
    return data;
  };

  const logout = () => {
    api.clearTokens();
    setUser(null); setProfiles([]); setActiveProfile(null);
    localStorage.removeItem('user'); localStorage.removeItem('profiles'); localStorage.removeItem('activeProfile');
  };

  const switchProfile = (profile) => { setActiveProfile(profile); localStorage.setItem('activeProfile', JSON.stringify(profile)); };

  const addProfile = async (name, avatarColor) => {
    const newProfile = await api.post('/profiles', { name, avatar_color: avatarColor });
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('profiles', JSON.stringify(updated));
    return newProfile;
  };

  return (
    <AuthContext.Provider value={{ user, profiles, activeProfile, loading, login, register, logout, switchProfile, addProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// AUTH SCREEN
// ============================================
const AuthScreen = () => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }} />
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
            <Shield size={24} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-zinc-100 font-bold text-xl">BUDGET_SYS</div>
            <div className="text-emerald-500 text-xs font-mono">SECURE FINANCIAL CONTROL</div>
          </div>
        </div>

        <div className="border border-zinc-800 rounded-2xl bg-zinc-900/50 p-6">
          <div className="flex gap-2 mb-6">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${mode === m ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:outline-none focus:border-emerald-500/50" placeholder="Your name" required />
              </div>
            )}
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:outline-none focus:border-emerald-500/50" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 pr-12 text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono" placeholder="••••••••" required minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 py-3 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> : <><Terminal size={18} />{mode === 'login' ? 'Access System' : 'Initialize Account'}</>}
            </button>
          </form>
        </div>
        <p className="text-center text-zinc-600 text-xs mt-6 font-mono">ENCRYPTED • SECURE • LOCAL</p>
      </div>
    </div>
  );
};

// ============================================
// PROFILE SWITCHER
// ============================================
const ProfileSwitcher = () => {
  const { profiles, activeProfile, switchProfile, addProfile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#10b981');
  const colors = ['#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

  const handleAddProfile = async () => {
    if (newName.trim()) { await addProfile(newName, newColor); setNewName(''); setShowAddForm(false); }
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: activeProfile?.avatar_color || '#10b981' }}>
          {activeProfile?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="text-zinc-300 text-sm hidden sm:block">{activeProfile?.name || 'User'}</span>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-2">
              <div className="text-zinc-500 text-xs uppercase tracking-wider px-3 py-2">Profiles</div>
              {profiles.map((profile) => (
                <button key={profile.id} onClick={() => { switchProfile(profile); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeProfile?.id === profile.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800'}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: profile.avatar_color }}>
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-left">{profile.name}</span>
                  {profile.is_owner && <span className="text-xs text-zinc-500">Owner</span>}
                  {activeProfile?.id === profile.id && <Check size={14} className="text-emerald-400" />}
                </button>
              ))}
              {showAddForm ? (
                <div className="p-3 border-t border-zinc-800 mt-2">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Profile name"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 text-sm mb-2 focus:outline-none focus:border-emerald-500/50" autoFocus />
                  <div className="flex gap-1 mb-2">
                    {colors.map((color) => (
                      <button key={color} onClick={() => setNewColor(color)}
                        className={`w-6 h-6 rounded-full ${newColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddProfile} className="flex-1 bg-emerald-500/20 text-emerald-400 py-1.5 rounded-lg text-sm">Add</button>
                    <button onClick={() => { setShowAddForm(false); setNewName(''); }} className="px-3 text-zinc-400 hover:text-zinc-200"><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddForm(true)} className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors mt-1">
                  <Plus size={18} /> Add Profile
                </button>
              )}
            </div>
            <div className="border-t border-zinc-800 p-2">
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// SANKEY DIAGRAM
// ============================================
const SankeyDiagram = ({ nodes, flows }) => {
  const [hoveredFlow, setHoveredFlow] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const width = 800, height = 500, nodeWidth = 120, nodeHeight = 36;
  const padding = { top: 40, right: 40, bottom: 40, left: 40 };
  
  const columns = {
    income: { x: padding.left, nodes: nodes.filter(n => n.type === 'income') },
    account: { x: padding.left + 200, nodes: nodes.filter(n => n.type === 'account') },
    distribution: { x: padding.left + 400, nodes: nodes.filter(n => ['savings', 'investment', 'expense'].includes(n.type)) },
  };
  
  const positionedNodes = {};
  columns.income.nodes.forEach((node, i) => { positionedNodes[node.id] = { ...node, x: columns.income.x, y: padding.top + 80 + i * 80 }; });
  columns.account.nodes.forEach((node, i) => { positionedNodes[node.id] = { ...node, x: columns.account.x, y: padding.top + 100 + i * 100 }; });
  const savingsInvestments = columns.distribution.nodes.filter(n => ['savings', 'investment'].includes(n.type));
  const expenses = columns.distribution.nodes.filter(n => n.type === 'expense');
  savingsInvestments.forEach((node, i) => { positionedNodes[node.id] = { ...node, x: columns.distribution.x, y: padding.top + 20 + i * 50 }; });
  expenses.forEach((node, i) => { positionedNodes[node.id] = { ...node, x: columns.distribution.x, y: padding.top + 220 + i * 45 }; });
  
  const generatePath = (flow) => {
    const fromNode = positionedNodes[flow.from];
    const toNode = positionedNodes[flow.to];
    if (!fromNode || !toNode) return '';
    const x1 = fromNode.x + nodeWidth, y1 = fromNode.y + nodeHeight / 2;
    const x2 = toNode.x, y2 = toNode.y + nodeHeight / 2;
    return `M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`;
  };
  
  const maxFlow = Math.max(...flows.map(f => f.amount), 1);
  const getFlowThickness = (amount) => Math.max(2, (amount / maxFlow) * 20);
  
  const nodeColors = {
    income: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#10b981' },
    account: { bg: 'rgba(14, 165, 233, 0.15)', border: '#0ea5e9', text: '#0ea5e9' },
    savings: { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', text: '#a855f7' },
    investment: { bg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', text: '#ec4899' },
    expense: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b' },
  };

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          {flows.map((flow, i) => {
            const fromNode = positionedNodes[flow.from], toNode = positionedNodes[flow.to];
            if (!fromNode || !toNode) return null;
            return (
              <linearGradient key={i} id={`fg-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={nodeColors[fromNode.type]?.border} stopOpacity="0.6" />
                <stop offset="100%" stopColor={nodeColors[toNode.type]?.border} stopOpacity="0.6" />
              </linearGradient>
            );
          })}
        </defs>
        <g className="opacity-10">
          {[...Array(20)].map((_, i) => <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2={height} stroke="#10b981" strokeWidth="0.5" />)}
          {[...Array(15)].map((_, i) => <line key={`h${i}`} x1="0" y1={i * 40} x2={width} y2={i * 40} stroke="#10b981" strokeWidth="0.5" />)}
        </g>
        <g>
          {flows.map((flow, i) => {
            if (flow.amount === 0) return null;
            const isHovered = hoveredFlow === i || hoveredNode === flow.from || hoveredNode === flow.to;
            return (
              <path key={i} d={generatePath(flow)} fill="none" stroke={`url(#fg-${i})`} strokeWidth={getFlowThickness(flow.amount)} strokeLinecap="round"
                className={`transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-40'}`}
                style={isHovered ? { filter: 'url(#glow)' } : {}}
                onMouseEnter={() => setHoveredFlow(i)} onMouseLeave={() => setHoveredFlow(null)} />
            );
          })}
        </g>
        <g>
          {Object.values(positionedNodes).map((node) => {
            const colors = nodeColors[node.type];
            const isHovered = hoveredNode === node.id;
            return (
              <g key={node.id} onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)} className="cursor-pointer">
                <rect x={node.x} y={node.y} width={nodeWidth} height={nodeHeight} rx="6" fill={colors.bg} stroke={colors.border}
                  strokeWidth={isHovered ? 2 : 1} className="transition-all duration-200" style={isHovered ? { filter: 'url(#glow)' } : {}} />
                <text x={node.x + nodeWidth / 2} y={node.y + nodeHeight / 2 - 4} fill={colors.text} fontSize="11" textAnchor="middle" className="font-medium">{node.label}</text>
                {(node.amount || node.balance) && (
                  <text x={node.x + nodeWidth / 2} y={node.y + nodeHeight / 2 + 10} fill={colors.text} fontSize="10" textAnchor="middle" className="font-mono opacity-70">
                    ${(node.amount || node.balance || 0).toLocaleString()}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        <text x={columns.income.x + nodeWidth/2} y={padding.top} fill="#10b981" fontSize="12" textAnchor="middle" className="font-mono uppercase tracking-wider opacity-60">Income</text>
        <text x={columns.account.x + nodeWidth/2} y={padding.top} fill="#0ea5e9" fontSize="12" textAnchor="middle" className="font-mono uppercase tracking-wider opacity-60">Accounts</text>
        <text x={columns.distribution.x + nodeWidth/2} y={padding.top} fill="#a855f7" fontSize="12" textAnchor="middle" className="font-mono uppercase tracking-wider opacity-60">Distribution</text>
      </svg>
      <div className="flex justify-center gap-6 mt-4 text-xs font-mono">
        {Object.entries(nodeColors).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.border }} />
            <span style={{ color: colors.text }} className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// BUDGET ITEM
// ============================================
const BudgetItem = ({ budget, onAddTransaction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const spent = budget.spent || 0;
  const remaining = budget.budgeted - spent;
  const percentage = budget.budgeted > 0 ? (spent / budget.budgeted) * 100 : 0;
  
  const handleSubmit = () => {
    if (newAmount && parseFloat(newAmount) > 0) {
      onAddTransaction(budget.id, { amount: parseFloat(newAmount), note: newNote });
      setNewAmount(''); setNewNote(''); setShowInput(false);
    }
  };
  
  const getStatusColor = () => percentage >= 100 ? 'text-red-400 border-red-500/30 bg-red-500/10' : percentage >= 80 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  const getBarColor = () => percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className={`border rounded-lg transition-all duration-200 ${isExpanded ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/50'}`}>
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ChevronRight size={14} className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            <span className="text-zinc-200 font-medium">{budget.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${getStatusColor()}`}>{percentage.toFixed(0)}%</span>
            <span className="text-zinc-400 font-mono text-sm">${spent.toFixed(2)} / ${budget.budgeted}</span>
          </div>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-800">
          {!showInput ? (
            <button onClick={(e) => { e.stopPropagation(); setShowInput(true); }}
              className="w-full mt-3 py-2 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors flex items-center justify-center gap-2 text-sm">
              <Plus size={14} /> Add Transaction
            </button>
          ) : (
            <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-zinc-200 font-mono text-sm focus:outline-none focus:border-emerald-500/50" autoFocus />
                </div>
                <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Note"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSubmit} className="flex-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 py-2 rounded-lg text-sm font-medium hover:bg-emerald-500/30 flex items-center justify-center gap-2">
                  <Check size={14} /> Add
                </button>
                <button onClick={() => { setShowInput(false); setNewAmount(''); setNewNote(''); }} className="px-4 bg-zinc-800 border border-zinc-700 text-zinc-400 py-2 rounded-lg text-sm hover:bg-zinc-700">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between text-sm">
            <span className="text-zinc-500">Remaining</span>
            <span className={`font-mono ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>${remaining.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// NAV & SAMPLE DATA
// ============================================
const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick}
    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm ${active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'}`}>
    <Icon size={16} /><span className="font-medium">{label}</span>
  </button>
);

const sampleNodes = [
  { id: 'musc', type: 'income', label: 'MUSC', amount: 3183.61 },
  { id: 'lumberjills', type: 'income', label: "Lumber Jill's", amount: 180.96 },
  { id: 'checking', type: 'account', label: 'Checking' },
  { id: 'robinhood', type: 'account', label: 'Robinhood' },
  { id: 'emergency', type: 'savings', label: 'Emergency Fund', balance: 1195.93 },
  { id: 'roth', type: 'investment', label: 'Roth IRA', balance: 358 },
  { id: 'housing', type: 'expense', label: 'Housing', budgeted: 1600 },
  { id: 'subscriptions', type: 'expense', label: 'Subscriptions', budgeted: 253 },
];

const sampleFlows = [
  { from: 'musc', to: 'checking', amount: 3183.61 },
  { from: 'lumberjills', to: 'checking', amount: 180.96 },
  { from: 'checking', to: 'robinhood', amount: 340 },
  { from: 'robinhood', to: 'roth', amount: 35 },
  { from: 'robinhood', to: 'emergency', amount: 300 },
  { from: 'checking', to: 'housing', amount: 1600 },
  { from: 'checking', to: 'subscriptions', amount: 253 },
];

const sampleBudgets = [
  { id: 1, name: 'Groceries', budgeted: 300, spent: 127.43 },
  { id: 2, name: 'Gas', budgeted: 200, spent: 45.00 },
  { id: 3, name: 'Utilities', budgeted: 250, spent: 0 },
  { id: 4, name: 'Dining Out', budgeted: 100, spent: 67.89 },
];

// ============================================
// VIEWS
// ============================================
const DashboardView = () => {
  const totalIncome = sampleNodes.filter(n => n.type === 'income').reduce((sum, n) => sum + (n.amount || 0), 0);
  const totalAssets = sampleNodes.filter(n => ['savings', 'investment'].includes(n.type)).reduce((sum, n) => sum + (n.balance || 0), 0);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-medium text-zinc-100">Dashboard</h1><p className="text-zinc-500 text-sm mt-0.5 font-mono">January 2026</p></div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />SYSTEM ACTIVE</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{ label: 'Net Income', value: `$${totalIncome.toFixed(2)}`, color: 'emerald' }, { label: 'Total Assets', value: `$${totalAssets.toFixed(2)}`, color: 'purple' }, { label: 'Monthly Burn', value: '$2,963.41', color: 'amber' }, { label: 'Net Surplus', value: '$401.16', color: 'cyan' }].map((m, i) => (
          <div key={i} className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{m.label}</div>
            <div className={`text-xl font-mono text-${m.color}-400`}>{m.value}</div>
          </div>
        ))}
      </div>
      <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-4"><h2 className="text-zinc-300 font-medium">Cash Flow</h2><span className="text-xs text-zinc-500 font-mono">HOVER TO INSPECT</span></div>
        <SankeyDiagram nodes={sampleNodes} flows={sampleFlows} />
      </div>
    </div>
  );
};

const BudgetsView = () => {
  const [budgets, setBudgets] = useState(sampleBudgets);
  const handleAddTransaction = (budgetId, transaction) => {
    setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, spent: b.spent + transaction.amount } : b));
  };
  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-medium text-zinc-100">Budgets</h1><p className="text-zinc-500 text-sm mt-0.5">Track spending against limits</p></div>
      <div className="space-y-3">{budgets.map((b) => <BudgetItem key={b.id} budget={b} onAddTransaction={handleAddTransaction} />)}</div>
    </div>
  );
};

const FlowView = () => (
  <div className="space-y-6">
    <div><h1 className="text-xl font-medium text-zinc-100">Cash Flow</h1><p className="text-zinc-500 text-sm mt-0.5">Interactive money flow diagram</p></div>
    <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50"><SankeyDiagram nodes={sampleNodes} flows={sampleFlows} /></div>
  </div>
);

const GoalsView = () => (
  <div className="space-y-6">
    <div><h1 className="text-xl font-medium text-zinc-100">Goals</h1><p className="text-zinc-500 text-sm mt-0.5">Track savings progress</p></div>
    <div className="text-zinc-500 text-center py-12">Connect to backend for goal tracking</div>
  </div>
);

// ============================================
// APP SHELL
// ============================================
const AppShell = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const navItems = [
    { id: 'dashboard', icon: Terminal, label: 'Dashboard' },
    { id: 'flow', icon: Activity, label: 'Cash Flow' },
    { id: 'budgets', icon: CreditCard, label: 'Budgets' },
    { id: 'goals', icon: Target, label: 'Goals' },
  ];
  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'flow': return <FlowView />;
      case 'budgets': return <BudgetsView />;
      case 'goals': return <GoalsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex">
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }} />
      <aside className="hidden lg:flex flex-col w-56 border-r border-zinc-800 bg-zinc-950/50 p-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-6">
          <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center"><Shield size={16} className="text-emerald-400" /></div>
          <div><div className="text-zinc-200 font-medium text-sm">BUDGET_SYS</div><div className="text-emerald-500 text-xs font-mono">v2.0.26</div></div>
        </div>
        <nav className="space-y-1 flex-1">{navItems.map(item => <NavItem key={item.id} icon={item.icon} label={item.label} active={activeView === item.id} onClick={() => setActiveView(item.id)} />)}</nav>
        <div className="pt-4 border-t border-zinc-800"><ProfileSwitcher /></div>
      </aside>
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2"><Shield size={16} className="text-emerald-400" /><span className="text-zinc-200 font-medium text-sm">BUDGET_SYS</span></div>
          <ProfileSwitcher />
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-xs ${activeView === item.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-500'}`}>
              <item.icon size={14} />{item.label}
            </button>
          ))}
        </div>
      </div>
      <main className="flex-1 overflow-auto"><div className="p-4 lg:p-6 pt-28 lg:pt-6 max-w-5xl mx-auto">{renderView()}</div></main>
    </div>
  );
};

// ============================================
// ROOT
// ============================================
export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
  return <AppShell />;  // For demo; use: isAuthenticated ? <AppShell /> : <AuthScreen />;
}