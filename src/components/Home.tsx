import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, ChevronRight, MessageSquare, Timer, Wallet, Trophy, TrendingUp, ShieldCheck, Gamepad2, Star, Users, Gift, Headphones, ChevronLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from './Layout';

interface HomeProps {
  onNavigate: (page: any) => void;
}

import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';

export default function Home({ onNavigate }: HomeProps) {
  const [banners, setBanners] = useState<string[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupBanner, setPopupBanner] = useState<string | null>(null);

  useEffect(() => {
    // Load banners from Firestore
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

    // Load activities from Firestore
    const activitiesRef = collection(db, 'activities');
    const qActivities = query(activitiesRef, orderBy('createdAt', 'desc'));
    const unsubscribeActivities = onSnapshot(qActivities, (snapshot) => {
      const activityData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (activityData.length > 0) {
        setActivities(activityData);
      } else {
        setActivities([
          { id: '1', title: 'Welcome Bonus', imageUrl: 'https://picsum.photos/seed/bonus/400/200' },
          { id: '2', title: 'Daily Rewards', imageUrl: 'https://picsum.photos/seed/daily/400/200' }
        ]);
      }
    });

    // Load pop-up banner from Firestore config
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

    return () => {
      unsubscribeBanners();
      unsubscribeActivities();
      unsubscribeConfig();
    };
  }, []);

  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <Layout onNavigate={onNavigate} activeTab="home">
      {/* Pop-up Banner Modal */}
      <AnimatePresence>
        {showPopup && popupBanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative max-w-sm w-full bg-[#2b3270] rounded-3xl overflow-hidden shadow-2xl border border-blue-500/30"
            >
              <button 
                onClick={() => setShowPopup(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <img 
                src={popupBanner} 
                alt="Announcement" 
                className="w-full aspect-[4/5] object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="p-6 text-center">
                <Button 
                  className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full shadow-lg shadow-blue-900/40"
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col min-h-screen pb-20"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif italic tracking-widest text-[#f8d08c]">LAKSHMI CLUB</h1>
          <Button variant="ghost" size="icon" className="text-blue-300">
            <Bell className="w-6 h-6" />
          </Button>
        </div>

        {/* Banner Slider */}
        <div className="px-4 mb-4">
          <div className="w-full h-44 bg-[#2b3270] rounded-xl overflow-hidden relative border border-blue-700/50">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentBanner}
                src={banners[currentBanner]}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {banners.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentBanner ? 'bg-blue-400' : 'bg-white/30'}`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Notification */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 bg-[#2b3270] p-3 rounded-full border border-blue-900/50">
            <Bell className="w-4 h-4 text-orange-400" />
            <div className="flex-1 overflow-hidden">
              <motion.p 
                animate={{ x: [300, -300] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="text-[10px] text-blue-100 whitespace-nowrap"
              >
                Welcome to LAKSHMI CLUB! Most popular game site in India. Stable, Safe & Fast.
              </motion.p>
            </div>
            <MessageSquare className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        {/* Popular Lottery Section */}
        <div className="px-4 mb-6 space-y-4">
          <h3 className="text-lg font-bold text-white pl-2 border-l-4 border-blue-400">Popular Lottery</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Left large card */}
            <div className="space-y-4">
              <motion.div 
                whileTap={{ scale: 0.98 }}
                className="h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-3 relative overflow-hidden shadow-lg cursor-pointer"
                onClick={() => onNavigate('wingo')}
              >
                <div className="relative z-10 space-y-1">
                  <h4 className="text-sm font-bold text-white">Trx 1Min</h4>
                  <p className="text-[10px] text-blue-100 opacity-80">Countdown to lottery</p>
                  <div className="flex gap-1 mt-2">
                    <div className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">00</div>
                    <div className="text-white">:</div>
                    <div className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">60</div>
                  </div>
                </div>
                <div className="absolute -right-2 -bottom-2 opacity-30">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <Timer className="w-10 h-10 text-blue-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileTap={{ scale: 0.98 }}
                className="h-32 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-3 relative overflow-hidden shadow-lg cursor-pointer"
                onClick={() => onNavigate('wingo')}
              >
                <div className="relative z-10 space-y-1">
                  <h4 className="text-sm font-bold text-white">5D 1Min</h4>
                  <p className="text-[10px] text-white/80">Countdown to lottery</p>
                  <div className="flex gap-1 mt-2">
                    <div className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">00</div>
                    <div className="text-white">:</div>
                    <div className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">60</div>
                  </div>
                </div>
                <div className="absolute -right-2 -bottom-2 opacity-30">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <Timer className="w-10 h-10 text-red-600" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right tall card */}
            <motion.div 
              whileTap={{ scale: 0.98 }}
              className="h-full bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 relative overflow-hidden shadow-lg cursor-pointer flex flex-col justify-between"
              onClick={() => onNavigate('wingo')}
            >
              <div className="relative z-10 space-y-1">
                <h4 className="text-sm font-bold text-white">WinGo 1Min</h4>
                <p className="text-[10px] text-white/80">Countdown to lottery</p>
                <div className="flex gap-1 mt-2">
                  <div className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">00</div>
                  <div className="text-white">:</div>
                  <div className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">60</div>
                </div>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20">
                  <Timer className="w-12 h-12 text-white" />
                </div>
                <div className="flex gap-1">
                  {[2, 6, 7, 8, 0].map((n, i) => (
                    <div key={i} className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold text-white">{n}</div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Lottery List Section */}
        <div className="px-4 mb-6 space-y-4">
          <h3 className="text-lg font-bold text-white pl-2 border-l-4 border-blue-400">Lottery</h3>
          <div className="space-y-3">
            {[
              { name: 'Win Go', icon: '🎰', color: 'from-blue-600 to-blue-800' },
              { name: 'K3', icon: '🎲', color: 'from-purple-600 to-purple-800' },
            ].map((game, i) => (
              <motion.div 
                key={i}
                whileTap={{ scale: 0.98 }}
                className="bg-[#2b3270] rounded-2xl overflow-hidden shadow-lg border border-blue-900/50 flex items-center p-3 gap-4 cursor-pointer"
                onClick={() => onNavigate('wingo')}
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-3xl shadow-inner`}>
                  {game.icon}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-bold text-white">{game.name}</h4>
                    <Button size="sm" className="h-7 bg-blue-500 hover:bg-blue-600 text-white text-[10px] px-4 rounded-full">GO</Button>
                  </div>
                  <div className="bg-blue-900/30 p-2 rounded-lg flex justify-between items-center">
                    <span className="text-[10px] text-blue-300">The highest bonus in history</span>
                    <span className="text-[10px] font-bold text-blue-400">₹0.00</span>
                  </div>
                  <p className="text-[8px] text-blue-400 leading-tight">Through the platform WIN GO Hash lottery seed as the result of the lottery</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Latest Offers & Events Section */}
        <div className="px-4 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white pl-2 border-l-4 border-blue-400">Offers & Events</h3>
            <Button variant="ghost" size="sm" className="text-blue-400 text-xs" onClick={() => onNavigate('activity')}>
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {activities.slice(0, 3).map((activity: any) => (
              <motion.div 
                key={activity.id}
                whileTap={{ scale: 0.98 }}
                className="min-w-[200px] h-28 bg-[#2b3270] rounded-xl overflow-hidden relative border border-blue-900/50 flex-shrink-0"
                onClick={() => onNavigate('activity')}
              >
                <img src={activity.imageUrl} alt={activity.title} className="absolute inset-0 w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex flex-col justify-end">
                  <h4 className="text-xs font-bold text-white truncate">{activity.title}</h4>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
