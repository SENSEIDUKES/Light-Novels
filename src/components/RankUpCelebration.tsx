import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { AURA_TIERS, AuraTier } from '../lib/qi';

const resolveColor = (hex: string) => {
  if (hex.startsWith('#')) return hex;
  if (hex === 'gradient-violet-gold') return '#8B5CF6'; // Violet fallback
  if (hex === 'animated-custom') return '#F472B6'; // Pink fallback
  return '#ffffff';
};

export function RankUpCelebration() {
  const profile = useAppStore(state => state.userProfile);
  const currentQi = profile?.dao_xp || profile?.qi || 0;
  
  const [celebrationTier, setCelebrationTier] = useState<AuraTier | null>(null);
  const prevRankRef = useRef<number>(-1);
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (AURA_TIERS.length === 0) return;

    // Find the highest unlocked tier index
    const actualIndex = AURA_TIERS.reduce((highestIndex, tier, index) => {
      if (currentQi >= tier.unlockedAt) {
        return index;
      }
      return highestIndex;
    }, 0);
    
    if (isInitialMount.current) {
      prevRankRef.current = actualIndex;
      isInitialMount.current = false;
      return;
    }
    
    // If rank increased
    if (actualIndex > prevRankRef.current) {
      setCelebrationTier(AURA_TIERS[actualIndex]);
      
      // Auto-hide after 6 seconds
      setTimeout(() => {
        setCelebrationTier(null);
      }, 6000);
    }
    
    prevRankRef.current = actualIndex;
  }, [currentQi]);
  
  return (
    <AnimatePresence>
      {celebrationTier && (
        <motion.div
          key="celebration"
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1 } }}
        >
          {/* Backdrop blur */}
          <motion.div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Confetti / Particle Container */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(40)].map((_, i) => {
              const resolvedColor = resolveColor(celebrationTier.colorHex);
              return (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: resolvedColor,
                    boxShadow: `0 0 10px ${resolvedColor}`,
                    left: '50%',
                    top: '50%',
                  }}
                  initial={{ 
                    scale: 0, 
                    opacity: 1,
                    y: 0,
                    x: 0,
                  }}
                  animate={{
                    scale: [0, Math.random() * 1.5 + 0.5, 0],
                    y: [0, (Math.random() - 0.5) * 1000 - 100],
                    x: [0, (Math.random() - 0.5) * 1000],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    ease: "easeOut",
                    delay: Math.random() * 0.3
                  }}
                />
              );
            })}
          </div>
          
          <motion.div 
            className="relative flex flex-col items-center justify-center p-8 md:p-12 max-w-lg w-full text-center"
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
          >
            {/* Glow Behind */}
            <motion.div 
              className="absolute inset-0 rounded-full blur-[100px] opacity-40 -z-10"
              style={{ backgroundColor: resolveColor(celebrationTier.colorHex) }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 10, delay: 0.2 }}
              className="w-32 h-32 mb-8 rounded-full border-4 shadow-2xl flex items-center justify-center overflow-hidden relative"
              style={{ 
                borderColor: resolveColor(celebrationTier.colorHex),
                boxShadow: `0 0 40px ${resolveColor(celebrationTier.colorHex)}`,
                backgroundColor: 'rgba(0,0,0,0.5)'
              }}
            >
              <div 
                className="absolute inset-0 flex items-center justify-center opacity-80"
                style={{
                   background: `radial-gradient(circle at center, ${resolveColor(celebrationTier.colorHex)}60 0%, transparent 70%)`
                }}
              >
                <span className="text-5xl drop-shadow-lg z-10">✨</span>
              </div>
            </motion.div>
            
            <motion.h3 
              className="text-lg md:text-xl text-neutral-400 font-mono tracking-[0.2em] mb-2 uppercase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Realm Breakthrough
            </motion.h3>
            
            <motion.h1 
              className="text-4xl md:text-5xl font-black mb-4 uppercase tracking-wider"
              style={{ 
                color: resolveColor(celebrationTier.colorHex),
                textShadow: `0 0 20px ${resolveColor(celebrationTier.colorHex)}80` 
              }}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              {celebrationTier.rank}
            </motion.h1>
            
            <motion.p 
              className="text-base md:text-lg text-neutral-300 font-serif italic mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              "{celebrationTier.rewardFeeling}"
            </motion.p>
            
            <motion.div
              className="px-6 py-3 border rounded-full text-xs md:text-sm font-mono tracking-widest uppercase bg-black/40 backdrop-blur"
              style={{ 
                borderColor: `${resolveColor(celebrationTier.colorHex)}50`,
                color: resolveColor(celebrationTier.colorHex)
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              Aura Unlocked: {celebrationTier.name}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
