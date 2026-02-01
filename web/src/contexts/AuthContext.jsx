import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
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
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

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
    setUser(null);
    setProfiles([]);
    setActiveProfile(null);
    localStorage.removeItem('user');
    localStorage.removeItem('profiles');
    localStorage.removeItem('activeProfile');
  };

  const switchProfile = (profile) => {
    setActiveProfile(profile);
    localStorage.setItem('activeProfile', JSON.stringify(profile));
  };

  const addProfile = async (name, avatarColor) => {
    const newProfile = await api.post('/profiles', {
      name,
      avatar_color: avatarColor
    });
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('profiles', JSON.stringify(updated));
    return newProfile;
  };

  return (
    <AuthContext.Provider value={{
      user,
      profiles,
      activeProfile,
      loading,
      login,
      register,
      logout,
      switchProfile,
      addProfile,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
