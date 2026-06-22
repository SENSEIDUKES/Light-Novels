import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MapPin, Swords, User } from 'lucide-react';
import { Character, Faction, Artifact, Location } from '../types';

interface CodexHovercardProps {
  term: string;
  type: 'character' | 'faction' | 'artifact' | 'location';
  entry: Character | Faction | Artifact | Location;
  children: React.ReactNode;
}

export const CodexHovercard: React.FC<CodexHovercardProps> = ({ term, type, entry, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const getIcon = () => {
    switch (type) {
      case 'character': return <User size={14} className="text-portal" />;
      case 'faction': return <Shield size={14} className="text-[#0f5132]" />; // emerald/jade substitute
      case 'artifact': return <Swords size={14} className="text-[#d4af37]" />; // gold-accent substitute
      case 'location': return <MapPin size={14} className="text-[#8b5a2b]" />; // amber/sepia substitute
      default: return null;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'character': return 'border-portal/30';
      case 'faction': return 'border-[#0f5132]/30';
      case 'artifact': return 'border-[#d4af37]/30';
      case 'location': return 'border-[#8b5a2b]/30';
      default: return 'border-neutral-700';
    }
  };

  const getTextStyles = () => {
    switch (type) {
      case 'character': return 'text-portal bg-portal/10 font-medium px-1 rounded-sm cursor-pointer hover:bg-portal/20 transition-colors border-b border-portal/30';
      case 'faction': return 'text-[#b9d6c1] bg-[#0f5132]/20 font-medium px-1 rounded-sm cursor-pointer hover:bg-[#0f5132]/40 transition-colors border-b border-[#0f5132]/30';
      case 'artifact': return 'text-[#d4af37] bg-[#d4af37]/10 font-medium px-1 rounded-sm cursor-pointer hover:bg-[#d4af37]/20 transition-colors border-b border-[#d4af37]/30';
      case 'location': return 'text-[#d6c5b3] bg-[#8b5a2b]/20 font-medium px-1 rounded-sm cursor-pointer hover:bg-[#8b5a2b]/40 transition-colors border-b border-[#8b5a2b]/30';
      default: return 'text-neutral-300 bg-neutral-800 px-1 rounded cursor-pointer';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <span className="relative inline-block" ref={containerRef}>
      <span
        className={getTextStyles()}
        onClick={handleToggle}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleToggle(e);
        }}
      >
        {children}
      </span>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[100] top-full mt-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-void border rounded-xl shadow-2xl backdrop-blur-md ${getBorderColor()}`}
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-800 flex-wrap">
              {getIcon()}
              <span className="font-display font-medium text-sm text-signal">
                {entry.name}
              </span>
            </div>
            
            <p className="text-xs text-neutral-400 font-sans leading-relaxed line-clamp-4">
              {entry.description}
            </p>
            
            {type === 'character' && (entry as Character).role && (
              <div className="mt-2 text-[10px] text-portal uppercase tracking-wider font-bold">
                {(entry as Character).role}
              </div>
            )}
            {type === 'artifact' && (entry as Artifact).tier && (
              <div className="mt-2 text-[10px] text-[#d4af37] uppercase tracking-wider font-bold">
                Tier: {(entry as Artifact).tier}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};
