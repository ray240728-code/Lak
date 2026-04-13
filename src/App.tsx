/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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

import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, increment, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthActionInProgress = useRef(false);

  const handleGoogleLogin = async () => {
    isAuthActionInProgress.current = true;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
      }

      if (!userDoc?.exists()) {
        // Create new user doc for Google user
        const newUser: User = {
          id: firebaseUser.uid,
          phone: firebaseUser.phoneNumber || '',
          name: firebaseUser.displayName || 'Google User',
          balance: 0,
          status: 'active',
          role: firebaseUser.email === 'purnundurayr@gmail.com' ? 'admin' : 'user',
          createdAt: Date.now(),
          referralCount: 0,
          totalDeposit: 0
        };
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
        }
        setUser(newUser);
      } else {
        setUser(userDoc.data() as User);
      }
      toast.success('Login successful!');
      setCurrentPage('home');
    } catch (error: any) {
      console.error("Google Login Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.info('Login cancelled', {
          description: 'The Google login window was closed before completion.'
        });
      } else if (error.code === 'auth/cancelled-popup-request') {
        // This happens if multiple popups are opened
        console.log("Popup request cancelled");
      } else {
        toast.error('Google login failed. Please try again.', {
          description: error.message || 'If the issue persists, try opening the app in a new tab.'
        });
      }
    } finally {
      setLoading(false);
      isAuthActionInProgress.current = false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isAuthActionInProgress.current) return;
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
            setCurrentPage('home');
          } else {
            // Handle case where auth exists but firestore doc doesn't
            setUser(null);
            setCurrentPage('login');
          }
        } catch (err) {
          console.error("Auth state change error:", err);
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
    isAuthActionInProgress.current = true;
    setLoading(true);
    try {
      // 1. Attempt Firebase Auth login FIRST
      const email = `${phone}@lakshmi.club`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // 2. Once logged in, we have permissions to read the user doc
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }
      
      if (!userDoc?.exists()) {
        // 3. UID mismatch check: Search by phone if UID lookup fails
        console.log("UID lookup failed, searching by phone...");
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phone', '==', phone));
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'users');
        }

        if (querySnapshot && !querySnapshot.empty) {
          // Found a document with this phone but different ID
          const oldDoc = querySnapshot.docs[0];
          const userData = oldDoc.data() as User;
          
          console.log("Found existing document with different ID, migrating to UID...");
          // Migrate to new UID
          try {
            await setDoc(doc(db, 'users', uid), { ...userData, id: uid });
            // Delete old document
            await deleteDoc(doc(db, 'users', oldDoc.id));
            // Re-fetch the new document
            userDoc = await getDoc(doc(db, 'users', uid));
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
          }
        }
      }

      if (userDoc?.exists()) {
        const userData = userDoc.data() as User;
        if (userData.status === 'blocked') {
          await signOut(auth);
          toast.error('Your account has been blocked. Contact support.');
          setLoading(false);
          isAuthActionInProgress.current = false;
          return;
        }
        setUser(userData);
        toast.success('Login successful!');
        navigate('home');
      } else {
        toast.error('User data not found. Please register.');
        await signOut(auth);
      }
    } catch (error: any) {
      console.error("Login Error Details:", error);
      const errorCode = error.code;
      const errorMessage = error.message;
      
      if (errorCode === 'auth/invalid-credential' || 
          errorCode === 'auth/user-not-found' || 
          errorCode === 'auth/wrong-password' ||
          errorCode === 'auth/invalid-login-credentials') {
        toast.error('Incorrect phone number or password.', {
          description: 'Please make sure you are using the same password you registered with.'
        });
      } else if (errorCode === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later.');
      } else {
        toast.error(`Login failed: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
      isAuthActionInProgress.current = false;
    }
  };

  const handleRegister = async (phone: string, password?: string, inviteCode?: string) => {
    if (!password) return;
    isAuthActionInProgress.current = true;
    setLoading(true);
    try {
      // 1. Check if Auth account exists by attempting to create it
      const email = `${phone}@lakshmi.club`;
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          toast.error('This phone number is already registered. Please Login.');
          navigate('login');
          setLoading(false);
          isAuthActionInProgress.current = false;
          return;
        }
        throw authError;
      }

      const uid = userCredential.user.uid;

      // 2. Check if a Firestore document already exists for this phone
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', phone));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      }

      if (querySnapshot && !querySnapshot.empty) {
        // Migration case: Auth account was just created, but Firestore doc already existed with different ID
        const oldDoc = querySnapshot.docs[0];
        const existingData = oldDoc.data() as User;
        
        console.log("Found existing Firestore doc during registration, migrating to new UID...");
        try {
          await setDoc(doc(db, 'users', uid), { ...existingData, id: uid, password }); // Update password too
          await deleteDoc(doc(db, 'users', oldDoc.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        }
      } else {
        // Normal case: New user
        const newUser: User = {
          id: uid,
          phone,
          password,
          name: `Member${Math.floor(10000 + Math.random() * 90000)}`,
          balance: 0,
          status: 'active',
          totalDeposit: 0,
          role: phone === '9999999999' ? 'admin' : 'user',
          referredBy: inviteCode || undefined,
          referralCount: 0,
          createdAt: Date.now()
        };
        try {
          await setDoc(doc(db, 'users', uid), newUser);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
        }
      }

      // Handle referral logic
      if (inviteCode) {
        try {
          // Find referrer by ID or Phone
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('id', '==', inviteCode));
          const qPhone = query(usersRef, where('phone', '==', inviteCode));
          
          const [qSnap, qSnapPhone] = await Promise.all([
            getDocs(q),
            getDocs(qPhone)
          ]);

          const referrerDoc = qSnap.docs[0] || qSnapPhone.docs[0];
          if (referrerDoc) {
            await updateDoc(doc(db, 'users', referrerDoc.id), {
              referralCount: increment(1)
            });
          }
        } catch (refError) {
          console.error("Referral update error:", refError);
          // Don't block registration if referral update fails
        }
      }

      // Fetch the final user data to ensure state is correct
      let finalUserDoc;
      try {
        finalUserDoc = await getDoc(doc(db, 'users', uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }

      if (finalUserDoc?.exists()) {
        setUser(finalUserDoc.data() as User);
        toast.success('Registration successful!');
        navigate('home');
      } else {
        toast.success('Registration successful! Please login.');
        navigate('login');
      }
    } catch (error: any) {
      const errorCode = error.code;
      if (errorCode === 'auth/email-already-in-use') {
        toast.error('Account already exists. Please Login.');
        navigate('login');
      } else if (errorCode === 'auth/weak-password') {
        toast.error('Password is too weak. Please use at least 6 characters.');
      } else if (errorCode === 'auth/invalid-email') {
        toast.error('Invalid phone format.');
      } else {
        toast.error(`Registration failed: ${error.message || 'Please try again.'}`);
      }
      console.error(error);
    } finally {
      setLoading(false);
      isAuthActionInProgress.current = false;
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    navigate('login');
  };

  const clearCache = () => {
    localStorage.clear();
    toast.success('Cache cleared successfully!');
    window.location.reload();
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
          {currentPage === 'login' && <Login onNavigate={navigate} onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} loading={loading} />}
          {currentPage === 'register' && <Register onNavigate={navigate} onRegister={handleRegister} loading={loading} />}
          
          {user && (
            <>
              {currentPage === 'home' && <Home onNavigate={navigate} />}
              {currentPage === 'activity' && <Activity onNavigate={navigate} />}
              {currentPage === 'wallet' && <Wallet onNavigate={navigate} user={user} />}
              {currentPage === 'promotion' && <Promotion onNavigate={navigate} user={user} />}
              {currentPage === 'profile' && <Profile onNavigate={navigate} onLogout={handleLogout} user={user} onClearCache={clearCache} />}
              {currentPage === 'wingo' && <WinGo onNavigate={navigate} user={user} />}
              {currentPage === 'admin' && <AdminPanel onNavigate={navigate} />}
              {currentPage === 'security' && <StaticPage title="Security & Safety" type="security" onBack={() => navigate('profile')} />}
              {currentPage === 'guide' && <StaticPage title="Guide for Beginners" type="guide" onBack={() => navigate('profile')} />}
              {currentPage === 'about' && <StaticPage title="About Us" type="about" onBack={() => navigate('profile')} />}
              {currentPage === 'salary' && <StaticPage title="Salary Record" type="salary" onBack={() => navigate('profile')} />}
              {currentPage === 'game-stats' && <GameStats onBack={() => navigate('profile')} />}
              {currentPage === 'history-bet' && <HistoryPage title="Bet History" type="bet" onBack={() => navigate('profile')} user={user} />}
              {currentPage === 'history-transaction' && <HistoryPage title="Transaction History" type="transaction" onBack={() => navigate('profile')} user={user} />}
              {currentPage === 'history-deposit' && <HistoryPage title="Deposit History" type="deposit" onBack={() => navigate('profile')} user={user} />}
              {currentPage === 'history-withdraw' && <HistoryPage title="Withdraw History" type="withdrawal" onBack={() => navigate('profile')} user={user} />}
              {currentPage === 'deposit' && <Deposit onBack={() => navigate('wallet')} user={user} />}
              {currentPage === 'withdraw' && <Withdraw onBack={() => navigate('wallet')} user={user} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
