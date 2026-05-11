import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useDatabase } from '../hooks/useDatabase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, MapPin, Smartphone, UserPlus, LogIn } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { UserRole } from '../types';

export function AuthView() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { createUserProfile, getUserProfile } = useDatabase();
  const { setAuth } = useAppStore();


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert('Email aur password bhariye');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      const profile = await getUserProfile(data.user.id);
      setAuth(profile);
    } catch (e: any) {
      alert(e.message || 'Login fail ho gaya');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !phone || !place) {
      return alert('Saari jankari bhariye');
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('User create nahi ho paya');

      const profile = {
        uid: data.user.id,
        fullName,
        phoneNumber: phone,
        email: email,
        place,
        role: (phone === '9999999999' || email === 'apnidukan@gmail.com') ? 'admin' : 'customer' as UserRole,
        trustLabel: 'normal' as const,
        creditLimit: 500,
        balance: 0,
        lastActive: new Date().toISOString(),
      };

      await createUserProfile(profile);
      setAuth(profile);
    } catch (e: any) {
      alert(e.message || 'Registration fail ho gaya');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F9FB] p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#06833E]/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#06833E]/10 rounded-full blur-3xl"></div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm space-y-8 relative z-10"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-[#06833E]/10 border border-[#06833E]/5">
            <div className="h-14 w-14 rounded-2xl bg-[#06833E] flex items-center justify-center text-3xl">
               🏪
            </div>
          </div>
          <h1 className="text-4xl font-black text-[#06833E] tracking-tight">ApniDukan</h1>
          <p className="text-sm font-bold text-gray-400">
            {mode === 'login' ? 'Wapas swagat hai!' : 'Naya account banaiye'}
          </p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100">
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            <div className="space-y-3">
                <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <Input 
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 bg-[#F7F9FB] border-none focus:ring-2 focus:ring-[#06833E]/20 rounded-2xl font-medium"
                    required
                />
                </div>
                <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <Input 
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-14 bg-[#F7F9FB] border-none focus:ring-2 focus:ring-[#06833E]/20 rounded-2xl font-medium"
                    required
                />
                </div>

                {mode === 'register' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 overflow-hidden pt-1"
                >
                    <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                    <Input 
                        placeholder="Poora Naam"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-12 h-14 bg-[#F7F9FB] border-none focus:ring-2 focus:ring-[#06833E]/20 rounded-2xl font-medium"
                        required
                    />
                    </div>
                    <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                    <Input 
                        type="tel"
                        placeholder="Phone Number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-12 h-14 bg-[#F7F9FB] border-none focus:ring-2 focus:ring-[#06833E]/20 rounded-2xl font-medium"
                        required
                    />
                    </div>
                    <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                    <Input 
                        placeholder="Gaon / Jagah ka naam"
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        className="pl-12 h-14 bg-[#F7F9FB] border-none focus:ring-2 focus:ring-[#06833E]/20 rounded-2xl font-medium"
                        required
                    />
                    </div>
                </motion.div>
                )}
            </div>

            <Button 
                type="submit"
                loading={loading}
                className="w-full h-16 text-lg font-black rounded-2xl bg-[#06833E] hover:bg-[#008037] border-none shadow-xl shadow-[#06833E]/20 mt-6"
            >
                {mode === 'login' ? (
                <><LogIn className="mr-2 h-5 w-5" /> Login Karein</>
                ) : (
                <><UserPlus className="mr-2 h-5 w-5" /> Register Karein</>
                )}
            </Button>

            <div className="text-center pt-4">
                <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-sm font-bold text-[#06833E] hover:underline transition-all"
                >
                {mode === 'login' ? "Naya account chahiye? Register karein" : "Pehle se account hai? Login karein"}
                </button>
            </div>
            </form>
        </div>
        
        <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Made with ❤️ for Rural India
        </p>
      </motion.div>
    </div>
  );
}

