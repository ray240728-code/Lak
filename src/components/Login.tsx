import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, Lock, Eye, EyeOff, ShieldCheck, Headphones } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onNavigate: (page: any) => void;
  onLogin: (phone: string, password: string) => void;
  onGoogleLogin: () => void;
  loading?: boolean;
}

export default function Login({ onNavigate, onLogin, onGoogleLogin, loading }: LoginProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();
    if (!trimmedPhone) {
      toast.error('Please enter your phone number');
      return;
    }
    if (!trimmedPassword) {
      toast.error('Please enter your password');
      return;
    }
    onLogin(trimmedPhone, trimmedPassword);
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

      {/* Banner Text */}
      <div className="px-6 py-4 bg-black/10">
        <p className="text-xs text-red-100 opacity-80">Please log in with your phone number or email</p>
        <p className="text-xs text-red-100 opacity-80">If you forget your password, please contact customer service</p>
      </div>

      {/* Login Type Toggle */}
      <div className="flex bg-black/20">
        <button className="flex-1 py-3 flex flex-col items-center gap-1 border-b-2 border-white text-white">
          <Phone className="w-5 h-5" />
          <span className="text-xs font-bold">Log in with phone</span>
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
              <Lock className="w-4 h-4 text-red-200" /> Password
            </label>
            <div className="relative">
              <Input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Please enter your password" 
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

          <div className="flex items-center gap-2">
            <Checkbox id="remember" className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-red-600" />
            <label htmlFor="remember" className="text-xs text-red-100">Remember password</label>
          </div>
        </div>

        <div className="space-y-4">
          <Button 
            className="w-full h-12 bg-white text-red-600 hover:bg-gray-100 font-bold text-lg rounded-full shadow-lg"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              'Log in'
            )}
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12 border-white text-white hover:bg-white/10 font-bold text-lg rounded-full"
            onClick={() => onNavigate('register')}
          >
            Register
          </Button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-red-600 px-2 text-red-100">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12 border-white text-white hover:bg-white/10 font-bold rounded-full flex items-center justify-center gap-2"
            onClick={onGoogleLogin}
            disabled={loading}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            Login with Google
          </Button>
        </div>

        <div className="flex justify-around pt-10">
          <button 
            className="flex flex-col items-center gap-2 text-red-100"
            onClick={() => toast.info('Please contact support to reset your password.', {
              description: 'Admin can also reset your password from the Admin Panel.'
            })}
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-xs">Forgot password</span>
          </button>
          <button className="flex flex-col items-center gap-2 text-red-100">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <span className="text-xs">Customer Service</span>
          </button>
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
