import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, CreditCard, Activity, ChevronRight, ChevronDown, Shield, Zap, AlertTriangle, Check, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader } from './PageHeader';

// ============================================
// MATRIX FINANCIAL DASHBOARD
// Hacker-themed financial statements UI
// ============================================

// Animated number counter
const AnimatedNumber = ({ value, prefix = '$', decimals = 2, duration = 1000 }) => {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    const start = display;
    const end = value;
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      
      if (progress < 1) requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return <span>{prefix}{display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>;
};

// Glowing status indicator
const StatusIndicator = ({ status, label }) => {
  const colors = {
    positive: 'bg-green-500 shadow-green-500/50',
    negative: 'bg-red-500 shadow-red-500/50',
    neutral: 'bg-cyan-500 shadow-cyan-500/50',
    warning: 'bg-amber-500 shadow-amber-500/50',
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[status]} shadow-lg animate-pulse`} />
      <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
  );
};

// Section header with terminal styling
const SectionHeader = ({ title, subtitle, status, icon: Icon }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-8 h-8 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-center">
          <Icon size={16} className="text-green-400" />
        </div>
      )}
      <div>
        <h2 className="text-green-400 font-mono text-sm tracking-wider">[{title}]</h2>
        {subtitle && <p className="text-zinc-500 text-xs font-mono">{subtitle}</p>}
      </div>
    </div>
    {status && <StatusIndicator {...status} />}
  </div>
);

// Expandable line item row
const LineItem = ({ label, value, indent = 0, highlight = false, expandable = false, children, trend, note }) => {
  const [expanded, setExpanded] = useState(false);
  
  const isPositive = value > 0;
  const isNegative = value < 0;
  
  return (
    <div>
      <div 
        className={`flex items-center justify-between py-2 px-3 rounded transition-colors ${
          highlight ? 'bg-green-500/10 border border-green-500/20' : 'hover:bg-zinc-800/30'
        } ${expandable ? 'cursor-pointer' : ''}`}
        style={{ paddingLeft: `${12 + indent * 16}px` }}
        onClick={() => expandable && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expandable && (
            <ChevronRight size={14} className={`text-zinc-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          )}
          <span className={`font-mono text-sm ${highlight ? 'text-green-400 font-bold' : 'text-zinc-300'}`}>
            {label}
          </span>
          {note && (
            <span className="text-zinc-600 text-xs font-mono">// {note}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-mono ${
              trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-zinc-500'
            }`}>
              {trend > 0 ? <ArrowUpRight size={12} /> : trend < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
              {Math.abs(trend)}%
            </div>
          )}
          <span className={`font-mono text-sm tabular-nums ${
            highlight ? 'text-green-400 font-bold' : 
            isNegative ? 'text-red-400' : 
            isPositive && !highlight ? 'text-zinc-200' : 'text-zinc-400'
          }`}>
            {isNegative ? '-' : ''}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      {expanded && children && (
        <div className="border-l border-green-500/20 ml-6 mt-1 mb-2">
          {children}
        </div>
      )}
    </div>
  );
};

// Divider with optional label
const Divider = ({ label }) => (
  <div className="flex items-center gap-3 my-3">
    <div className="flex-1 h-px bg-gradient-to-r from-green-500/30 to-transparent" />
    {label && <span className="text-green-500/50 text-xs font-mono">{label}</span>}
    <div className="flex-1 h-px bg-gradient-to-l from-green-500/30 to-transparent" />
  </div>
);

// Progress bar for ratios
const RatioBar = ({ label, value, max = 100, format = 'percent', thresholds }) => {
  const percentage = (value / max) * 100;
  
  let color = 'bg-green-500';
  if (thresholds) {
    if (value > thresholds.danger) color = 'bg-red-500';
    else if (value > thresholds.warning) color = 'bg-amber-500';
  }
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300">
          {format === 'percent' ? `${value.toFixed(1)}%` : value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

// ============================================
// INCOME STATEMENT COMPONENT
// ============================================
const IncomeStatement = ({ data, period = 'Monthly' }) => {
  const totalIncome = data.income.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = data.expenses.fixed.reduce((sum, item) => sum + item.amount, 0) +
                        data.expenses.variable.reduce((sum, item) => sum + item.amount, 0) +
                        data.expenses.subscriptions.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalIncome - totalExpenses;
  const savingsRate = (netIncome / totalIncome) * 100;
  
  return (
    <div className="bg-black border border-green-500/30 rounded-xl p-5 overflow-hidden relative">
      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent animate-scan" />
      </div>
      
      <SectionHeader 
        title="INCOME_STATEMENT" 
        subtitle={`${period} P&L Analysis`}
        status={{ status: netIncome > 0 ? 'positive' : 'negative', label: netIncome > 0 ? 'SURPLUS' : 'DEFICIT' }}
        icon={TrendingUp}
      />
      
      {/* Revenue Section */}
      <div className="mb-4">
        <div className="text-xs font-mono text-cyan-400 mb-2 tracking-wider">// REVENUE</div>
        {data.income.map((item, i) => (
          <LineItem 
            key={i} 
            label={item.name} 
            value={item.amount} 
            trend={item.trend}
            note={item.type}
          />
        ))}
        <LineItem label="TOTAL REVENUE" value={totalIncome} highlight />
      </div>
      
      <Divider />
      
      {/* Expenses Section */}
      <div className="mb-4">
        <div className="text-xs font-mono text-amber-400 mb-2 tracking-wider">// EXPENSES</div>
        
        <LineItem label="Fixed Costs" value={data.expenses.fixed.reduce((s, i) => s + i.amount, 0)} expandable>
          {data.expenses.fixed.map((item, i) => (
            <LineItem key={i} label={item.name} value={item.amount} indent={1} />
          ))}
        </LineItem>
        
        <LineItem label="Variable Costs" value={data.expenses.variable.reduce((s, i) => s + i.amount, 0)} expandable>
          {data.expenses.variable.map((item, i) => (
            <LineItem key={i} label={item.name} value={item.amount} indent={1} />
          ))}
        </LineItem>
        
        <LineItem label="Subscriptions" value={data.expenses.subscriptions.reduce((s, i) => s + i.amount, 0)} expandable>
          {data.expenses.subscriptions.map((item, i) => (
            <LineItem 
              key={i} 
              label={item.name} 
              value={item.amount} 
              indent={1}
              note={item.flag === 'cancel' ? '⚠ CANCEL' : null}
            />
          ))}
        </LineItem>
        
        <LineItem label="TOTAL EXPENSES" value={-totalExpenses} highlight />
      </div>
      
      <Divider label="NET" />
      
      {/* Net Income */}
      <div className={`p-4 rounded-lg border ${netIncome > 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-zinc-500 mb-1">NET INCOME</div>
            <div className={`text-2xl font-mono font-bold ${netIncome > 0 ? 'text-green-400' : 'text-red-400'}`}>
              <AnimatedNumber value={netIncome} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-zinc-500 mb-1">SAVINGS RATE</div>
            <div className={`text-xl font-mono font-bold ${savingsRate > 20 ? 'text-green-400' : savingsRate > 10 ? 'text-amber-400' : 'text-red-400'}`}>
              {savingsRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
      `}</style>
    </div>
  );
};

// ============================================
// BALANCE SHEET COMPONENT
// ============================================
const BalanceSheet = ({ data }) => {
  const totalAssets = data.assets.reduce((sum, item) => sum + item.balance, 0);
  const totalLiabilities = data.liabilities.reduce((sum, item) => sum + item.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  
  return (
    <div className="bg-black border border-cyan-500/30 rounded-xl p-5 overflow-hidden relative">
      <SectionHeader 
        title="BALANCE_SHEET" 
        subtitle="Assets & Liabilities"
        status={{ status: 'neutral', label: 'SNAPSHOT' }}
        icon={PiggyBank}
      />
      
      {/* Assets */}
      <div className="mb-4">
        <div className="text-xs font-mono text-green-400 mb-2 tracking-wider">// ASSETS</div>
        
        {/* Group assets by type */}
        {['Cash', 'Savings', 'Investment', 'Retirement'].map(type => {
          const items = data.assets.filter(a => a.type === type);
          if (items.length === 0) return null;
          
          return (
            <LineItem 
              key={type} 
              label={type} 
              value={items.reduce((s, i) => s + i.balance, 0)} 
              expandable
            >
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-3 hover:bg-zinc-800/30 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-sm font-mono">{item.name}</span>
                    {item.apy > 0 && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono">
                        {item.apy}% APY
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-300 font-mono text-sm">
                    ${item.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </LineItem>
          );
        })}
        
        <LineItem label="TOTAL ASSETS" value={totalAssets} highlight />
      </div>
      
      <Divider />
      
      {/* Liabilities */}
      <div className="mb-4">
        <div className="text-xs font-mono text-red-400 mb-2 tracking-wider">// LIABILITIES</div>
        
        {data.liabilities.length > 0 ? (
          <>
            {data.liabilities.map((item, i) => (
              <LineItem 
                key={i} 
                label={item.name} 
                value={-item.balance}
                note={item.apr ? `${item.apr}% APR` : null}
              />
            ))}
            <LineItem label="TOTAL LIABILITIES" value={-totalLiabilities} highlight />
          </>
        ) : (
          <div className="flex items-center gap-2 py-2 px-3 text-green-400">
            <Check size={14} />
            <span className="font-mono text-sm">NO OUTSTANDING LIABILITIES</span>
          </div>
        )}
      </div>
      
      <Divider label="EQUITY" />
      
      {/* Net Worth */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-zinc-500 mb-1">NET WORTH</div>
            <div className="text-3xl font-mono font-bold text-cyan-400">
              <AnimatedNumber value={netWorth} />
            </div>
          </div>
          <div className="w-20 h-20 relative">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#27272a" strokeWidth="2" />
              <circle 
                cx="18" cy="18" r="16" fill="none" 
                stroke="url(#netWorthGradient)" 
                strokeWidth="2"
                strokeDasharray={`${(totalAssets / (totalAssets + totalLiabilities)) * 100} 100`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="netWorthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono text-zinc-400">
                {((totalAssets / (totalAssets + totalLiabilities || 1)) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CASH FLOW STATEMENT COMPONENT
// ============================================
const CashFlowStatement = ({ data }) => {
  const operatingCF = data.operating.inflowTotal - data.operating.outflowTotal;
  const investingCF = data.investing.inflowTotal - data.investing.outflowTotal;
  const financingCF = data.financing.inflowTotal - data.financing.outflowTotal;
  const netCF = operatingCF + investingCF + financingCF;
  
  const CFSection = ({ title, inflows, outflows, details, color }) => {
    const net = inflows - outflows;
    return (
      <div className="mb-4">
        <div className={`text-xs font-mono mb-2 tracking-wider`} style={{ color }}>{title}</div>
        <LineItem label="Inflows" value={inflows} expandable>
          {details.inflows.map((item, i) => (
            <LineItem key={i} label={item.name} value={item.amount} indent={1} />
          ))}
        </LineItem>
        <LineItem label="Outflows" value={-outflows} expandable>
          {details.outflows.map((item, i) => (
            <LineItem key={i} label={item.name} value={-item.amount} indent={1} />
          ))}
        </LineItem>
        <div className={`flex justify-between items-center py-2 px-3 rounded mt-1 ${net >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <span className="font-mono text-sm text-zinc-400">Net</span>
          <span className={`font-mono text-sm font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {net >= 0 ? '+' : ''}{net.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-black border border-purple-500/30 rounded-xl p-5">
      <SectionHeader 
        title="CASH_FLOW" 
        subtitle="Money Movement Analysis"
        status={{ status: netCF > 0 ? 'positive' : 'warning', label: netCF > 0 ? 'POSITIVE FLOW' : 'NEGATIVE FLOW' }}
        icon={Activity}
      />
      
      <CFSection
        title="// OPERATING ACTIVITIES"
        inflows={data.operating.inflowTotal}
        outflows={data.operating.outflowTotal}
        details={data.operating}
        color="#22c55e"
      />

      <Divider />

      <CFSection
        title="// INVESTING ACTIVITIES"
        inflows={data.investing.inflowTotal}
        outflows={data.investing.outflowTotal}
        details={data.investing}
        color="#a855f7"
      />

      <Divider />

      <CFSection
        title="// FINANCING ACTIVITIES"
        inflows={data.financing.inflowTotal}
        outflows={data.financing.outflowTotal}
        details={data.financing}
        color="#f59e0b"
      />
      
      <Divider label="NET CHANGE" />
      
      {/* Net Cash Flow */}
      <div className={`p-4 rounded-lg border ${netCF >= 0 ? 'bg-purple-500/10 border-purple-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-zinc-500 mb-1">NET CASH FLOW</div>
            <div className={`text-2xl font-mono font-bold ${netCF >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
              {netCF >= 0 ? '+' : ''}<AnimatedNumber value={netCF} />
            </div>
          </div>
          <div className="flex gap-4 text-xs font-mono">
            <div className="text-center">
              <div className="text-green-400">{operatingCF >= 0 ? '+' : ''}{operatingCF.toFixed(0)}</div>
              <div className="text-zinc-500">OPS</div>
            </div>
            <div className="text-center">
              <div className="text-purple-400">{investingCF >= 0 ? '+' : ''}{investingCF.toFixed(0)}</div>
              <div className="text-zinc-500">INV</div>
            </div>
            <div className="text-center">
              <div className="text-amber-400">{financingCF >= 0 ? '+' : ''}{financingCF.toFixed(0)}</div>
              <div className="text-zinc-500">FIN</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// FINANCIAL RATIOS PANEL
// ============================================
const FinancialRatios = ({ data }) => {
  const totalIncome = data.income.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = data.expenses.fixed.reduce((s, i) => s + i.amount, 0) +
                        data.expenses.variable.reduce((s, i) => s + i.amount, 0) +
                        data.expenses.subscriptions.reduce((s, i) => s + i.amount, 0);
  const totalAssets = data.assets.reduce((sum, item) => sum + item.balance, 0);
  const totalLiabilities = data.liabilities.reduce((sum, item) => sum + item.balance, 0);
  const netIncome = totalIncome - totalExpenses;
  
  const savingsRate = (netIncome / totalIncome) * 100;
  const expenseRatio = (totalExpenses / totalIncome) * 100;
  const debtToAsset = totalLiabilities > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const liquidityRatio = data.assets.filter(a => a.type === 'Cash' || a.type === 'Savings').reduce((s, a) => s + a.balance, 0) / (totalExpenses || 1);
  
  return (
    <div className="bg-black border border-zinc-700 rounded-xl p-5">
      <SectionHeader 
        title="FINANCIAL_RATIOS" 
        subtitle="Key Performance Indicators"
        icon={Zap}
      />
      
      <div className="space-y-4">
        <RatioBar 
          label="Savings Rate" 
          value={savingsRate} 
          thresholds={{ warning: 10, danger: 5 }}
        />
        <RatioBar 
          label="Expense Ratio" 
          value={expenseRatio} 
          thresholds={{ warning: 80, danger: 95 }}
        />
        <RatioBar 
          label="Debt-to-Asset" 
          value={debtToAsset} 
          thresholds={{ warning: 30, danger: 50 }}
        />
        
        <Divider />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <div className="text-zinc-500 text-xs font-mono mb-1">LIQUIDITY RATIO</div>
            <div className={`text-xl font-mono font-bold ${liquidityRatio >= 3 ? 'text-green-400' : liquidityRatio >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
              {liquidityRatio.toFixed(1)}x
            </div>
            <div className="text-zinc-600 text-xs font-mono">months runway</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <div className="text-zinc-500 text-xs font-mono mb-1">MONTHLY BURN</div>
            <div className="text-xl font-mono font-bold text-amber-400">
              ${totalExpenses.toLocaleString()}
            </div>
            <div className="text-zinc-600 text-xs font-mono">per month</div>
          </div>
        </div>
        
        {/* Health Score */}
        <div className="bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-purple-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-zinc-500 mb-1">FINANCIAL HEALTH SCORE</div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-mono font-bold text-green-400">
                  {Math.min(100, Math.round(savingsRate * 2 + (100 - expenseRatio) * 0.5 + (100 - debtToAsset) * 0.3))}
                </span>
                <span className="text-zinc-500 font-mono">/100</span>
              </div>
            </div>
            <Shield size={32} className="text-green-500/50" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ALERTS & INSIGHTS PANEL
// ============================================
const AlertsPanel = ({ data }) => {
  const alerts = [];
  
  // Check for subscriptions flagged for cancellation
  const cancelSubs = data.expenses.subscriptions.filter(s => s.flag === 'cancel');
  if (cancelSubs.length > 0) {
    alerts.push({
      type: 'warning',
      title: 'Subscriptions to Cancel',
      message: `${cancelSubs.length} subscription(s) flagged: ${cancelSubs.map(s => s.name).join(', ')}`,
      savings: cancelSubs.reduce((s, c) => s + c.amount, 0)
    });
  }
  
  // Check savings rate
  const totalIncome = data.income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = data.expenses.fixed.reduce((s, i) => s + i.amount, 0) +
                        data.expenses.variable.reduce((s, i) => s + i.amount, 0) +
                        data.expenses.subscriptions.reduce((s, i) => s + i.amount, 0);
  const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
  
  if (savingsRate < 10) {
    alerts.push({
      type: 'danger',
      title: 'Low Savings Rate',
      message: `Current rate: ${savingsRate.toFixed(1)}%. Target: >20%`
    });
  }
  
  // Check emergency fund
  const emergencyFund = data.assets.find(a => a.name.toLowerCase().includes('emergency'));
  if (emergencyFund && emergencyFund.goal) {
    const progress = (emergencyFund.balance / emergencyFund.goal) * 100;
    if (progress < 100) {
      alerts.push({
        type: 'info',
        title: 'Emergency Fund Progress',
        message: `${progress.toFixed(0)}% of $${emergencyFund.goal.toLocaleString()} goal`
      });
    }
  }
  
  const typeStyles = {
    danger: 'border-red-500/30 bg-red-500/10',
    warning: 'border-amber-500/30 bg-amber-500/10',
    info: 'border-cyan-500/30 bg-cyan-500/10',
    success: 'border-green-500/30 bg-green-500/10',
  };
  
  const typeIcons = {
    danger: <AlertTriangle size={16} className="text-red-400" />,
    warning: <AlertTriangle size={16} className="text-amber-400" />,
    info: <Activity size={16} className="text-cyan-400" />,
    success: <Check size={16} className="text-green-400" />,
  };

  return (
    <div className="bg-black border border-zinc-700 rounded-xl p-5">
      <SectionHeader 
        title="SYSTEM_ALERTS" 
        subtitle="Automated Insights"
        icon={AlertTriangle}
      />
      
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <div key={i} className={`border rounded-lg p-3 ${typeStyles[alert.type]}`}>
              <div className="flex items-start gap-3">
                {typeIcons[alert.type]}
                <div className="flex-1">
                  <div className="font-mono text-sm text-zinc-200">{alert.title}</div>
                  <div className="font-mono text-xs text-zinc-400 mt-0.5">{alert.message}</div>
                  {alert.savings && (
                    <div className="font-mono text-xs text-green-400 mt-1">
                      Potential savings: ${alert.savings.toFixed(2)}/mo
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-4 text-green-400">
          <Check size={16} />
          <span className="font-mono text-sm">ALL SYSTEMS NOMINAL</span>
        </div>
      )}
    </div>
  );
};

// ============================================
// DATA TRANSFORMATION UTILITIES
// ============================================
const transformNodesToFinancialData = (nodes, flows) => {
  // Group nodes by type
  const incomeNodes = nodes.filter(n => n.type === 'income');
  const expenseNodes = nodes.filter(n => n.type === 'expense');
  const assetNodes = nodes.filter(n => ['savings', 'investment'].includes(n.type));

  // Transform income (trend set to 0 as per user decision)
  const income = incomeNodes.map(node => ({
    name: node.label,
    amount: node.amount || 0,
    type: node.institution || 'Income',
    trend: 0
  }));

  // Categorize expenses based on metadata
  const expenses = {
    fixed: [],
    variable: [],
    subscriptions: []
  };

  expenseNodes.forEach(node => {
    let metadata = {};
    try {
      metadata = JSON.parse(node.metadata || '{}');
    } catch (e) {
      metadata = {};
    }

    const expenseItem = { name: node.label, amount: node.amount || 0 };

    if (metadata.subscription === true) {
      // Subscription expense
      if (metadata.flag === 'cancel') {
        expenseItem.flag = 'cancel';
      }
      expenses.subscriptions.push(expenseItem);
    } else if (metadata.budgeted) {
      // Variable/budgeted expense
      expenses.variable.push({
        ...expenseItem,
        budgeted: metadata.budgeted
      });
    } else {
      // Fixed expense (default)
      expenses.fixed.push(expenseItem);
    }
  });

  // Transform assets
  const assets = assetNodes.map(node => {
    let metadata = {};
    try {
      metadata = JSON.parse(node.metadata || '{}');
    } catch (e) {
      metadata = {};
    }

    const asset = {
      name: node.label,
      balance: node.balance || 0,
      type: node.type === 'savings' ? 'Savings' : 'Investment',
      apy: node.apy || 0
    };

    if (metadata.goal) {
      asset.goal = metadata.goal;
    }

    return asset;
  });

  // Transform cash flows
  const cashFlow = {
    operating: { inflowTotal: 0, outflowTotal: 0, inflows: [], outflows: [] },
    investing: { inflowTotal: 0, outflowTotal: 0, inflows: [], outflows: [] },
    financing: { inflowTotal: 0, outflowTotal: 0, inflows: [], outflows: [] }
  };

  flows.forEach(flow => {
    const fromNode = nodes.find(n => n.id === flow.from_node_id);
    const toNode = nodes.find(n => n.id === flow.to_node_id);

    if (!fromNode || !toNode) return;

    // Categorize flow
    let category = 'operating';
    if (['savings', 'investment'].includes(toNode.type) ||
        ['savings', 'investment'].includes(fromNode.type)) {
      category = 'investing';
    }

    // Add to appropriate category
    if (fromNode.type === 'income') {
      cashFlow[category].inflows.push({
        name: `${fromNode.label} → ${toNode.label}`,
        amount: flow.amount
      });
      cashFlow[category].inflowTotal += flow.amount;
    } else {
      cashFlow[category].outflows.push({
        name: `${fromNode.label} → ${toNode.label}`,
        amount: flow.amount
      });
      cashFlow[category].outflowTotal += flow.amount;
    }
  });

  return {
    income,
    expenses,
    assets,
    liabilities: [], // No liability nodes yet
    cashFlow
  };
};

// ============================================
// SAMPLE DATA
// ============================================
const sampleData = {
  income: [
    { name: 'MUSC Salary', amount: 3183.61, type: 'W2', trend: 2.5 },
    { name: "Lumber Jill's", amount: 180.96, type: 'Side Income', trend: 0 },
  ],
  expenses: {
    fixed: [
      { name: 'Rent', amount: 1600 },
      { name: 'Auto Insurance', amount: 160 },
      { name: 'Cellular', amount: 200 },
    ],
    variable: [
      { name: 'Groceries', amount: 280, budgeted: 300 },
      { name: 'Gas', amount: 165, budgeted: 200 },
      { name: 'Utilities', amount: 185, budgeted: 250 },
    ],
    subscriptions: [
      { name: 'Tithe', amount: 100 },
      { name: 'Spotify', amount: 16.99 },
      { name: 'NordVPN', amount: 18.29, note: 'Annual' },
      { name: 'Proton', amount: 15.07, note: 'Annual' },
      { name: 'Privacy.com', amount: 5 },
      { name: 'Robinhood Gold', amount: 4.17 },
      { name: 'Claude Code', amount: 20 },
      { name: 'Atlas Coffee', amount: 16 },
      { name: 'Truple', amount: 16 },
      { name: 'Hushed', amount: 14.99 },
      { name: 'Jetbrains', amount: 10.90 },
      { name: 'Crunch', amount: 16, flag: 'cancel' },
    ]
  },
  assets: [
    { name: 'Cash on Hand', balance: 1200, type: 'Cash', apy: 0 },
    { name: 'Emergency Fund', balance: 1195.93, type: 'Savings', apy: 4.8, goal: 5000 },
    { name: "Selah's Savings", balance: 225, type: 'Savings', apy: 0 },
    { name: 'Managed Portfolio', balance: 212, type: 'Investment', apy: 2.0 },
    { name: 'Roth IRA', balance: 358, type: 'Retirement', apy: 1.0 },
  ],
  liabilities: [],
  cashFlow: {
    operating: {
      inflowTotal: 3364.57,
      outflowTotal: 2963.41,
      inflows: [
        { name: 'MUSC Salary', amount: 3183.61 },
        { name: "Lumber Jill's", amount: 180.96 },
      ],
      outflows: [
        { name: 'Fixed Expenses', amount: 1960 },
        { name: 'Variable Expenses', amount: 630 },
        { name: 'Subscriptions', amount: 253.41 },
      ]
    },
    investing: {
      inflowTotal: 0,
      outflowTotal: 340,
      inflows: [],
      outflows: [
        { name: 'Roth IRA Contribution', amount: 35 },
        { name: 'Portfolio Investment', amount: 5 },
        { name: 'Emergency Fund', amount: 300 },
      ]
    },
    financing: {
      inflowTotal: 0,
      outflowTotal: 0,
      inflows: [],
      outflows: []
    }
  }
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
export default function FinancialDashboard({ profileId }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'income', label: 'Income Statement' },
    { id: 'balance', label: 'Balance Sheet' },
    { id: 'cashflow', label: 'Cash Flow' },
  ];

  useEffect(() => {
    if (!profileId) return;

    const loadFinancialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [nodes, flows] = await Promise.all([
          api.get(`/profiles/${profileId}/nodes`),
          api.get(`/profiles/${profileId}/flows`)
        ]);

        const transformedData = transformNodesToFinancialData(nodes || [], flows || []);
        setData(transformedData);
      } catch (err) {
        console.error('Failed to load financial data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadFinancialData();
  }, [profileId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 border border-red-800 rounded-lg bg-red-900/20">
        <p className="text-red-400">Failed to load financial data: {error}</p>
      </div>
    );
  }

  // Empty state
  if (!data || (data.income.length === 0 && data.expenses.fixed.length === 0 &&
      data.expenses.variable.length === 0 && data.expenses.subscriptions.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-center">
              <DollarSign size={20} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-green-400 font-mono">FINANCIAL_STATEMENTS</h1>
              <p className="text-zinc-500 text-xs font-mono">Complete Financial Analysis</p>
            </div>
          </div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-12 bg-zinc-900/50 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign size={32} className="text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-300 mb-2">No Financial Data Yet</h3>
            <p className="text-zinc-500 mb-6">
              Start by adding your income sources, expenses, and assets in the Manage Items page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }}
      />

      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={TrendingUp}
          title="FINANCIAL_STATEMENTS"
          subtitle="Real-time Financial Analysis System"
        />

        {/* Content area - constrained with max-width */}
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Tab navigation */}
        <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl w-fit border border-zinc-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
                activeTab === tab.id
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <IncomeStatement data={data} />
              <BalanceSheet data={data} />
            </div>
            <div className="space-y-6">
              <FinancialRatios data={data} />
              <AlertsPanel data={data} />
            </div>
          </div>
        )}

        {activeTab === 'income' && (
          <div className="max-w-3xl">
            <IncomeStatement data={data} />
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="max-w-3xl">
            <BalanceSheet data={data} />
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="max-w-3xl">
            <CashFlowStatement data={data.cashFlow} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// Export individual components for modular use
export { IncomeStatement, BalanceSheet, CashFlowStatement, FinancialRatios, AlertsPanel };
