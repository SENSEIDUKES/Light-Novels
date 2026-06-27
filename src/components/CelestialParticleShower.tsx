import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  fadeSpeed: number;
  color: string;
  symbol?: string;
  rotation?: number;
  rotationSpeed?: number;
}

export const CelestialParticleShower: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle pool
    const particles: Particle[] = [];
    const symbols = ['☯', '✨', '✦', '✧', '✵', '❈', '⚜'];
    const colors = [
      'rgba(245, 158, 11, ',  // gold-accent/amber
      'rgba(4, 172, 255, ',  // portal/cyan
      'rgba(255, 215, 0, ',    // pure gold
      'rgba(255, 255, 255, ',  // white light
      'rgba(168, 85, 247, '   // mystic purple
    ];

    const createParticle = (isInitial = false): Particle => {
      const size = Math.random() * 3 + (Math.random() < 0.15 ? Math.random() * 8 + 4 : 1);
      const isSymbol = size > 4 && Math.random() < 0.4;
      
      return {
        x: Math.random() * width,
        y: isInitial ? Math.random() * height : height + 20,
        size,
        speedY: -(Math.random() * 1.5 + 0.5),
        speedX: (Math.random() - 0.5) * 0.8,
        opacity: Math.random() * 0.7 + 0.3,
        fadeSpeed: Math.random() * 0.003 + 0.001,
        color: colors[Math.floor(Math.random() * colors.length)],
        symbol: isSymbol ? symbols[Math.floor(Math.random() * symbols.length)] : undefined,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      };
    };

    // Populate initial particles
    for (let i = 0; i < 75; i++) {
      particles.push(createParticle(true));
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw active particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity -= p.fadeSpeed;
        if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
          p.rotation += p.rotationSpeed;
        }

        // Wrap or remove
        if (p.opacity <= 0 || p.y < -20) {
          particles[i] = createParticle(false);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;

        if (p.symbol) {
          // Draw Daoist or sparkling symbol
          ctx.translate(p.x, p.y);
          if (p.rotation !== undefined) {
            ctx.rotate(p.rotation);
          }
          ctx.font = `${p.size + 8}px 'Inter', sans-serif`;
          ctx.fillStyle = p.color + '1)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color.replace(', ', ')');
          ctx.fillText(p.symbol, 0, 0);
        } else {
          // Draw standard glowing spark
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          gradient.addColorStop(0, p.color + '1)');
          gradient.addColorStop(0.4, p.color + '0.4)');
          gradient.addColorStop(1, p.color + '0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 mix-blend-screen"
    />
  );
});
