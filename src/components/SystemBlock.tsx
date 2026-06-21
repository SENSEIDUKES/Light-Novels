import React from 'react';

interface SystemBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
}

export function SystemBlock({ content, className, ...props }: SystemBlockProps) {
  // Strip the brackets if they exist
  const text = content.replace(/^\[|\]$/g, '').trim();

  // Determine the thematic type based on content parsing
  const lowerText = text.toLowerCase();
  
  let type = 'default';
  if (lowerText.includes('alert') || lowerText.includes('system prompt') || lowerText.includes('notification')) {
    type = 'alert';
  } else if (lowerText.includes('danger') || lowerText.includes('warning') || lowerText.includes('critical')) {
    type = 'danger';
  } else if (lowerText.includes('breakthrough') || lowerText.includes('evolution') || lowerText.includes('level up') || lowerText.includes('ascension')) {
    type = 'breakthrough';
  } else if (lowerText.includes('quest') || lowerText.includes('mission') || lowerText.includes('task')) {
    type = 'quest';
  } else if (lowerText.includes('artifact') || lowerText.includes('resonance') || lowerText.includes('treasure')) {
    type = 'artifact';
  } else if (lowerText.includes('bond') || lowerText.includes('pet') || lowerText.includes('companion') || lowerText.includes('tame') || lowerText.includes('soul')) {
    type = 'bond';
  } else if (lowerText.includes('divine') || lowerText.includes('prophecy') || lowerText.includes('celestial') || lowerText.includes('heaven')) {
    type = 'divine';
  }

  // Define styling based on the type
  let colorStyles = '';
  switch (type) {
    case 'alert':
      colorStyles = 'border-[#00ffff]/40 text-[#00ffff] shadow-[0_0_15px_rgba(0,255,255,0.15)] bg-[#00ffff]/10';
      break;
    case 'danger':
      colorStyles = 'border-red-500/40 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-red-500/10';
      break;
    case 'breakthrough':
      colorStyles = 'border-amber-400/50 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)] bg-amber-400/10';
      break;
    case 'quest':
      colorStyles = 'border-violet-500/40 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)] bg-violet-500/10';
      break;
    case 'artifact':
      colorStyles = 'border-yellow-300/40 text-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.15)] bg-yellow-300/10';
      break;
    case 'bond':
      colorStyles = 'border-teal-400/40 text-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.15)] bg-teal-400/10';
      break;
    case 'divine':
      colorStyles = 'border-white/50 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)] bg-white/10';
      break;
    default:
      colorStyles = 'border-portal/30 text-portal shadow-[0_0_15px_rgba(4,172,255,0.1)] bg-portal/10';
      break;
  }

  return (
    <div {...props} className={`my-8 p-6 bg-black/50 border font-mono text-xs md:text-sm rounded-lg text-center tracking-widest leading-relaxed transition-all duration-500 hover:brightness-125 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] ${colorStyles} ${className || ''}`}>
      <span className="opacity-90">{text}</span>
    </div>
  );
}
