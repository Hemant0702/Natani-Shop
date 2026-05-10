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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { createUserProfile, getUserProfile } = useDatabase();
  const { setAuth } = useAppStore();

  const getEmailFromUsername = (user: string) => `${user.toLowerCase().replace(/[^a-z0-9]/g, '')}@dukaan.local`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return alert('Username aur password bhariye');
    setLoading(true);
    try {
      const email = getEmailFromUsername(username);
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
    if (!username || !password || !fullName || !phone || !place) {
      return alert('Saari jankari bhariye');
    }
    
    setLoading(true);
    try {
      const email = getEmailFromUsername(username);
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
        role: (phone === '9999999999') ? 'owner' : 'customer' as UserRole,
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F9FB] p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm space-y-8 rounded-[2rem] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
      >
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Hone Dukaan</h2>
          <p className="mt-2 text-sm text-gray-500 font-bold">
            {mode === 'login' ? 'Wapas swagat hai!' : 'Naya account banaiye'}
          </p>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <Input 
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-12 h-14 bg-gray-50 border-transparent focus:bg-white rounded-2xl"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <Input 
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 h-14 bg-gray-50 border-transparent focus:bg-white rounded-2xl"
                required
              />
            </div>

            {mode === 'register' && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  <div className="relative">
                    <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input 
                      placeholder="Poora Naam"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-12 h-14 bg-gray-50 border-transparent focus:bg-white rounded-2xl"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input 
                      type="tel"
                      placeholder="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-12 h-14 bg-gray-50 border-transparent focus:bg-white rounded-2xl"
                      required
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input 
                      placeholder="Gaon / Jagah ka naam"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      className="pl-12 h-14 bg-gray-50 border-transparent focus:bg-white rounded-2xl"
                      required
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          <Button 
            type="submit"
            loading={loading}
            className="w-full h-14 text-base font-black rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 border-none shadow-xl shadow-orange-500/20 mt-6"
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
              className="text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors"
            >
              {mode === 'login' ? "Naya account chahiye? Register karein" : "Pehle se account hai? Login karein"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

