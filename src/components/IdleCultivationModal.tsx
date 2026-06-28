import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { awardDirectQi } from '../lib/qi';
import { auth } from '../lib/firebase';

function GlobalQiParticles({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[110] flex items-center justify-center overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const radius = 100 + Math.random() * window.innerWidth * 0.3;
        const startX = Math.cos(angle) * radius;
        const startY = Math.sin(angle) * radius;
        
        const targetX = 0;
        const targetY = -150; 
        
        const delay = Math.random() * 0.3;
        const duration = 0.5 + Math.random() * 0.4;
        
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
  const userProfile = useAppStore(state => state.userProfile);
    const setUserProfile = useAppStore(state => state.setUserProfile);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = async () => {
    if (isClaiming) return;
    setIsClaiming(true);
    
    try {
      if (auth.currentUser && qiEarned) {
        await awardDirectQi(qiEarned, `idle-cultivation-${Date.now()}`);
      }
      
      if (userProfile && qiEarned) {
        const updated = {
          ...userProfile,
          dao_xp: (userProfile.dao_xp || 0) + qiEarned,
          qi: (userProfile.qi || 0) + qiEarned,
          heavenly_qi: (userProfile.heavenly_qi || userProfile.dao_xp || 0) + qiEarned,
          sect_qi: (userProfile.sect_qi || 0) + qiEarned,
        };
        setUserProfile(updated);
      }
    } catch (e) {
      console.error("Failed to claim idle qi:", e);
    } finally {
      setTimeout(() => {
        setIsClaiming(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <>
      <GlobalQiParticles isActive={isClaiming} />
      <AnimatePresence>
        {qiEarned !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-[100] sm:w-[320px] bg-[#050505]/95 backdrop-blur-xl border border-portal/20 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(4,172,255,0.15)]"
          >
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-portal/0 via-portal/50 to-portal/0" />
            
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-portal/10 border border-portal/30 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-portal/20 animate-ping opacity-50" style={{ animationDuration: '3s' }} />
                  <Wind className={`text-portal w-5 h-5 ${isClaiming ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
                </div>
                
                <div className="flex-1 space-y-1">
                  <h2 className="text-sm font-display text-signal">Closed-Door Cultivation</h2>
                  <p className="text-[11px] font-serif text-neutral-400 leading-tight">
                    Your avatar cultivated in silence while you were away.
                  </p>
                </div>
              </div>
              
              <div className="bg-black/60 border border-neutral-900/50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-[10px] font-sc tracking-widest text-neutral-500 uppercase">Idle Qi Gathered</span>
                <span className="text-xl font-display text-portal drop-shadow-[0_0_10px_rgba(4,172,255,0.3)]">+{qiEarned}</span>
              </div>

              <button
                tabIndex={0} 
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} 
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full relative group bg-portal/10 border border-portal/30 hover:bg-portal hover:text-void text-portal px-4 py-2.5 rounded-lg font-sc uppercase tracking-widest font-bold text-xs transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                {isClaiming ? 'Absorbing...' : 'Claim & Awaken'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
