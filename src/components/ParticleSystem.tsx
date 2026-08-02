import React, { useMemo, useEffect, useState, useRef } from 'react';

interface ParticleSystemProps {
  count?: number;
  className?: string;
  color?: string;
  particleStyle?: 'default' | 'sword_qi' | 'lotus_blossom';
}

export const ParticleSystem: React.FC<ParticleSystemProps> = React.memo(({ 
  count = 20, 
  className = '',
  color = 'bg-cyan-100',
  particleStyle = 'default'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const [resolvedColor, setResolvedColor] = useState('rgba(255, 255, 255, 1)');

  useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
    }
  }, []);

  useEffect(() => {
    if (colorRef.current) {
      const computed = getComputedStyle(colorRef.current).backgroundColor;
      if (computed !== 'rgba(0, 0, 0, 0)' && computed !== 'transparent') {
        setResolvedColor(computed);
      }
    }
  }, [color]);

  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      let size = Math.random() * 3 + 1; // 1 to 4px
      let duration = (Math.random() * 15 + 10) * 1000; // 10 to 25s
      let yOffset = -Math.random() * 100 - 100; // go up by 100 to 200px
      let xOffset = (Math.random() - 0.5) * 60; // sway left/right
      let maxOpacity = Math.random() * 0.4 + 0.2;
      let rotationSpeed = 0;

      if (particleStyle === 'sword_qi') {
        size = Math.random() * 2 + 1; // slightly finer needles
        duration = (Math.random() * 6 + 4) * 1000; // 4 to 10s (faster!)
        yOffset = -Math.random() * 200 - 150; // rise higher
        xOffset = (Math.random() - 0.5) * 20; // very straight rise
        maxOpacity = Math.random() * 0.5 + 0.3; // slightly brighter
      } else if (particleStyle === 'lotus_blossom') {
        size = Math.random() * 4 + 2; // slightly larger soft petals
        duration = (Math.random() * 20 + 15) * 1000; // 15 to 35s (slower, serene)
        yOffset = -Math.random() * 80 - 50; // rise/float up slower
        xOffset = (Math.random() - 0.5) * 100; // wider sway
        maxOpacity = Math.random() * 0.3 + 0.25;
        rotationSpeed = (Math.random() - 0.5) * 0.002; // slow spin
      }

      const startY = Math.random();
      const startX = Math.random();
      const delay = (Math.random() * -20) * 1000; // -20s to 0

      return {
        id: i,
        size,
        startX,
        startY,
        duration,
        delay,
        yOffset,
        xOffset,
        maxOpacity,
        rotationSpeed
      };
    });
  }, [count, particleStyle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Create offscreen particle for performance
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d', { alpha: true });
    const maxSize = 4;
    const blur = 8;
    const padding = blur * 2;
    const canvasSize = maxSize + padding * 2;
    offscreen.width = canvasSize;
    offscreen.height = canvasSize;
    const center = canvasSize / 2;

    if (offCtx) {
      if (particleStyle === 'sword_qi') {
        // Needle/diamond shape for sharp sword qi
        offCtx.beginPath();
        offCtx.moveTo(center, center - maxSize);
        offCtx.lineTo(center + maxSize / 3, center);
        offCtx.lineTo(center, center + maxSize);
        offCtx.lineTo(center - maxSize / 3, center);
        offCtx.closePath();
        offCtx.fillStyle = resolvedColor;
        offCtx.shadowBlur = blur;
        offCtx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        offCtx.fill();
        offCtx.shadowBlur = 0;
        offCtx.fill();
      } else if (particleStyle === 'lotus_blossom') {
        // Gentle petal shape (ellipse/oval)
        offCtx.beginPath();
        if (typeof offCtx.ellipse === 'function') {
          offCtx.ellipse(center, center, maxSize / 2, maxSize / 3, 0, 0, Math.PI * 2);
        } else {
          offCtx.arc(center, center, maxSize / 2, 0, Math.PI * 2);
        }
        offCtx.fillStyle = resolvedColor;
        offCtx.shadowBlur = blur / 2;
        offCtx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        offCtx.fill();
        offCtx.shadowBlur = 0;
        offCtx.fill();
      } else {
        // 'default' classic circle
        offCtx.beginPath();
        offCtx.arc(center, center, maxSize / 2, 0, Math.PI * 2);
        offCtx.fillStyle = resolvedColor;
        offCtx.shadowBlur = blur;
        offCtx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        offCtx.fill();
        offCtx.shadowBlur = 0;
        offCtx.fill();
      }
    }

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        width = entry.contentRect.width;
        height = entry.contentRect.height;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }
    });
    
    resizeObserver.observe(canvas);

    const easeInOut = (t: number) => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const start = startTimeRef.current ?? time;

      particles.forEach(p => {
        const elapsed = time - start - p.delay;
        const progress = (elapsed % p.duration) / p.duration;
        
        const easedProgress = easeInOut(progress);
        
        // x goes 0 -> xOffset -> 0
        const xProgress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        const easedXProgress = easeInOut(xProgress);

        // opacity goes 0 -> maxOpacity -> 0
        const opacity = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        const easedOpacity = easeInOut(opacity) * p.maxOpacity;

        const currentX = (p.startX * width) + (p.xOffset * easedXProgress);
        const currentY = (p.startY * height) + (p.yOffset * easedProgress);

        // Draw offscreen canvas at correct size and position
        const scale = p.size / maxSize;
        const drawSize = canvasSize * scale;

        ctx.save();
        ctx.globalAlpha = Math.max(0, easedOpacity);
        ctx.translate(currentX, currentY);

        if (particleStyle === 'lotus_blossom') {
          // Spin based on elapsed time and random rotation speed
          ctx.rotate((time - start) * p.rotationSpeed);
        } else if (particleStyle === 'sword_qi') {
          // Sharp angle slightly aligned with horizontal sway direction
          const swayDirection = p.xOffset * (progress < 0.5 ? 2 : -2);
          ctx.rotate(swayDirection * 0.005);
        }

        ctx.drawImage(offscreen, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [particles, resolvedColor, particleStyle]);

  return (
    <>
      <div ref={colorRef} className={`hidden ${color}`} />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
      />
    </>
  );
});
