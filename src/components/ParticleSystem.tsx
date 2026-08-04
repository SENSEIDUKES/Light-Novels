import React, { useMemo, useEffect, useState, useRef } from 'react';

interface ParticleSystemProps {
  count?: number;
  className?: string;
  color?: string;
  style?: "default" | "sword_qi" | "lotus_blossom";
}

export const ParticleSystem: React.FC<ParticleSystemProps> = React.memo(({ 
  count = 20, 
  className = '',
  color = 'bg-cyan-100',
  style: styleProp = 'default'
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

    const style = styleProp || 'default';
    const maxSize = style === 'default' ? 4 : 8;
    const blur = 8;
    const padding = blur * 2;
    const canvasSize = maxSize + padding * 2;
    const center = canvasSize / 2;

    // Create offscreen particle for performance
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d', { alpha: true });
    offscreen.width = canvasSize;
    offscreen.height = canvasSize;

    if (offCtx) {
      if (style === 'sword_qi') {
        // Sharp diagonal needle/shard shape representing sword-force/Qi
        offCtx.beginPath();
        offCtx.moveTo(center, center - maxSize / 2 - 2);
        offCtx.lineTo(center + maxSize / 4, center);
        offCtx.lineTo(center, center + maxSize / 2 + 2);
        offCtx.lineTo(center - maxSize / 4, center);
        offCtx.closePath();
        offCtx.fillStyle = resolvedColor;
        offCtx.shadowBlur = blur;
        offCtx.shadowColor = resolvedColor;
        offCtx.fill();

        offCtx.shadowBlur = 0;
        offCtx.fill();
      } else if (style === 'lotus_blossom') {
        // Soft dual-quadratic curved petal
        offCtx.beginPath();
        offCtx.moveTo(center, center - maxSize / 2);
        offCtx.quadraticCurveTo(center + maxSize / 2, center, center, center + maxSize / 2);
        offCtx.quadraticCurveTo(center - maxSize / 2, center, center, center - maxSize / 2);
        offCtx.closePath();
        offCtx.fillStyle = resolvedColor;
        offCtx.shadowBlur = blur;
        offCtx.shadowColor = resolvedColor;
        offCtx.fill();

        offCtx.shadowBlur = 0;
        offCtx.fill();
      } else {
        // Default circular glowing mote
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

        // Determine angle of rotation based on style
        let angle = 0;
        if (style === 'lotus_blossom') {
          angle = (progress * Math.PI * 1.5) + (p.startX * 5);
        } else if (style === 'sword_qi') {
          const dx = p.xOffset * (progress < 0.5 ? 2 : -2);
          angle = Math.atan2(p.yOffset, dx) + Math.PI / 2;
        }

        ctx.globalAlpha = Math.max(0, easedOpacity);
        if (angle !== 0) {
          ctx.save();
          ctx.translate(currentX, currentY);
          ctx.rotate(angle);
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
  }, [particles, resolvedColor, styleProp]);

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
