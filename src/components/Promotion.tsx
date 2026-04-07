import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Users, TrendingUp, Copy, ChevronRight, LayoutGrid, History, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import Layout from './Layout';

import { User } from '../types';

interface PromotionProps {
  onNavigate: (page: any) => void;
  user: User;
}

export default function Promotion({ onNavigate, user }: PromotionProps) {
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
        className="flex flex-col min-h-screen pb-20 bg-[#1a1a2e]"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-center bg-[#2b3270] text-white relative">
          <h1 className="text-lg font-bold">Promotion</h1>
        </div>

        {/* Top Tabs */}
        <Tabs defaultValue="data" className="w-full">
          <TabsList className="w-full h-12 bg-[#2b3270] rounded-none border-b border-blue-900/50">
            <TabsTrigger value="data" className="flex-1 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none text-xs">Data</TabsTrigger>
            <TabsTrigger value="team" className="flex-1 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none text-xs">My Team</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none text-xs">History</TabsTrigger>
            <TabsTrigger value="tutorial" className="flex-1 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none text-xs">Tutorial</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="m-0 p-4 space-y-4">
            {/* Commission Card */}
            <Card className="border-none bg-blue-600 text-white overflow-hidden">
              <CardContent className="p-8 flex flex-col items-center space-y-4">
                <h2 className="text-5xl font-bold">0</h2>
                <div className="bg-white/20 px-4 py-1 rounded-full text-xs font-medium">
                  Yesterday's total commission
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[10px] opacity-80">Upgrade the level to increase commission income</p>
                  <p className="text-xs font-bold text-yellow-300">Earn 30% of your referred users' deposits!</p>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <Card className="border-none bg-[#2b3270] overflow-hidden">
              <div className="grid grid-cols-2 border-b border-blue-900/50">
                <div className="p-3 text-center border-r border-blue-900/50">
                  <p className="text-xs font-medium text-blue-200">Direct subordinates</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-xs font-medium text-blue-200">Team subordinates</p>
                </div>
              </div>
              <div className="grid grid-cols-2">
                {/* Direct Stats */}
                <div className="p-4 space-y-4 border-r border-blue-900/50">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">0</p>
                    <p className="text-[10px] text-blue-300">number of register</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-400">0</p>
                    <p className="text-[10px] text-blue-300">Deposit number</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-400">0</p>
                    <p className="text-[10px] text-blue-300">Deposit amount</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">0</p>
                    <p className="text-[10px] text-blue-300">Number of people making first deposit</p>
                  </div>
                </div>
                {/* Team Stats */}
                <div className="p-4 space-y-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">0</p>
                    <p className="text-[10px] text-blue-300">number of register</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-400">0</p>
                    <p className="text-[10px] text-blue-300">Deposit number</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-400">0</p>
                    <p className="text-[10px] text-blue-300">Deposit amount</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">0</p>
                    <p className="text-[10px] text-blue-300">Number of people making first deposit</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                variant="ghost" 
                className="w-full h-14 bg-[#2b3270] hover:bg-[#363d85] text-white justify-start gap-4 px-6 rounded-xl border border-blue-900/50"
                onClick={() => handleCopy(inviteCode, 'Invitation Code')}
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm font-medium">Copy Invitation Code</span>
              </Button>

              <Button 
                variant="ghost" 
                className="w-full h-14 bg-[#2b3270] hover:bg-[#363d85] text-white justify-start gap-4 px-6 rounded-xl border border-blue-900/50"
                onClick={() => handleCopy(inviteLink, 'Invitation Link')}
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm font-medium">Copy Link</span>
              </Button>

              <Button 
                variant="ghost" 
                className="w-full h-14 bg-[#2b3270] hover:bg-[#363d85] text-white justify-start gap-4 px-6 rounded-xl border border-blue-900/50"
                onClick={() => toast.info('Downline data coming soon!')}
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm font-medium flex-1 text-left">Downline Data</span>
                <ChevronRight className="w-5 h-5 text-blue-400" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="team" className="p-4">
            <div className="flex flex-col items-center justify-center py-20 text-blue-300">
              <Users className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">No team data available yet</p>
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-4">
            <div className="flex flex-col items-center justify-center py-20 text-blue-300">
              <History className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">No history records found</p>
            </div>
          </TabsContent>

          <TabsContent value="tutorial" className="p-4">
            <div className="space-y-6">
              <div className="bg-[#2b3270] p-6 rounded-2xl border border-blue-900/50 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" /> Referral Program
                </h3>
                <div className="space-y-4 text-sm text-blue-100">
                  <div className="p-4 bg-blue-900/30 rounded-xl border border-blue-800/50">
                    <p className="font-bold text-blue-400 mb-1">How it works?</p>
                    <p className="text-xs opacity-80">Invite your friends using your unique invitation link or code. When they register and make a deposit, you earn a commission.</p>
                  </div>
                  
                  <div className="p-4 bg-blue-900/30 rounded-xl border border-blue-800/50">
                    <p className="font-bold text-green-400 mb-1">Commission Rate</p>
                    <p className="text-xs opacity-80">You will receive <span className="text-white font-bold">30%</span> of every deposit made by your direct subordinates.</p>
                  </div>

                  <div className="p-4 bg-blue-900/30 rounded-xl border border-blue-800/50">
                    <p className="font-bold text-orange-400 mb-1">When do I get paid?</p>
                    <p className="text-xs opacity-80">Commissions are calculated daily and added to your promotion balance. You can withdraw them to your main wallet at any time.</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </Layout>
  );
}
