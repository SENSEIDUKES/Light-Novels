import React, { useMemo, useEffect, useState, useRef } from 'react';

interface ParticleSystemProps {
  count?: number;
  className?: string;
  color?: string;
  particleStyle?: "default" | "sword_qi" | "lotus_blossom";
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
      const size = Math.random() * 3 + 1; // 1 to 4px
      const startY = Math.random();
      const startX = Math.random();
      const duration = (Math.random() * 15 + 10) * 1000; // 10 to 25s
      const delay = (Math.random() * -20) * 1000; // -20s to 0
      const yOffset = -Math.random() * 100 - 100; // go up by 100 to 200px
      const maxOpacity = Math.random() * 0.4 + 0.2;
      const xOffset = (Math.random() - 0.5) * 60; // sway left/right

      return {
        id: i,
        size,
        startX,
        startY,
        duration,
        delay,
        yOffset,
        xOffset,
        maxOpacity
      };
    });
  }, [count]);

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

    // Lotus blossoms and Sword Qi need a slightly larger offscreen canvas
    const isCustomShape = particleStyle !== 'default';
    const maxSize = isCustomShape ? 12 : 4;
    const blur = isCustomShape ? 4 : 8;
    const padding = blur * 2;
    const canvasSize = maxSize + padding * 2;
    offscreen.width = canvasSize;
    offscreen.height = canvasSize;
    const center = canvasSize / 2;

    if (offCtx) {
      if (particleStyle === 'sword_qi') {
        offCtx.beginPath();
        // Slanted shard shape
        offCtx.moveTo(center - maxSize / 2, center + maxSize / 4);
        offCtx.lineTo(center + maxSize / 2, center - maxSize / 4);
        offCtx.lineTo(center + maxSize / 4, center + maxSize / 2);
        offCtx.lineTo(center - maxSize / 4, center + maxSize / 4);
        offCtx.closePath();
      } else if (particleStyle === 'lotus_blossom') {
        offCtx.beginPath();
        // Petal shape
        offCtx.moveTo(center, center - maxSize / 2);
        offCtx.quadraticCurveTo(center + maxSize / 2, center, center, center + maxSize / 2);
        offCtx.quadraticCurveTo(center - maxSize / 2, center, center, center - maxSize / 2);
        offCtx.closePath();
      } else {
        offCtx.beginPath();
        offCtx.arc(center, center, maxSize / 2, 0, Math.PI * 2);
      }

      offCtx.fillStyle = resolvedColor;
      offCtx.shadowBlur = blur;
      offCtx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      offCtx.fill();
      
      // Fill again without shadow for a more solid core
      offCtx.shadowBlur = 0;
      offCtx.fill();
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
        const isCustomShape = particleStyle !== 'default';
        const baseMaxSize = isCustomShape ? 12 : 4;
        const scale = p.size / baseMaxSize;

        // Scale up custom shapes slightly to make them visible but keep logic simple
        const displayScale = isCustomShape ? scale * 2.5 : scale;
        const drawSize = canvasSize * displayScale;

        ctx.globalAlpha = Math.max(0, easedOpacity);

        if (isCustomShape) {
          ctx.save();
          ctx.translate(currentX, currentY);

          if (particleStyle === 'lotus_blossom') {
            // Lotus blossoms spin slowly
            const rotation = (elapsed * 0.001) % (Math.PI * 2);
            ctx.rotate(rotation + p.id); // Add id so they don't all spin in sync
          } else if (particleStyle === 'sword_qi') {
            // Sword Qi points in the direction of travel (mostly up)
            ctx.rotate(-Math.PI / 6); // Slant them naturally
          }

          ctx.drawImage(offscreen, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
          ctx.restore();
        } else {
          const drawX = currentX - drawSize / 2;
          const drawY = currentY - drawSize / 2;
          ctx.drawImage(offscreen, drawX, drawY, drawSize, drawSize);
        }
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
