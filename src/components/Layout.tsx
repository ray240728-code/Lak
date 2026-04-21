import React from 'react';
import { Home, Trophy, Gem, Wallet, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: any) => void;
  activeTab: 'home' | 'activity' | 'promotion' | 'wallet' | 'profile';
}

export default function Layout({ children, onNavigate, activeTab }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8f3f3] text-gray-900 font-sans relative">
      {children}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto px-2 h-16 flex items-center justify-between relative">
          <button 
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${activeTab === 'home' ? 'text-[#ff4d4d]' : 'text-gray-400'}`}
            onClick={() => onNavigate('home')}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button 
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${activeTab === 'activity' ? 'text-[#ff4d4d]' : 'text-gray-400'}`}
            onClick={() => onNavigate('activity')}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] font-medium">Activity</span>
          </button>
          
          {/* Center Diamond Button */}
          <div className="flex-1 flex justify-center -mt-6 relative z-10">
            <button 
              className={`w-14 h-14 rounded-full bg-gradient-to-b from-[#ff7e7e] to-[#ff4d4d] flex items-center justify-center shadow-lg shadow-red-200 border-4 border-white transition-transform active:scale-95`}
              onClick={() => onNavigate('promotion')}
            >
              <Gem className="w-7 h-7 text-white" />
            </button>
          </div>

          <button 
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${activeTab === 'wallet' ? 'text-[#ff4d4d]' : 'text-gray-400'}`}
            onClick={() => onNavigate('wallet')}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium">Wallet</span>
          </button>
          <button 
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${activeTab === 'profile' ? 'text-[#ff4d4d]' : 'text-gray-400'}`}
            onClick={() => onNavigate('profile')}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Account</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
