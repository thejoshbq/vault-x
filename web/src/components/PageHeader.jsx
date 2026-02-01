import React, { useState, useEffect } from 'react';

export const PageHeader = ({ icon: Icon, title, subtitle }) => {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-center">
            <Icon size={20} className="text-green-400" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-green-400 font-mono">{title}</h1>
          {subtitle && (
            <p className="text-zinc-500 text-xs font-mono">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-green-400 font-mono">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          LIVE
        </div>
        <div className="text-zinc-500 text-xs font-mono">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
