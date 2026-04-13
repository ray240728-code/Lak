import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, Lock, Eye, EyeOff, UserPlus, Headphones } from 'lucide-react';
import { toast } from 'sonner';

interface RegisterProps {
  onNavigate: (page: any) => void;
  onRegister: (phone: string, password: string, inviteCode: string) => void;
}

export default function Register({ onNavigate, onRegister }: RegisterProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite') || params.get('inv');
    if (invite) {
      setInviteCode(invite);
    }
  }, []);

  const handleRegister = () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (!password || password.length < 5) {
      toast.error('Password must be at least 5 characters');
      return;
    }
    onRegister(phone, password, inviteCode);
  };

  return (
    <div className="min-h-screen bg-[#2b3270] flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between text-white">
        <div className="w-10" /> {/* Spacer instead of close button */}
        <h1 className="text-2xl font-serif italic tracking-widest text-[#f8d08c]">LAKSHMI CLUB</h1>
        <div className="flex items-center gap-1">
          <img src="https://flagcdn.com/us.svg" alt="EN" className="w-6 h-4" />
          <span className="text-sm font-bold">EN</span>
        </div>
      </div>

      {/* Register Type Toggle */}
      <div className="flex bg-[#3a448c]">
        <button className="flex-1 py-3 flex flex-col items-center gap-1 border-b-2 border-blue-400 text-blue-400">
          <Phone className="w-5 h-5" />
          <span className="text-xs font-bold">Register your phone</span>
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-blue-100">
              <Phone className="w-4 h-4 text-blue-400" /> Phone number
            </label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 px-3 bg-[#3a448c] rounded-md border border-blue-900/50 text-white">
                <span className="text-sm">+91</span>
                <span className="text-[10px] text-blue-300">▼</span>
              </div>
              <Input 
                placeholder="Please enter the phone nur" 
                className="bg-[#3a448c] border-blue-900/50 text-white placeholder:text-blue-300/50"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-blue-100">
              <Lock className="w-4 h-4 text-blue-400" /> Set password
            </label>
            <div className="relative">
              <Input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Please enterSet password" 
                className="bg-[#3a448c] border-blue-900/50 text-white pr-10 placeholder:text-blue-300/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-blue-100">
              <UserPlus className="w-4 h-4 text-blue-400" /> Invite code
            </label>
            <Input 
              placeholder="Please enter the invitation code" 
              className="bg-[#3a448c] border-blue-900/50 text-white placeholder:text-blue-300/50"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="agree" className="border-blue-400 data-[state=checked]:bg-blue-400" />
            <label htmlFor="agree" className="text-xs text-blue-200">I have read and agree <span className="text-blue-400">【Privacy Agreement】</span></label>
          </div>
        </div>

        <div className="space-y-4">
          <Button 
            className="w-full h-12 bg-blue-400 hover:bg-blue-500 text-white font-bold text-lg rounded-full"
            onClick={handleRegister}
          >
            Register
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12 border-blue-400 text-blue-400 hover:bg-blue-400/10 font-bold text-lg rounded-full"
            onClick={() => onNavigate('login')}
          >
            I have an account <span className="ml-2 text-blue-400">Login</span>
          </Button>
        </div>

        <div className="pt-8 pb-4 text-center">
          <p className="text-[10px] font-bold tracking-widest text-blue-300/40 uppercase">
            Fair Play Partner by ADX
          </p>
        </div>
      </div>
    </div>
  );
}
