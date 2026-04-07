import React from 'react';
import { Home, Trophy, Gem, Wallet, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: any) => void;
  activeTab: 'home' | 'activity' | 'promotion' | 'wallet' | 'profile';
}

export default function Layout({ children, onNavigate, activeTab }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white font-sans relative">
      {children}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#2b3270] border-t border-blue-900/50 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-blue-400' : 'text-blue-200/50'}`}
            onClick={() => onNavigate('home')}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'activity' ? 'text-blue-400' : 'text-blue-200/50'}`}
            onClick={() => onNavigate('activity')}
          >
            <Trophy className="w-6 h-6" />
            <span className="text-[10px] font-bold">Activity</span>
          </button>
          <button 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'promotion' ? 'text-blue-400' : 'text-blue-200/50'}`}
            onClick={() => onNavigate('promotion')}
          >
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center -mt-8 shadow-lg shadow-blue-900/50 border-4 border-[#1a1a2e]">
              <Gem className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-bold">Promotion</span>
          </button>
          <button 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'wallet' ? 'text-blue-400' : 'text-blue-200/50'}`}
            onClick={() => onNavigate('wallet')}
          >
            <Wallet className="w-6 h-6" />
            <span className="text-[10px] font-bold">Wallet</span>
          </button>
          <button 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-blue-400' : 'text-blue-200/50'}`}
            onClick={() => onNavigate('profile')}
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
