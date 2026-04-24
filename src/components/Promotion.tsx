import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ChevronRight, Filter, ClipboardList, DollarSign, BookOpen, Share2, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import Layout from './Layout';

import { User } from '../types';

interface PromotionProps {
  onNavigate: (page: any) => void;
  user: User;
}

export default function Promotion({ onNavigate, user }: PromotionProps) {
  const [showRules, setShowRules] = useState(false);
  const inviteCode = user.id;
  const inviteLink = `${window.location.origin}/register?invite=${inviteCode}`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <Layout onNavigate={onNavigate} activeTab="promotion">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col min-h-screen pb-24 bg-[#f8f3f3]"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] text-white sticky top-0 z-50 shadow-md">
          <div className="w-10" />
          <h1 className="text-lg font-bold">Agency</h1>
          <button className="w-10 flex justify-end">
            <Filter className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Top Commission Section */}
        <div className="bg-gradient-to-b from-[#ff7e7e] to-[#ff4d4d] p-8 flex flex-col items-center space-y-3">
          <h2 className="text-5xl font-bold text-white">0</h2>
          <div className="bg-white/90 px-6 py-1 rounded-full text-[11px] font-bold text-[#ff4d4d] shadow-sm">
            Yesterday's total commission
          </div>
          <p className="text-[10px] text-white/80 font-medium">Upgrade the level to increase commission income</p>
        </div>

        {/* Stats Grid */}
        <div className="px-4 -mt-4">
          <Card className="border-none shadow-md overflow-hidden bg-white rounded-xl">
            <div className="grid grid-cols-2">
              <div className="p-3 text-center bg-[#ff7e7e] text-white font-bold text-sm">
                Direct subordinates
              </div>
              <div className="p-3 text-center bg-[#ff7e7e] text-white font-bold text-sm opacity-90">
                Team subordinates
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              {/* Direct Stats */}
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <p className="text-base font-bold text-gray-800">{user.referralCount || 0}</p>
                  <p className="text-[10px] text-gray-400 font-medium">number of register</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-green-500">{user.referralDepositCount || 0}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Deposit number</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-orange-400">₹{user.referralDepositAmount || 0}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Deposit amount</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-gray-800">{user.referralDepositCount || 0}</p>
                  <p className="text-[10px] text-gray-400 font-medium leading-tight">Number of people making first deposit</p>
                </div>
              </div>
              {/* Team Stats */}
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <p className="text-base font-bold text-gray-800">0</p>
                  <p className="text-[10px] text-gray-400 font-medium">number of register</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-green-500">0</p>
                  <p className="text-[10px] text-gray-400 font-medium">Deposit number</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-orange-400">0</p>
                  <p className="text-[10px] text-gray-400 font-medium">Deposit amount</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-gray-800">0</p>
                  <p className="text-[10px] text-gray-400 font-medium leading-tight">Number of people making first deposit</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Invitation Link Button */}
        <div className="px-4 mt-6">
          <Button 
            className="w-full h-12 bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] hover:opacity-90 text-white font-black text-sm tracking-widest rounded-full shadow-lg shadow-red-100"
            onClick={() => handleCopy(inviteLink, 'Invitation Link')}
          >
            INVITATION LINK
          </Button>
        </div>

        {/* Menu List */}
        <div className="px-4 mt-6 space-y-3">
          <button 
            className="w-full h-16 bg-white rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-gray-50 transition-colors"
            onClick={() => handleCopy(inviteCode, 'Invitation Code')}
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-red-500" />
            </div>
            <span className="flex-1 text-left text-sm font-bold text-gray-700">Copy invitation code</span>
            <span className="text-xs font-mono text-gray-400 mr-2">{inviteCode.slice(0, 12)}...</span>
            <Copy className="w-4 h-4 text-gray-300" />
          </button>

          <button 
            className="w-full h-16 bg-white rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-gray-50 transition-colors"
            onClick={() => toast.info('Subordinate data coming soon!')}
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-red-500" />
            </div>
            <span className="flex-1 text-left text-sm font-bold text-gray-700">Subordinate data</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>

          <button 
            className="w-full h-16 bg-white rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-gray-50 transition-colors"
            onClick={() => toast.info('Commission detail coming soon!')}
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-500" />
            </div>
            <span className="flex-1 text-left text-sm font-bold text-gray-700">Commission detail</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>

          <button 
            className="w-full h-16 bg-white rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-gray-50 transition-colors"
            onClick={() => setShowRules(true)}
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-red-500" />
            </div>
            <span className="flex-1 text-left text-sm font-bold text-gray-700">Invitation rules</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Rules Modal */}
        <AnimatePresence>
          {showRules && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowRules(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl overflow-hidden"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Invitation Rules</h3>
                  <button onClick={() => setShowRules(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <p className="text-lg font-black text-red-500 text-center uppercase tracking-tighter">
                      Get 30% Bonus
                    </p>
                    <p className="text-[10px] text-red-400 font-bold text-center uppercase tracking-widest mt-1">
                      On friend's first deposit
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { icon: Share2, title: "Share Link", desc: "Share your referral link or code with friends." },
                      { icon: Users, title: "Invite Friends", desc: "When your friend registers, they become your subordinate." },
                      { icon: DollarSign, title: "Earn Bonus", desc: "You will receive a 30% bonus of their first deposit amount instantly." },
                      { icon: ClipboardList, title: "Auto-Credit", desc: "Bonuses are credited directly to your wallet balance." }
                    ].map((rule, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                          <rule.icon className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{rule.title}</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{rule.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-[10px] text-gray-400 font-medium text-center">
                      Note: The reward system is automated. Attempting to create duplicate accounts will result in immediate ban for both referrer and member.
                    </p>
                  </div>

                  <Button 
                    className="w-full h-12 bg-[#ff4d4d] hover:bg-[#ff3333] text-white font-black tracking-widest rounded-xl"
                    onClick={() => setShowRules(false)}
                  >
                    UNDERSTOOD
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
}
