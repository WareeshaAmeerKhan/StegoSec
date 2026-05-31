import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saveToStore, getAllFromStore } from '../services/db';

const AuditContext = createContext(null);

export const AuditProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    getAllFromStore('auditLogs')
      .then(stored => setLogs(stored.sort((a, b) => b.timestamp - a.timestamp)))
      .catch(console.error);
  }, []);

  const logEvent = useCallback(async (action, details, success = true, userId = 'system') => {
    const entry = { timestamp: Date.now(), action, details, success, userId };
    try {
      const id = await saveToStore('auditLogs', entry);
      setLogs(prev => [{ ...entry, id }, ...prev]);
    } catch (err) { console.error('Audit log failed:', err); }
  }, []);

  return (
    <AuditContext.Provider value={{ logs, logEvent }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => useContext(AuditContext);
