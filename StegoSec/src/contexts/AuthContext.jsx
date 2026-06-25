import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getFromStore, saveToStore, getAllFromStore } from '../services/db';
import { useAudit } from './AuditContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null);
  const [masterKey, setMasterKey] = useState(null);
  const [masterKeyHex, setMasterKeyHex] = useState(null);
  const [loading, setLoading]     = useState(true);
  const { logEvent } = useAudit();

  // Restore session from localStorage on mount
  useEffect(() => {
    const token  = localStorage.getItem('stegosec_token');
    const userId = localStorage.getItem('stegosec_userId');
    const mkHex  = sessionStorage.getItem('stegosec_mk');
    if (token && userId) {
      getFromStore('users', userId)
        .then(u => { 
          if (u) {
            const finalUser = u.id === 'admin' ? { ...u, role: 'admin' } : u;
            setUser(finalUser);
            if (mkHex) {
              // We store it as hex in session storage for the demo's convenience
              // In a real app we'd never store it, but this fixes the "lost on refresh" issue
              // and allows the profile page to show it.
              setMasterKeyHex(mkHex);
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (userId, password, derivedMasterKey) => {
    const u = await getFromStore('users', userId);
    if (!u) {
      logEvent('LOGIN', `No account: ${userId}`, false, userId);
      throw new Error('User not found.');
    }
    if (u.passwordHash !== password) {
      logEvent('LOGIN', `Wrong password for ${userId}`, false, userId);
      throw new Error('Incorrect password.');
    }
    const userWithRole = { ...u, role: u.id === 'admin' ? 'admin' : (u.role || 'user') };
    setUser(userWithRole);
    setMasterKey(derivedMasterKey);
    const hex = await (await import('../utils/crypto')).keyToHex(derivedMasterKey);
    setMasterKeyHex(hex);
    sessionStorage.setItem('stegosec_mk', hex);
    localStorage.setItem('stegosec_token',  'jwt_' + Date.now());
    localStorage.setItem('stegosec_userId', u.id);
    logEvent('LOGIN', 'Authenticated', true, u.id);
    return userWithRole;
  }, [logEvent]);

  const signup = useCallback(async (userId, password, derivedMasterKey, salt) => {
    if (userId.trim().toLowerCase() === 'admin') {
      throw new Error('Cannot register as admin identity.');
    }
    const existing = await getFromStore('users', userId);
    if (existing) throw new Error('Username already taken.');
    const newUser = {
      id: userId,
      passwordHash: password,
      masterKeySalt: Array.from(salt),
      role: 'user',
      imagesSent: 0,
      imagesReceived: 0,
      createdAt: Date.now(),
    };
    await saveToStore('users', newUser);
    setUser(newUser);
    setMasterKey(derivedMasterKey);
    const hex = await (await import('../utils/crypto')).keyToHex(derivedMasterKey);
    setMasterKeyHex(hex);
    sessionStorage.setItem('stegosec_mk', hex);
    localStorage.setItem('stegosec_token',  'jwt_' + Date.now());
    localStorage.setItem('stegosec_userId', newUser.id);
    logEvent('SIGNUP', 'New agent registered', true, newUser.id);
    return newUser;
  }, [logEvent]);

  const logout = useCallback(() => {
    if (user) logEvent('LOGOUT', 'Session terminated', true, user.id);
    setUser(null);
    setMasterKey(null);
    setMasterKeyHex(null);
    sessionStorage.removeItem('stegosec_mk');
    localStorage.removeItem('stegosec_token');
    localStorage.removeItem('stegosec_userId');
  }, [user, logEvent]);

  const searchUsers = useCallback(async (query) => {
    const all = await getAllFromStore('users');
    return all.filter(u => u.id !== user?.id && u.id.toLowerCase().includes(query.toLowerCase()));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, masterKey, masterKeyHex, loading, login, signup, logout, searchUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
