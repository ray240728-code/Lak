import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  ChevronRight, 
  MessageSquare, 
  Timer, 
  Wallet, 
  Trophy, 
  TrendingUp, 
  ShieldCheck, 
  Gamepad2, 
  Star, 
  Users, 
  Gift, 
  Headphones, 
  ChevronLeft, 
  X,
  Volume2,
  LayoutGrid,
  Zap,
  Flame,
  Dices,
  Fish,
  Gamepad,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from './Layout';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc, where, limit } from 'firebase/firestore';

interface HomeProps {
  onNavigate: (page: any) => void;
  user: any;
}

export default function Home({ onNavigate, user }: HomeProps) {
  const [banners, setBanners] = useState<string[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupBanner, setPopupBanner] = useState<string | null>(null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [realWins, setRealWins] = useState<any[]>([]);

  useEffect(() => {
    const bannersRef = collection(db, 'banners');
    const qBanners = query(bannersRef, orderBy('order', 'asc'));
    const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
      const bannerUrls = snapshot.docs.map(doc => doc.data().url);
      if (bannerUrls.length > 0) {
        setBanners(bannerUrls);
      } else {
        setBanners([
          'https://picsum.photos/seed/lakshmi1/1920/1080',
          'https://picsum.photos/seed/lakshmi2/1920/1080'
        ]);
      }
    });

    const activitiesRef = collection(db, 'activities');
    const qActivities = query(activitiesRef, orderBy('createdAt', 'desc'));
    const unsubscribeActivities = onSnapshot(qActivities, (snapshot) => {
      const activityData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (activityData.length > 0) {
        setActivities(activityData);
      }
    });

    const configRef = doc(db, 'config', 'settings');
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.popupBanner) {
          setPopupBanner(data.popupBanner);
          setShowPopup(true);
        }
      }
    });

    // Real-time Winning List
    const betsRef = collection(db, 'bets');
    const qWins = query(betsRef, where('status', '==', 'win'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeWins = onSnapshot(qWins, async (snapshot) => {
      const wins = await Promise.all(snapshot.docs.map(async (betDoc) => {
        const data = betDoc.data();
        let userName = 'Mem***' + data.userId.slice(-2);
        try {
          const userSnap = await getDoc(doc(db, 'users', data.userId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            userName = (userData.name || 'Member').slice(0, 3) + '***' + (userData.phone || '').slice(-2);
          }
        } catch (e) { /* ignore */ }
        
        return {
          id: betDoc.id,
          user: userName,
          amount: `₹${(data.payout || 0).toFixed(2)}`,
          game: data.mode === '1min' ? 'Win Go' : `Win Go ${data.mode}`
        };
      }));
      setRealWins(wins);
    });

    return () => {
      unsubscribeBanners();
      unsubscribeActivities();
      unsubscribeConfig();
      unsubscribeWins();
    };
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <Layout onNavigate={onNavigate} activeTab="home">
      <AnimatePresence>
        {showPopup && popupBanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative max-w-sm w-full bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setShowPopup(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <img 
                src={popupBanner} 
                alt="Announcement" 
                className="w-full aspect-[4/5] object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="p-6">
                <Button 
                  className="w-full h-12 bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] hover:opacity-90 text-white font-black rounded-xl shadow-lg shadow-red-100"
                  onClick={() => setShowPopup(false)}
                >
                  CLOSE
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col min-h-screen pb-24 bg-[#f8f3f3]"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] text-white sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter italic">LAKSHMI CLUB</h1>
          </div>
          <div className="flex gap-1">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full border-2 border-[#ff4d4d]" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Headphones className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner Slider */}
        <div className="px-4 mt-4">
          <div className="w-full h-44 rounded-2xl overflow-hidden relative shadow-lg group">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentBanner}
                src={banners[currentBanner]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {banners.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all duration-300 ${i === currentBanner ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Announcement */}
        <div className="px-4 mt-4">
          <div className="bg-white rounded-full px-4 py-2 flex items-center gap-3 text-gray-500 shadow-sm overflow-hidden border border-gray-50">
            <Volume2 className="w-4 h-4 flex-shrink-0 text-red-400" />
            <div className="flex-1 overflow-hidden">
              <motion.p 
                animate={{ x: [400, -400] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="text-[10px] whitespace-nowrap font-bold uppercase tracking-wider"
              >
                Welcome to LAKSHMI CLUB! Most popular game site in India. Stable, Safe & Fast.
              </motion.p>
            </div>
          </div>
        </div>

        {/* Game Categories */}
        <div className="px-4 mt-6 grid grid-cols-4 gap-4">
          {[
            { label: 'Lottery', icon: Flame, color: 'bg-red-50 text-red-500' },
            { label: 'Slots', icon: LayoutGrid, color: 'bg-orange-50 text-orange-500' },
            { label: 'Fishing', icon: Fish, color: 'bg-blue-50 text-blue-500' },
            { label: 'Casino', icon: Dices, color: 'bg-green-50 text-green-500' },
          ].map((cat, i) => (
            <button key={i} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center shadow-sm`}>
                <cat.icon className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-bold text-gray-600">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Featured Games */}
        <div className="px-4 mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-red-500 rounded-full" />
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Popular Games</h3>
            </div>
            <button className="text-[10px] font-bold text-red-500 uppercase tracking-widest">View All</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              whileTap={{ scale: 0.98 }}
              className="aspect-[4/5] bg-gradient-to-br from-red-500 to-red-600 rounded-3xl p-5 relative overflow-hidden shadow-lg group cursor-pointer"
              onClick={() => onNavigate('wingo')}
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 blur-2xl rounded-full" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <h4 className="text-xl font-black text-white italic leading-tight">WIN GO<br/>1MIN</h4>
                  <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-1">Lottery Game</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Timer className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            <div className="flex flex-col gap-4">
              <motion.div 
                whileTap={{ scale: 0.98 }}
                className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-4 relative overflow-hidden shadow-lg group cursor-pointer"
                onClick={() => onNavigate('wingo')}
              >
                <div className="relative z-10">
                  <h4 className="text-sm font-black text-white italic">TRX WIN</h4>
                  <p className="text-[8px] text-white/60 font-bold uppercase tracking-widest">Crypto Game</p>
                </div>
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              </motion.div>

              <motion.div 
                whileTap={{ scale: 0.98 }}
                className="flex-1 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-4 relative overflow-hidden shadow-lg group cursor-pointer"
                onClick={() => onNavigate('wingo')}
              >
                <div className="relative z-10">
                  <h4 className="text-sm font-black text-white italic">5D LOTTO</h4>
                  <p className="text-[8px] text-white/60 font-bold uppercase tracking-widest">Number Game</p>
                </div>
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Gamepad className="w-4 h-4 text-white" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Winning List */}
        <div className="px-4 mt-8 pb-8 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-yellow-500 rounded-full" />
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Winning List</h3>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden min-h-[100px]">
            {realWins.length === 0 ? (
              <div className="p-12 text-center text-gray-300">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-10" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Waiting for next winners...</p>
              </div>
            ) : realWins.map((win, i) => (
              <div key={win.id || i} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{win.user}</p>
                    <p className="text-[9px] text-gray-400 font-medium whitespace-nowrap">Successfully withdraw {win.amount}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-green-500">{win.amount}</p>
                  <p className="text-[8px] text-gray-300 font-mono">Just now</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
