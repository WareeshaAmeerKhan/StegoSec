import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './pages/Layout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import StealthMode from './components/StealthMode';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuditProvider } from './contexts/AuditContext';
import { FriendProvider } from './contexts/FriendContext';

import './index.css';

// We will create these shortly
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import AttackSimulatorPage from './pages/AttackSimulatorPage';
import SteganalysisPage from './pages/SteganalysisPage';
import AuditLogPage from './pages/AuditLogPage';
import ForensicLeakDetectorPage from './pages/ForensicLeakDetectorPage';
import CryptanalysisPage from './pages/CryptanalysisPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen"><span className="text-primary">LOADING SYSTEM...</span></div>;
  if (!user) return <Navigate to="/auth" />;
  
  const role = user.role || 'user';
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'admin' ? '/audit' : '/chat'} />;
  }
  return children;
};

function App() {
  return (
    <AuditProvider>
      <AuthProvider>
        <FriendProvider>
          <StealthMode>
            <Router>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  {/* User Only Routes */}
                  <Route path="/chat" element={<ProtectedRoute allowedRoles={['user']}><ChatPage /></ProtectedRoute>} />
                  <Route path="/simulator" element={<ProtectedRoute allowedRoles={['user']}><AttackSimulatorPage /></ProtectedRoute>} />
                  <Route path="/steganalysis" element={<ProtectedRoute allowedRoles={['user']}><SteganalysisPage /></ProtectedRoute>} />
                  
                  {/* Shared Routes */}
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Admin Only Routes */}
                  <Route path="/audit" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogPage /></ProtectedRoute>} />
                  <Route path="/forensics" element={<ProtectedRoute allowedRoles={['admin']}><ForensicLeakDetectorPage /></ProtectedRoute>} />
                  <Route path="/cryptanalysis" element={<ProtectedRoute allowedRoles={['admin']}><CryptanalysisPage /></ProtectedRoute>} />
                </Route>
              </Routes>
            </Router>
          </StealthMode>
        </FriendProvider>
      </AuthProvider>
    </AuditProvider>
  );
}

export default App;
