import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface ParticleSystemProps {
  count?: number;
  className?: string;
  color?: string;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ 
  count = 20, 
  className = '',
  color = 'bg-cyan-100' 
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const size = Math.random() * 3 + 1; // 1 to 4px
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const duration = Math.random() * 15 + 10; // 10 to 25s
      const delay = Math.random() * -20; // negative delay to start immediately
      const yOffset = -Math.random() * 100 - 100; // go up by 100 to 200px
      const maxOpacity = Math.random() * 0.4 + 0.2;
      const xOffset = (Math.random() - 0.5) * 60; // sway left/right

      return {
        id: i,
        size,
        top: `${top}%`,
        left: `${left}%`,
        duration,
        delay,
        yOffset,
        xOffset,
        maxOpacity
      };
    });
  }, [count]);

  if (!mounted) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] ${color}`}
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            opacity: 0,
          }}
          animate={{
            y: [0, p.yOffset],
            x: [0, p.xOffset, 0],
            opacity: [0, p.maxOpacity, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
