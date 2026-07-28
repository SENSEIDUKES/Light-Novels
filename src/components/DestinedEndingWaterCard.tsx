import React, { useLayoutEffect, useRef, useState } from "react";

/**
 * Interactive water-curtain spoiler cover for the Destined Ending card.
 *
 * A thin, nearly colorless sheet of water (low-resolution flow field on a
 * transparent Canvas 2D layer) conceals the ending copy until the reader
 * deliberately drags through it. The pointer acts as a moving obstacle in the
 * downward flow: water divides around it, accelerates along its boundary and
 * leaves a wake that reveals the untouched DOM text underneath. When the
 * gesture pauses the surrounding streams slowly converge and partially close
 * the opening; once enough of the card is uncovered the sheet loses cohesion,
 * drains downward, and the canvas removes itself so the text is fully
 * selectable and screen-reader accessible again.
 *
 * No images, no WebGL/WebGPU, no dependencies — Canvas 2D + Pointer Events.
 */

// How far the sheet may spill past the rounded border (kept small so it can
// never reach the controls below the card).
const BLEED_PX = 8;
// Fraction of card cells that must be cleared before the curtain lets go.
const REVEAL_THRESHOLD = 0.55;
const REVEAL_THRESHOLD_REDUCED = 0.3;
// Charcoal body and silver ridge colors.
const BODY = { r: 26, g: 28, b: 34 };
const SILVER = { r: 190, g: 196, b: 205 };

interface PointerState {
  dragging: boolean;
  x: number; // grid coords
  y: number;
  px: number; // last stamped path position
  py: number;
  vx: number; // grid cells / second
  vy: number;
  lastMoveAt: number;
  lastRippleAt: number;
}

interface Ripple {
  x: number; // css px within the inflated canvas rect
  y: number;
  age: number;
  strength: number;
}

interface StreamParticle {
  x: number; // grid coords
  y: number;
  px: number;
  py: number;
  width: number;
  alpha: number;
}

