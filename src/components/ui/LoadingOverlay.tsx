import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function LoadingOverlay() {
  const globalLoading = useAppStore((state) => state.globalLoading);

  return (
    <AnimatePresence>
      {globalLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white shadow-2xl border border-gray-100">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-[#06833E]/10 border-t-[#06833E] animate-spin" />
              <Loader2 className="absolute inset-0 m-auto h-6 w-6 text-[#06833E] animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-900">Rukiye zara..</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Processing your request</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
