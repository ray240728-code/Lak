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

import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
          setCurrentPage('home');
        } else {
          // Handle case where auth exists but firestore doc doesn't
          setUser(null);
          setCurrentPage('login');
        }
      } else {
        setUser(null);
        setCurrentPage('login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const navigate = (page: any) => setCurrentPage(page);

  const handleLogin = async (phone: string, password?: string) => {
    if (!password) return;
    try {
      // Firebase Auth uses email, so we use phone@lakshmi.club as a dummy email
      const email = `${phone}@lakshmi.club`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        if (userData.status === 'blocked') {
          await signOut(auth);
          toast.error('Your account has been blocked. Contact support.');
          return;
        }
        setUser(userData);
        toast.success('Login successful!');
        navigate('home');
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        if (phone === '9999999999') {
          toast.error('Admin account not found in the new system. Please click REGISTER to create it for the first time.');
        } else {
          toast.error('Invalid credentials. If you haven\'t registered yet, please click Register.');
        }
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized. Please add this domain to Firebase Authorized Domains.');
      } else {
        toast.error('Login failed. Please check your credentials.');
      }
      console.error(error);
    }
  };

  const handleRegister = async (phone: string, password?: string, inviteCode?: string) => {
    if (!password) return;
    try {
      const email = `${phone}@lakshmi.club`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const newUser: User = {
        id: uid,
        phone,
        password, // Storing for legacy reasons, though Auth handles it
        name: `Member${Math.floor(10000 + Math.random() * 90000)}`,
        balance: 0,
        status: 'active',
        totalDeposit: 0,
        role: phone === '9999999999' ? 'admin' : 'user',
        referredBy: inviteCode || undefined,
        referralCount: 0,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'users', uid), newUser);

      // Handle referral logic
      if (inviteCode) {
        // Find referrer by ID or Phone
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('id', '==', inviteCode));
        const qPhone = query(usersRef, where('phone', '==', inviteCode));
        
        const [querySnapshot, querySnapshotPhone] = await Promise.all([
          getDocs(q),
          getDocs(qPhone)
        ]);

        const referrerDoc = querySnapshot.docs[0] || querySnapshotPhone.docs[0];
        if (referrerDoc) {
          await updateDoc(doc(db, 'users', referrerDoc.id), {
            referralCount: increment(1)
          });
        }
      }

      toast.success('Registration successful! Please login.');
      navigate('login');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Phone number already registered.');
      } else {
        toast.error('Registration failed. Please try again.');
      }
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    navigate('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