function bilinearSample(field: Float32Array, cols: number, rows: number, x: number, y: number): number {
  const cx = Math.max(0, Math.min(cols - 1.001, x));
  const cy = Math.max(0, Math.min(rows - 1.001, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const fx = cx - x0;
  const fy = cy - y0;
  const i00 = y0 * cols + x0;
  const i10 = i00 + 1;
  const i01 = i00 + cols;
  const i11 = i01 + 1;
  const top = field[i00] + (field[i10] - field[i00]) * fx;
  const bottom = field[i01] + (field[i11] - field[i01]) * fx;
  return top + (bottom - top) * fy;
}

export const DestinedEndingWaterCard: React.FC<{ text: string }> = ({ text }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drained, setDrained] = useState(false);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || drained) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const revealThreshold = reducedMotion ? REVEAL_THRESHOLD_REDUCED : REVEAL_THRESHOLD;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ------------------------------------------------------------------
    // Grid + simulation state
    // ------------------------------------------------------------------
    let cols = 0;
    let rows = 0;
    let cssW = 0; // inflated canvas size in css px
    let cssH = 0;
    let cardL = 0; // card region inside the grid (grid coords)
    let cardT = 0;
    let cardR = 0;
    let cardB = 0;

    let den = new Float32Array(0); // water density per cell (0..1)
    let denNext = new Float32Array(0);
    let velX = new Float32Array(0);
    let velY = new Float32Array(0);
    let disp = new Float32Array(0); // spring-damped displacement
    let dispVel = new Float32Array(0);

    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;
    let pixels: ImageData | null = null;

    const pointer: PointerState = {
      dragging: false,
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      vx: 0,
      vy: 0,
      lastMoveAt: 0,
      lastRippleAt: 0,
    };
    const ripples: Ripple[] = [];
    let streams: StreamParticle[] = [];

    let time = 0;
    let drainTime = -1; // < 0: not draining yet
    let finished = false;
    let running = false;
    let rafId = 0;
    let lastFrameAt = 0;
    let isDestroyed = false;

    function buildGrid(preserveDensity: boolean) {
      const rect = wrap!.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      cssW = w + BLEED_PX * 2;
      cssH = h + BLEED_PX * 2;

      const cell = coarsePointer ? 16 : 10;
      const nextCols = Math.max(20, Math.min(64, Math.round(cssW / cell)));
      const nextRows = Math.max(14, Math.min(48, Math.round(cssH / cell)));

      cardL = (BLEED_PX / cssW) * nextCols;
      cardR = ((BLEED_PX + w) / cssW) * nextCols;
      cardT = (BLEED_PX / cssH) * nextRows;
      cardB = ((BLEED_PX + h) / cssH) * nextRows;

      const size = nextCols * nextRows;
      const nextDen = new Float32Array(size);

      if (preserveDensity && den.length > 0 && cols > 0 && rows > 0) {
        // Resample the old field so a resize never resets the reveal.
        for (let y = 0; y < nextRows; y++) {
          for (let x = 0; x < nextCols; x++) {
            const gx = (x / (nextCols - 1)) * (cols - 1);
            const gy = (y / (nextRows - 1)) * (rows - 1);
            nextDen[y * nextCols + x] = bilinearSample(den, cols, rows, gx, gy);
          }
        }
      } else {
        for (let y = 0; y < nextRows; y++) {
          for (let x = 0; x < nextCols; x++) {
            const i = y * nextCols + x;
            const inCard = x >= cardL && x <= cardR && y >= cardT && y <= cardB;
            if (inCard) {
              // Slight density variation so the sheet reads as moving water,
              // never as a flat rectangle. Dense enough to keep every word
              // unreadable until the reader reaches in.
              nextDen[i] = 0.98 + 0.02 * Math.sin(x * 1.3 + y * 2.1);
            } else {
              // Sparse wisps allowed to stray past the rounded border.
              const dist = Math.min(x - cardL, cardR - x, y - cardT, cardB - y);
              const fade = Math.max(0, 1 + dist / 2.2); // dist is negative outside
              nextDen[i] = fade > 0 ? 0.22 * fade * (0.5 + 0.5 * Math.sin(x * 3.1 + y * 1.7)) : 0;
            }
          }
        }
      }

      cols = nextCols;
      rows = nextRows;
      den = nextDen;
      denNext = new Float32Array(size);
      velX = new Float32Array(size);
      velY = new Float32Array(size);
      disp = new Float32Array(size);
      dispVel = new Float32Array(size);

      offscreen.width = cols;
      offscreen.height = rows;
      pixels = offCtx!.createImageData(cols, rows);

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      const streamCount = reducedMotion ? 0 : coarsePointer ? 22 : 40;
      streams = Array.from({ length: streamCount }, () => spawnStream(true));
    }

    function spawnStream(anywhere = false): StreamParticle {
      const x = cardL + Math.random() * Math.max(1, cardR - cardL);
      const y = anywhere
        ? cardT + Math.random() * Math.max(1, cardB - cardT)
        : cardT + Math.random() * 2;
      return {
        x,
        y,
        px: x,
        py: y,
        width: 0.6 + Math.random() * 1.1,
        alpha: 0.04 + Math.random() * 0.09,
      };
    }

    // ------------------------------------------------------------------
    // Simulation step
    // ------------------------------------------------------------------
    function step(dt: number, now: number) {
      const idleMs = now - pointer.lastMoveAt;
      const draining = drainTime >= 0;

      // Curl-style turbulence: cheap divergence-light trig field.
      if (!reducedMotion) {
        const s = draining ? 0.6 : 0.35;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x;
            velX[i] = (Math.sin(y * 1.7 + time * 1.3) + Math.sin((x + y) * 0.9 - time * 0.7)) * s;
            velY[i] = (Math.cos(x * 1.3 - time * 1.1) + Math.sin(y * 0.8 + time * 0.9)) * s * 0.6;
          }
        }
      } else {
        velX.fill(0);
        velY.fill(0);
      }

      // Pointer as a moving obstacle in the downward flow.
      if (pointer.dragging || idleMs < 140) {
        const speed = Math.hypot(pointer.vx, pointer.vy);
        const wakeR = (reducedMotion ? 2.6 : 2.4) + Math.min(3.0, speed * 0.014);
        const carve = reducedMotion ? 20 : 22 + Math.min(18, speed * 0.08);
        const minX = Math.max(0, Math.floor(pointer.x - wakeR * 1.6));
        const maxX = Math.min(cols - 1, Math.ceil(pointer.x + wakeR * 1.6));
        const minY = Math.max(0, Math.floor(pointer.y - wakeR * 1.6));
        const maxY = Math.min(rows - 1, Math.ceil(pointer.y + wakeR * 1.6));

        // Flow deflection around the obstacle's current position.
        if (!reducedMotion) {
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              const i = y * cols + x;
              const dx = x - pointer.x;
              const dy = y - pointer.y;
              const f = Math.exp(-(dx * dx + dy * dy) / (wakeR * wakeR));
              if (f < 0.01) continue;
              // Divide to both sides of the obstacle; cells dead ahead get
              // pushed toward the side the pointer is coming from.
              const side = Math.abs(dx) > 0.35 ? Math.sign(dx) : pointer.vx >= 0 ? -1 : 1;
              velX[i] += side * f * (4 + Math.min(10, speed * 0.05));
              // Accelerate along the obstacle boundary (downward slipstream).
              velY[i] += f * (3 + Math.min(8, Math.abs(pointer.vy) * 0.04));
              dispVel[i] += f * pointer.vx * 0.06;
            }
          }
        }

        // Wake carving is stamped along the whole swept path since the last
        // frame, so fast flicks leave a continuous opening instead of a
        // dotted trail. The wake trails opposite the drag direction.
        const offX = Math.max(-4, Math.min(4, pointer.vx * 0.12));
        const offY = Math.max(-4, Math.min(4, pointer.vy * 0.12));
        const pathX = pointer.x - pointer.px;
        const pathY = pointer.y - pointer.py;
        const segs = Math.max(1, Math.ceil(Math.hypot(pathX, pathY) * 2));
        for (let s = 0; s <= segs; s++) {
          const t = s / segs;
          const wx = pointer.px + pathX * t - offX;
          const wy = pointer.py + pathY * t - offY;
          const wMinX = Math.max(0, Math.floor(wx - wakeR * 1.6));
          const wMaxX = Math.min(cols - 1, Math.ceil(wx + wakeR * 1.6));
          const wMinY = Math.max(0, Math.floor(wy - wakeR * 1.6));
          const wMaxY = Math.min(rows - 1, Math.ceil(wy + wakeR * 1.6));
          for (let y = wMinY; y <= wMaxY; y++) {
            for (let x = wMinX; x <= wMaxX; x++) {
              const wdx = x - wx;
              const wdy = y - wy;
              const fw = Math.exp(-(wdx * wdx + wdy * wdy) / (wakeR * wakeR * 1.3));
              if (fw < 0.01) continue;
              const i = y * cols + x;
              den[i] = Math.max(0, den[i] - (carve / segs) * fw * dt);
            }
          }
        }
        pointer.px = pointer.x;
        pointer.py = pointer.y;
      }

      // Spring-damped displacement.
      for (let i = 0; i < den.length; i++) {
        dispVel[i] += (-26 * disp[i] - 6 * dispVel[i]) * dt;
        disp[i] += dispVel[i] * dt;
      }

      // Downward advection (semi-Lagrangian) + gentle diffusion so streams
      // converge instead of leaving hard edges.
      const fall = (draining ? rows * (0.7 + drainTime * 3.2) : rows * 0.12) * dt;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          denNext[i] = bilinearSample(den, cols, rows, x - velX[i] * dt, y - velY[i] * dt - fall);
        }
      }
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const l = denNext[y * cols + Math.max(0, x - 1)];
          const r = denNext[y * cols + Math.min(cols - 1, x + 1)];
          const u = denNext[Math.max(0, y - 1) * cols + x];
          const d = denNext[Math.min(rows - 1, y + 1) * cols + x];
          const blur = (l + r + u + d) * 0.25;
          den[i] = denNext[i] + (blur - denNext[i]) * 0.05;
        }
      }

      // The curtain is fed from the top edge: a steady inflow band keeps the
      // sheet cohesive indefinitely. The feed cuts out once draining starts,
      // which is what lets the remaining water wash down and away.
      if (drainTime < 0) {
        const feedBottom = Math.min(rows - 1, Math.round(cardT + 1.2));
        for (let y = Math.max(0, Math.floor(cardT)); y <= feedBottom; y++) {
          for (let x = Math.max(0, Math.floor(cardL)); x <= Math.min(cols - 1, Math.ceil(cardR)); x++) {
            const i = y * cols + x;
            den[i] = Math.min(1, den[i] + 2.5 * dt);
          }
        }
      }

      // Streams converge and partially close the opening once movement stops.
      if (!draining && !reducedMotion && !pointer.dragging && idleMs > 450) {
        const restore = 0.22 * dt;
        for (let y = Math.max(0, Math.floor(cardT)); y <= Math.min(rows - 1, Math.ceil(cardB)); y++) {
          for (let x = Math.max(0, Math.floor(cardL)); x <= Math.min(cols - 1, Math.ceil(cardR)); x++) {
            const i = y * cols + x;
            den[i] += (1 - den[i]) * restore;
          }
        }
      }

      // Reveal progress over the card region.
      let cleared = 0;
      let total = 0;
      let maxDen = 0;
      for (let y = Math.floor(cardT); y <= Math.ceil(cardB); y++) {
        for (let x = Math.floor(cardL); x <= Math.ceil(cardR); x++) {
          const d = den[y * cols + x];
          total++;
          if (d < 0.35) cleared++;
          if (d > maxDen) maxDen = d;
        }
      }

      if (drainTime < 0 && total > 0 && cleared / total > revealThreshold) {
        drainTime = 0;
      }

      if (draining) {
        drainTime += dt;
        // Water loses cohesion and drains away.
        const loss = (reducedMotion ? 1.8 : 0.3 + drainTime * 0.7) * dt;
        for (let i = 0; i < den.length; i++) {
          den[i] = Math.max(0, den[i] - loss);
        }
        if (maxDen - loss < 0.03 || drainTime > 3) {
          finished = true;
        }
      }

      // Ambient ripples while draining; drag ripples while interacting.
      if (!reducedMotion) {
        if (pointer.dragging && now - pointer.lastRippleAt > 50) {
          pointer.lastRippleAt = now;
          const speed = Math.hypot(pointer.vx, pointer.vy);
          ripples.push({
            x: (pointer.x / cols) * cssW,
            y: (pointer.y / rows) * cssH,
            age: 0,
            strength: Math.min(1.4, 0.35 + speed * 0.006),
          });
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
          ripples[i].age += dt;
          if (ripples[i].age > 0.7) ripples.splice(i, 1);
        }
      }
    }

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------
    function render() {
      if (!pixels) return;
      const data = pixels.data;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          // Spring displacement jiggles the sheet itself.
          const d = bilinearSample(den, cols, rows, x, y - disp[i]);
          const o = i * 4;
          if (d <= 0.012) {
            data[o + 3] = 0;
            continue;
          }
          const l = den[y * cols + Math.max(0, x - 1)];
          const r = den[y * cols + Math.min(cols - 1, x + 1)];
          const u = den[Math.max(0, y - 1) * cols + x];
          const dn = den[Math.min(rows - 1, y + 1) * cols + x];
          const ridge = Math.min(1, (Math.abs(r - l) + Math.abs(dn - u)) * 3.2);
          const shimmer = reducedMotion
            ? 0
            : 0.5 + 0.5 * Math.sin(x * 0.9 + time * 2.0) * Math.sin(y * 1.2 - time * 1.6);
          const silver = Math.min(1, ridge * 0.7 + shimmer * 0.14 * d);
          data[o] = BODY.r + (SILVER.r - BODY.r) * silver;
          data[o + 1] = BODY.g + (SILVER.g - BODY.g) * silver;
          data[o + 2] = BODY.b + (SILVER.b - BODY.b) * silver;
          data[o + 3] = Math.min(0.985, d * 1.01) * 255;
        }
      }
      offCtx!.putImageData(pixels, 0, 0);

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, cssW, cssH);
      ctx!.imageSmoothingEnabled = true;
      ctx!.drawImage(offscreen, 0, 0, cols, rows, 0, 0, cssW, cssH);

      // Layered translucent streamlines advected through the field.
      if (!reducedMotion) {
        ctx!.lineCap = "round";
        for (const p of streams) {
          p.px = p.x;
          p.py = p.y;
          const svx = bilinearSample(velX, cols, rows, p.x, p.y);
          const svy = bilinearSample(velY, cols, rows, p.x, p.y);
          // Streamlines run a touch faster than the density flow so the
          // sheet reads as falling water even while the wake lingers.
          const fall = drainTime >= 0 ? rows * (0.7 + drainTime * 3.2) : rows * 0.25;
          p.x += svx * 0.016;
          p.y += (svy + fall) * 0.016;
          const localDen = bilinearSample(den, cols, rows, p.x, p.y);
          if (p.y > rows + 1 || p.x < -1 || p.x > cols + 1) {
            Object.assign(p, spawnStream());
            continue;
          }
          if (localDen < 0.06) continue; // keep the cleared wake clean
          const gx = (p.x / cols) * cssW;
          const gy = (p.y / rows) * cssH;
          const gpx = (p.px / cols) * cssW;
          const gpy = (p.py / rows) * cssH;
          ctx!.strokeStyle = `rgba(205,210,218,${(p.alpha * Math.min(1, localDen)).toFixed(3)})`;
          ctx!.lineWidth = p.width;
          ctx!.beginPath();
          ctx!.moveTo(gpx, gpy);
          ctx!.lineTo(gx, gy);
          ctx!.stroke();
        }

        // Ripple highlights.
        for (const rip of ripples) {
          const t = rip.age / 0.7;
          const radius = 6 + t * 42 * rip.strength;
          ctx!.strokeStyle = `rgba(215,220,227,${((1 - t) * 0.22 * rip.strength).toFixed(3)})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.arc(rip.x, rip.y, radius, 0, Math.PI * 2);
          ctx!.stroke();
        }
      }
    }

    // ------------------------------------------------------------------
    // Animation loop / lifecycle
    // ------------------------------------------------------------------
    function frame(now: number) {
      if (isDestroyed || !running) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameAt) / 1000));
      lastFrameAt = now;
      time += dt;
      step(dt, now);
      render();
      if (finished) {
        running = false;
        setDrained(true);
        return;
      }
      rafId = requestAnimationFrame(frame);
    }

    function startLoop() {
      if (isDestroyed || running || finished) return;
      // Reduced motion: only animate while dragging or draining.
      if (reducedMotion && !pointer.dragging && drainTime < 0) return;
      running = true;
      lastFrameAt = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    function stopLoop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    // ------------------------------------------------------------------
    // Pointer handling — one shared path for touch, mouse and stylus.
    // ------------------------------------------------------------------
    function toGrid(e: PointerEvent) {
      // Read the rect at event time so scrolling, zoom, resize and rotation
      // never desync the coordinates.
      const rect = canvas!.getBoundingClientRect();
      return {
        gx: ((e.clientX - rect.left) / Math.max(1, rect.width)) * cols,
        gy: ((e.clientY - rect.top) / Math.max(1, rect.height)) * rows,
      };
    }

    function onPointerDown(e: PointerEvent) {
      if (finished) return;
      try {
        canvas!.setPointerCapture(e.pointerId);
      } catch (err) {
        // InvalidPointerId can surface with rapid multi-touch releases.
        console.warn("Failed to set pointer capture:", err);
      }
      const { gx, gy } = toGrid(e);
      pointer.dragging = true;
      pointer.x = gx;
      pointer.y = gy;
      pointer.px = gx;
      pointer.py = gy;
      pointer.vx = 0;
      pointer.vy = 0;
      pointer.lastMoveAt = performance.now();
      startLoop();
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointer.dragging || finished) return;
      const now = performance.now();
      const { gx, gy } = toGrid(e);
      const dt = Math.max(1, now - pointer.lastMoveAt) / 1000;
      // Smoothed pointer velocity drives wake width, curvature and ripples.
      pointer.vx = pointer.vx * 0.6 + ((gx - pointer.x) / dt) * 0.4;
      pointer.vy = pointer.vy * 0.6 + ((gy - pointer.y) / dt) * 0.4;
      pointer.x = gx;
      pointer.y = gy;
      pointer.lastMoveAt = now;
    }

    function endDrag() {
      pointer.dragging = false;
      pointer.lastMoveAt = performance.now();
      // Reduced motion: after the touch-following reveal, a short downward
      // dissolve finishes the curtain instead of leaving it half open.
      if (reducedMotion && drainTime < 0 && !finished) {
        drainTime = 0;
        startLoop();
      }
    }

    // Prevent page scrolling only while a drag is active inside the water.
    function onTouchMove(e: TouchEvent) {
      if (pointer.dragging && e.cancelable) e.preventDefault();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    // ------------------------------------------------------------------
    // Resize / visibility
    // ------------------------------------------------------------------
    const resizeObserver = new ResizeObserver(() => {
      if (isDestroyed) return;
      buildGrid(true);
      render();
    });
    resizeObserver.observe(wrap);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (isDestroyed) return;
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible) startLoop();
        else stopLoop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(wrap);

    function onVisibilityChange() {
      if (document.hidden) stopLoop();
      else startLoop();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Initial paint happens synchronously inside this layout effect, so the
    // ending text is covered before the browser's first paint of the card.
    buildGrid(false);
    render();
    startLoop();

    return () => {
      isDestroyed = true;
      stopLoop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, [text, drained]);

  return (
    <div ref={wrapRef} className="relative">
      <p className="font-sans text-sm text-neutral-300 leading-relaxed bg-portal/5 border border-portal/10 p-3 rounded-lg">
        {text}
      </p>
      {!drained && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute"
          style={{
            left: -BLEED_PX,
            top: -BLEED_PX,
            touchAction: "none",
            cursor: "crosshair",
          }}
        />
      )}
    </div>
  );
};
