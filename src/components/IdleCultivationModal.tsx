import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { awardDirectQi } from '../lib/qi';
import { auth } from '../lib/firebase';

function GlobalQiParticles({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[110] flex items-center justify-center overflow-hidden">
      {Array.from({ length: 60 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const radius = 200 + Math.random() * window.innerWidth * 0.5;
        const startX = Math.cos(angle) * radius;
        const startY = Math.sin(angle) * radius;
        
        // Target is approximately the vessel at the top center of modal
        const targetX = 0;
        const targetY = -110; 
        
        const delay = Math.random() * 0.4;
        const duration = 0.6 + Math.random() * 0.5;
        
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: startX, y: startY, scale: Math.random() * 0.5 + 0.5 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              x: targetX, 
              y: targetY, 
              scale: [Math.random() * 0.5 + 0.5, 1.5, 2, 0] 
            }}
            transition={{ duration, delay, ease: "easeIn" }}
            className="absolute w-2 h-2 rounded-full bg-portal shadow-[0_0_20px_rgba(4,172,255,1)]"
            style={{ filter: 'blur(1px)' }}
          />
        );
      })}
    </div>
  );
}

interface Props {
  qiEarned: number | null;
  onClose: () => void;
}

export function IdleCultivationModal({ qiEarned, onClose }: Props) {
  const { userProfile, setUserProfile } = useAppStore();
  const [isClaiming, setIsClaiming] = useState(false);

  if (qiEarned === null) return null;

  const handleClaim = async () => {
    setIsClaiming(true);
    // Award Qi
    if (auth.currentUser) {
      await awardDirectQi(qiEarned, `idle-cultivation-${Date.now()}`);
    }
    
    // Update local profile instantly
    if (userProfile) {
      const updated = {
        ...userProfile,
        dao_xp: (userProfile.dao_xp || 0) + qiEarned,
        qi: (userProfile.qi || 0) + qiEarned,
      };
      setUserProfile(updated);
    }
    
    setTimeout(() => {
      setIsClaiming(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <GlobalQiParticles isActive={isClaiming} />
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#050505] border border-portal/30 w-full max-w-md rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(4,172,255,0.15)] relative"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-portal/0 via-portal to-portal/0" />
          
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-portal/10 border border-portal/30 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-portal/20 animate-ping opacity-50" style={{ animationDuration: '3s' }} />
              <Wind className={`text-portal w-10 h-10 ${isClaiming ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-display text-signal">Closed-Door Cultivation</h2>
              <p className="text-sm font-serif text-neutral-400">
                While you were away from the mortal realm, your avatar continued to cultivate the Dao in silence.
              </p>
            </div>
            
            <div className="bg-black border border-neutral-900 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute -inset-4 bg-gradient-to-tr from-portal/10 to-transparent blur-xl" />
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-xs font-sc tracking-widest text-neutral-500 uppercase mb-2">Idle Qi Gathered</span>
                <span className="text-5xl font-display text-portal drop-shadow-[0_0_15px_rgba(4,172,255,0.5)]">+{qiEarned}</span>
              </div>
            </div>

            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full relative group bg-portal/10 border border-portal/50 hover:bg-portal hover:text-void text-portal px-6 py-4 rounded-xl font-sc uppercase tracking-widest font-bold text-sm transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
              {isClaiming ? 'Absorbing Qi...' : 'Claim & Awaken'}
            </button>
            
            <p className="text-[10px] font-mono text-neutral-600">Idle accumulation caps after 24 hours.</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
