import React, { useState } from 'react';
import { ChevronDown, Check, Plus, X, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const ProfileSwitcher = () => {
  const { profiles, activeProfile, switchProfile, addProfile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#10b981');

  const colors = ['#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

  const handleAddProfile = async () => {
    if (newName.trim()) {
      await addProfile(newName, newColor);
      setNewName('');
      setShowAddForm(false);
    }
  };

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

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: activeProfile?.avatar_color || '#10b981' }}
        >
          {activeProfile?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="text-zinc-300 text-sm hidden sm:block">
          {activeProfile?.name || 'User'}
        </span>
        <ChevronDown
          size={14}
          className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 bottom-full mb-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-2">
              <div className="text-zinc-500 text-xs uppercase tracking-wider px-3 py-2">
                Profiles
              </div>

              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => {
                    switchProfile(profile);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeProfile?.id === profile.id
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: profile.avatar_color }}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-left">{profile.name}</span>
                  {profile.is_owner && <span className="text-xs text-zinc-500">Owner</span>}
                  {activeProfile?.id === profile.id && <Check size={14} className="text-emerald-400" />}
                </button>
              ))}

              {showAddForm ? (
                <div className="p-3 border-t border-zinc-800 mt-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Profile name"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 text-sm mb-2 focus:outline-none focus:border-emerald-500/50"
                    autoFocus
                  />
                  <div className="flex gap-1 mb-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        className={`w-6 h-6 rounded-full ${
                          newColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddProfile}
                      className="flex-1 bg-emerald-500/20 text-emerald-400 py-1.5 rounded-lg text-sm"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewName('');
                      }}
                      className="px-3 text-zinc-400 hover:text-zinc-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors mt-1"
                >
                  <Plus size={18} /> Add Profile
                </button>
              )}
            </div>

            <div className="border-t border-zinc-800 p-2">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
