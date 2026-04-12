/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import Activity from './components/Activity';
import Wallet from './components/Wallet';
import Promotion from './components/Promotion';
import Profile from './components/Profile';
import WinGo from './components/WinGo';
import AdminPanel from './components/AdminPanel';
import StaticPage from './components/StaticPages';
import GameStats from './components/GameStats';
import HistoryPage from './components/HistoryPage';
import Deposit from './components/Deposit';
import Withdraw from './components/Withdraw';

type Page = 'login' | 'register' | 'home' | 'activity' | 'wallet' | 'promotion' | 'profile' | 'wingo' | 'admin' | 'security' | 'guide' | 'about' | 'salary' | 'game-stats' | 'history-bet' | 'history-transaction' | 'history-deposit' | 'history-withdraw' | 'deposit' | 'withdraw';

import { User } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('lakshmi_auth');
    return saved ? 'home' : 'login';
  });
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lakshmi_auth');
    if (!saved) return null;
    const authData = JSON.parse(saved);
    const users: User[] = JSON.parse(localStorage.getItem('lakshmi_users') || '[]');
    return users.find(u => u.phone === authData.phone) || null;
  });

  const navigate = (page: any) => setCurrentPage(page);

  const handleLogin = (phone: string, password?: string) => {
    const users: User[] = JSON.parse(localStorage.getItem('lakshmi_users') || '[]');
    const foundUser = users.find(u => u.phone === phone);

    if (!foundUser) {
      toast.error('User not found. Please register first.');
      return;
    }

    if (password && foundUser.password !== password) {
      toast.error('Incorrect password.');
      return;
    }

    if (foundUser.status === 'blocked') {
      toast.error('Your account has been blocked. Contact support.');
      return;
    }

    setUser(foundUser);
    localStorage.setItem('lakshmi_auth', JSON.stringify({ phone: foundUser.phone }));
    toast.success('Login successful!');
    navigate('home');
  };

  const handleRegister = (phone: string, password?: string, inviteCode?: string) => {
    const users: User[] = JSON.parse(localStorage.getItem('lakshmi_users') || '[]');
    
    if (users.find(u => u.phone === phone)) {
      toast.error('Phone number already registered.');
      return;
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      phone,
      password,
      name: `Member${Math.floor(10000 + Math.random() * 90000)}`,
      balance: 0,
      status: 'active',
      totalDeposit: 0,
      role: phone === '9999999999' ? 'admin' : 'user', // Default admin for testing
      referredBy: inviteCode || undefined,
      referralCount: 0,
      createdAt: Date.now()
    };

    let updatedUsers = [...users, newUser];

    // Increment referral count for the referrer if inviteCode exists
    if (inviteCode) {
      updatedUsers = updatedUsers.map(u => {
        if (u.id === inviteCode || u.phone === inviteCode) {
          return { ...u, referralCount: (u.referralCount || 0) + 1 };
        }
        return u;
      });
    }

    localStorage.setItem('lakshmi_users', JSON.stringify(updatedUsers));
    
    toast.success('Registration successful! Please login.');
    navigate('login');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lakshmi_auth');
    navigate('login');
  };

  // Initialize default admin if no users exist
  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('lakshmi_users') || '[]');
    if (users.length === 0) {
      const adminUser: User = {
        id: 'admin',
        phone: '9999999999',
        password: 'admin',
        name: 'Admin',
        balance: 5000,
        status: 'active',
        totalDeposit: 0,
        role: 'admin',
        referralCount: 0,
        createdAt: Date.now()
      };
      localStorage.setItem('lakshmi_users', JSON.stringify([adminUser]));
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white font-sans overflow-x-hidden">
      <Toaster position="top-center" richColors />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen"
        >
          {currentPage === 'login' && <Login onNavigate={navigate} onLogin={handleLogin} />}
          {currentPage === 'register' && <Register onNavigate={navigate} onRegister={handleRegister} />}
          
          {user && (
            <>
              {currentPage === 'home' && <Home onNavigate={navigate} />}
              {currentPage === 'activity' && <Activity onNavigate={navigate} />}
              {currentPage === 'wallet' && <Wallet onNavigate={navigate} user={user} />}
              {currentPage === 'promotion' && <Promotion onNavigate={navigate} user={user} />}
              {currentPage === 'profile' && <Profile onNavigate={navigate} onLogout={handleLogout} user={user} />}
              {currentPage === 'wingo' && <WinGo onNavigate={navigate} user={user} />}
              {currentPage === 'admin' && <AdminPanel onNavigate={navigate} />}
              {currentPage === 'security' && <StaticPage title="Security & Safety" type="security" onBack={() => navigate('profile')} />}
              {currentPage === 'guide' && <StaticPage title="Guide for Beginners" type="guide" onBack={() => navigate('profile')} />}
              {currentPage === 'about' && <StaticPage title="About Us" type="about" onBack={() => navigate('profile')} />}
              {currentPage === 'salary' && <StaticPage title="Salary Record" type="salary" onBack={() => navigate('profile')} />}
              {currentPage === 'game-stats' && <GameStats onBack={() => navigate('profile')} />}
              {currentPage === 'history-bet' && <HistoryPage title="Bet History" type="bet" onBack={() => navigate('profile')} />}
              {currentPage === 'history-transaction' && <HistoryPage title="Transaction History" type="transaction" onBack={() => navigate('profile')} />}
              {currentPage === 'history-deposit' && <HistoryPage title="Deposit History" type="deposit" onBack={() => navigate('profile')} />}
              {currentPage === 'history-withdraw' && <HistoryPage title="Withdraw History" type="withdrawal" onBack={() => navigate('profile')} />}
              {currentPage === 'deposit' && <Deposit onBack={() => navigate('wallet')} user={user} />}
              {currentPage === 'withdraw' && <Withdraw onBack={() => navigate('wallet')} user={user} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
