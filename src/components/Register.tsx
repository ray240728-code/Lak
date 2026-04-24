import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, Lock, Eye, EyeOff, UserPlus, Headphones } from 'lucide-react';
import { toast } from 'sonner';

interface RegisterProps {
  onNavigate: (page: any) => void;
  onRegister: (phone: string, password: string, inviteCode: string) => void;
  loading?: boolean;
}

export default function Register({ onNavigate, onRegister, loading }: RegisterProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite') || params.get('inv');
    if (invite) {
      setInviteCode(invite);
    }
  }, []);

  const handleRegister = () => {
    const trimmedPhone = phone.trim().replace(/\s+/g, '');
    const trimmedPassword = password.trim();
    if (!trimmedPhone || trimmedPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!agreed) {
      toast.error('Please read and agree to the Privacy Agreement');
      return;
    }
    onRegister(trimmedPhone, trimmedPassword, inviteCode.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ff4d4d] to-[#cc0000] flex flex-col">
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
      <div className="flex bg-black/20">
        <button className="flex-1 py-3 flex flex-col items-center gap-1 border-b-2 border-white text-white">
          <Phone className="w-5 h-5" />
          <span className="text-xs font-bold">Register your phone</span>
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-red-50">
              <Phone className="w-4 h-4 text-red-200" /> Phone number
            </label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 px-3 bg-white/10 rounded-md border border-white/20 text-white">
                <span className="text-sm">+91</span>
                <span className="text-[10px] text-red-200">▼</span>
              </div>
              <Input 
                type="tel"
                placeholder="Please enter your phone number" 
                className="bg-white/10 border-white/20 text-white placeholder:text-red-100/50"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-red-50">
              <Lock className="w-4 h-4 text-red-200" /> Set password
            </label>
            <div className="relative">
              <Input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Please set your password" 
                className="bg-white/10 border-white/20 text-white pr-10 placeholder:text-red-100/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-red-200"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-red-50">
              <UserPlus className="w-4 h-4 text-red-200" /> Invite code
            </label>
            <Input 
              placeholder="Please enter the invitation code" 
              className="bg-white/10 border-white/20 text-white placeholder:text-red-100/50"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 py-2">
            <Checkbox 
              id="agree" 
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(!!checked)}
              className="w-5 h-5 border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-red-600" 
            />
            <label htmlFor="agree" className="text-xs text-red-100 leading-relaxed cursor-pointer select-none">
              I have read and agree <span className="text-white font-bold underline">【Privacy Agreement】</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <Button 
            className="w-full h-14 bg-white text-red-600 hover:bg-red-50 hover:scale-[1.01] active:scale-[0.99] font-black uppercase tracking-[0.2em] text-sm rounded-2xl shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              'Register'
            )}
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12 border-white text-white hover:bg-white/10 font-bold text-lg rounded-full"
            onClick={() => onNavigate('login')}
          >
            I have an account <span className="ml-2 text-white underline">Login</span>
          </Button>
        </div>

        <div className="pt-8 pb-4 text-center">
          <p className="text-[10px] font-bold tracking-widest text-red-200/40 uppercase">
            Fair Play Partner by ADX
          </p>
        </div>
      </div>
    </div>
  );
}
