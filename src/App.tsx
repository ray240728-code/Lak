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

import { auth, db, handleFirestoreError, OperationType, testConnection } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, increment, collection, query, where, getDocs, serverTimestamp, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthActionInProgress = useRef(false);

  useEffect(() => {
    testConnection();
  }, []);

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
          referralDepositCount: 0,
          referralDepositAmount: 0,
          totalDeposit: 0
        };
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
        }
        setUser(newUser);
      } else {
        let userData = userDoc.data() as User;
        // Force admin role check even for existing users
        if (firebaseUser.email === 'purnundurayr@gmail.com' && userData.role !== 'admin') {
          await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
          userData.role = 'admin';
        }
        setUser(userData);
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
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized', {
          description: 'Please add your current domain to the Authorized Domains in your Firebase Console (Authentication > Settings).'
        });
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

  const currentPageRef = useRef<Page>(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous user listener if it exists
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            setUser(userData);
            
            // Auto-navigate from login/register if user is found, but only if we're not manually handling it
            if (!isAuthActionInProgress.current && (currentPageRef.current === 'login' || currentPageRef.current === 'register')) {
              setCurrentPage('home');
            }
          } else {
            // Document doesn't exist yet
            if (!isAuthActionInProgress.current && currentPageRef.current !== 'register') {
              setUser(null);
              setCurrentPage('login');
            }
          }
          setLoading(false);
        }, (err) => {
          console.error("User listener error:", err);
          if (!isAuthActionInProgress.current && currentPageRef.current !== 'register') {
            setUser(null);
            setCurrentPage('login');
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        if (!isAuthActionInProgress.current && currentPageRef.current !== 'register') {
          setCurrentPage('login');
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []); // Run once on mount

  const navigate = (page: any) => setCurrentPage(page);

  const handleLogin = async (phoneInput: string, passwordInput?: string) => {
    if (!passwordInput) return;
    const phone = phoneInput.trim().replace(/\s+/g, '');
    const password = passwordInput.trim();
    isAuthActionInProgress.current = true;
    setLoading(true);
    console.log(`Attempting login for: ${phone}`);
    try {
      // 1. Attempt Firebase Auth login FIRST
      const email = `${phone}@lakshmi.club`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      console.log(`Auth successful, UID: ${uid}`);
      
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
            const { password: _, ...dataToMigrate } = userData as any;
            await setDoc(doc(db, 'users', uid), { ...dataToMigrate, id: uid });
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
        let userData = userDoc.data() as User;
        console.log("User document found:", userData.role);
        
        // Force admin role for the specific admin user
        if (userData.phone === '9999999999' || userCredential.user.email === 'purnundurayr@gmail.com') {
          if (userData.role !== 'admin') {
            await updateDoc(doc(db, 'users', uid), { role: 'admin' });
            userData.role = 'admin';
          }
        }
        
        if (userData.status === 'blocked') {
          await signOut(auth);
          toast.error('Your account has been blocked. Contact customer support.');
          setLoading(false);
          isAuthActionInProgress.current = false;
          return;
        }
        setUser(userData);
        toast.success(`Welcome back, ${userData.name}!`);
        setCurrentPage('home');
      } else {
        console.error("Critical: Auth succeeded but doc doesn't exist even after migration attempt");
        toast.error('Login partial success: Auth verified but profile missing.', {
          description: 'Try registering with the SAME phone and password to restore your profile.'
        });
        await signOut(auth);
      }
    } catch (error: any) {
      console.error("Login Error Details:", error);
      
      let displayMessage = 'Login failed. Please try again.';
      try {
        if (error.message && typeof error.message === 'string' && error.message.startsWith('{')) {
          const errInfo = JSON.parse(error.message);
          displayMessage = errInfo.error;
        } else {
          displayMessage = error.message;
        }
      } catch (e) {
        displayMessage = error.message;
      }

      const errorCode = error.code;
      if (errorCode === 'auth/invalid-credential' || 
          errorCode === 'auth/user-not-found' || 
          errorCode === 'auth/wrong-password' ||
          errorCode === 'auth/invalid-login-credentials') {
        toast.error('Invalid phone number or password.', {
          description: 'Please check your credentials. If you are already registered, make sure you are using the correct 10-digit number and 6+ character password.'
        });
      } else if (errorCode === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Account temporarily locked for security. Please try again in 15 minutes.');
      } else if (errorCode === 'auth/network-request-failed') {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error(displayMessage && displayMessage.length > 100 ? 'Login failed. Please contact support.' : (displayMessage || 'Login failed.'));
      }
    } finally {
      setLoading(false);
      isAuthActionInProgress.current = false;
    }
  };

  const handleRegister = async (phoneInput: string, passwordInput?: string, inviteCodeInput?: string) => {
    if (!passwordInput) return;
    const phone = phoneInput.trim().replace(/\s+/g, '');
    const password = passwordInput.trim();
    const inviteCode = (inviteCodeInput || '').trim();
    isAuthActionInProgress.current = true;
    setLoading(true);
    console.log(`Attempting registration for: ${phone}`);
    try {
      // 1. Check if Auth account exists by attempting to create it
      const email = `${phone}@lakshmi.club`;
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          console.log("Auth account already exists, redirecting to login");
          toast.error('This phone number is already registered. Please Login.');
          setCurrentPage('login');
          setLoading(false);
          isAuthActionInProgress.current = false;
          return;
        }
        throw authError;
      }

      const uid = userCredential.user.uid;
      console.log(`Auth account created, UID: ${uid}`);

      // 2. Check if a Firestore document already exists for this phone
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', phone));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      }

      // 3. Handle data creation or migration
      let userData: User;
      if (querySnapshot && !querySnapshot.empty) {
        // Migration case: Auth account was just created, but Firestore doc already existed with different ID
        const oldDoc = querySnapshot.docs[0];
        const existingData = oldDoc.data() as User;
        
        console.log("Found existing Firestore doc during registration, migrating to new UID...");
        try {
          const { password: _, ...dataToMigrate } = existingData as any;
          userData = { ...dataToMigrate, id: uid };
          await setDoc(doc(db, 'users', uid), userData);
          await deleteDoc(doc(db, 'users', oldDoc.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
          throw err; // Ensure we stop if migration fails
        }
      } else {
        // Normal case: New user
        console.log("Creating new firestore document...");
        userData = {
          id: uid,
          phone,
          name: `Member${Math.floor(10000 + Math.random() * 90000)}`,
          balance: 0,
          status: 'active',
          totalDeposit: 0,
          role: phone === '9999999999' ? 'admin' : 'user',
          referredBy: inviteCode || null,
          referralCount: 0,
          referralDepositCount: 0,
          referralDepositAmount: 0,
          createdAt: Date.now()
        };
        try {
          await setDoc(doc(db, 'users', uid), userData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
          throw err;
        }
      }

      // Handle referral logic asynchronously
      if (inviteCode) {
        console.log(`Processing referral: ${inviteCode}`);
        (async () => {
          try {
            const usersRef = collection(db, 'users');
            let referrerDoc = null;

            // 1. Try to get by UID directly first (fastest)
            const docRef = doc(db, 'users', inviteCode);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              referrerDoc = docSnap;
            } else {
              // 2. Try to search by phone if UID lookup failed
              const qPhone = query(usersRef, where('phone', '==', inviteCode));
              const qSnapPhone = await getDocs(qPhone);
              if (!qSnapPhone.empty) {
                referrerDoc = qSnapPhone.docs[0];
              }
            }

            if (referrerDoc) {
              console.log(`Referrer found: ${referrerDoc.id}, incrementing count`);
              await updateDoc(doc(db, 'users', referrerDoc.id), { 
                referralCount: increment(1) 
              });
            } else {
              console.warn(`Referrer not found for code: ${inviteCode}`);
            }
          } catch (refError) {
            console.error("Referral update failed (non-critical):", refError);
          }
        })();
      }

      // Success! Set state and move to home
      setUser(userData);
      toast.success('Registration successful! Welcome to Lakshmi Club.');
      setCurrentPage('home');
    } catch (error: any) {
      console.error("Registration Critical Error:", error);
      
      let displayMessage = 'Registration failed. Please try again.';
      
      // Attempt to parse JSON error if it came from handleFirestoreError
      try {
        if (error.message && typeof error.message === 'string' && error.message.startsWith('{')) {
          const errInfo = JSON.parse(error.message);
          displayMessage = errInfo.error;
        } else {
          displayMessage = error.message;
        }
      } catch (e) {
        displayMessage = error.message;
      }

      const errorCode = error.code;
      if (errorCode === 'auth/email-already-in-use' || displayMessage?.includes('already registered')) {
        toast.error('This phone number is already registered. Please Login.');
        setCurrentPage('login');
      } else if (errorCode === 'auth/weak-password') {
        toast.error('Password is too weak. Please use at least 6 characters.');
      } else if (errorCode === 'auth/invalid-email') {
        toast.error('Invalid phone format.');
      } else if (errorCode === 'auth/network-request-failed') {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error(displayMessage && displayMessage.length > 100 ? 'Registration failed. Please contact support.' : (displayMessage || 'Registration failed.'));
      }
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f3f3] text-gray-900 font-sans overflow-x-hidden">
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
              {currentPage === 'home' && <Home onNavigate={navigate} user={user} />}
              {currentPage === 'activity' && <Activity onNavigate={navigate} user={user} />}
              {currentPage === 'wallet' && <Wallet onNavigate={navigate} user={user} />}
              {currentPage === 'promotion' && <Promotion onNavigate={navigate} user={user} />}
              {currentPage === 'profile' && <Profile onNavigate={navigate} onLogout={handleLogout} user={user} onClearCache={clearCache} />}
              {currentPage === 'wingo' && <WinGo onNavigate={navigate} user={user} />}
              {currentPage === 'admin' && <AdminPanel onNavigate={navigate} user={user} />}
              {currentPage === 'security' && <StaticPage title="Security & Safety" type="security" onBack={() => navigate('profile')} />}
              {currentPage === 'guide' && <StaticPage title="Guide for Beginners" type="guide" onBack={() => navigate('profile')} />}
              {currentPage === 'about' && <StaticPage title="About Us" type="about" onBack={() => navigate('profile')} />}
              {currentPage === 'salary' && <StaticPage title="Salary Record" type="salary" onBack={() => navigate('profile')} />}
              {currentPage === 'game-stats' && <GameStats onBack={() => navigate('profile')} user={user!} />}
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
