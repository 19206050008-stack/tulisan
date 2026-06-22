'use client';

import { useRef, useEffect, useCallback } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  barCount?: number;
  barColor?: string;
  barGap?: number;
  className?: string;
  active?: boolean;
}

/**
 * Real-time audio equalizer using Web Audio API + Canvas.
 * Based on: https://orangeable.com/javascript/equalizer-web-audio-api
 *
 * Requires a real HTMLAudioElement as the audio source.
 */
export function AudioVisualizer({
  audioElement,
  barCount = 16,
  barColor = '#E65A28',
  barGap = 2,
  className = '',
  active = true,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const connectedRef = useRef<HTMLAudioElement | null>(null);

  const drawBars = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !analyser || !ctx) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const totalGap = barGap * (barCount - 1);
    const bw = Math.max(1, (w - totalGap) / barCount);

    // Use only the lower half of the frequency spectrum (more musical data)
    const step = Math.floor(dataArray.length / 2 / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step] || 0;
      const barH = (value / 255) * h;
      const x = i * (bw + barGap);
      const y = h - barH;

      // Gradient per bar: full color at bottom, fading at top
      const gradient = ctx.createLinearGradient(x, h, x, y);
      gradient.addColorStop(0, barColor);
      gradient.addColorStop(1, barColor + '44');
      ctx.fillStyle = gradient;

      const radius = Math.min(bw / 2, 3);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + bw - radius, y);
      ctx.quadraticCurveTo(x + bw, y, x + bw, y + radius);
      ctx.lineTo(x + bw, h);
      ctx.lineTo(x, h);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(drawBars);
  }, [barCount, barColor, barGap]);

  // Draw static (frozen) equalizer bars when not active — visible placeholder
  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const totalGap = barGap * (barCount - 1);
    const bw = Math.max(1, (w - totalGap) / barCount);
    for (let i = 0; i < barCount; i++) {
      // Deterministic varied heights so it looks like a frozen equalizer
      const wave = Math.sin(i * 0.9) * 0.3 + Math.sin(i * 0.45) * 0.2;
      const barH = Math.max(2, (0.4 + wave) * h);
      const x = i * (bw + barGap);
      const y = h - barH;
      ctx.fillStyle = barColor + '99';
      const radius = Math.min(bw / 2, 3);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + bw - radius, y);
      ctx.quadraticCurveTo(x + bw, y, x + bw, y + radius);
      ctx.lineTo(x + bw, h);
      ctx.lineTo(x, h);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }
  }, [barCount, barColor, barGap]);

  // Animated fallback bars (pseudo-random) when no real audio source
  const drawAnimated = useCallback((t: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const totalGap = barGap * (barCount - 1);
    const bw = Math.max(1, (w - totalGap) / barCount);
    for (let i = 0; i < barCount; i++) {
      // Pseudo-random wave based on bar index and time
      const wave = Math.sin(t * 0.004 + i * 0.7) * 0.3 +
                   Math.sin(t * 0.007 + i * 1.3) * 0.2 +
                   Math.sin(t * 0.002 + i * 0.4) * 0.15;
      const barH = Math.max(3, (0.35 + wave) * h);
      const x = i * (bw + barGap);
      const y = h - barH;
      const gradient = ctx.createLinearGradient(x, h, x, y);
      gradient.addColorStop(0, barColor);
      gradient.addColorStop(1, barColor + '44');
      ctx.fillStyle = gradient;
      const radius = Math.min(bw / 2, 3);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + bw - radius, y);
      ctx.quadraticCurveTo(x + bw, y, x + bw, y + radius);
      ctx.lineTo(x + bw, h);
      ctx.lineTo(x, h);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }
    rafRef.current = requestAnimationFrame(drawAnimated);
  }, [barCount, barColor, barGap]);

  // Connect to audio element when it changes
  useEffect(() => {
    if (!active) {
      // Defer so the canvas has been sized by the resize effect before drawing
      rafRef.current = requestAnimationFrame(() => drawIdle());
      return () => cancelAnimationFrame(rafRef.current);
    }

    // No audio element — use animated fallback
    if (!audioElement) {
      const loop = (t: number) => drawAnimated(t);
      rafRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafRef.current);
    }

    // Don't reconnect to the same element
    if (connectedRef.current === audioElement && analyserRef.current) {
      rafRef.current = requestAnimationFrame(drawBars);
      return () => cancelAnimationFrame(rafRef.current);
    }

    try {
      // Create AudioContext lazily (must be after user gesture)
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const actx = ctxRef.current;

      if (actx.state === 'suspended') {
        actx.resume();
      }

      // Create analyser
      const analyser = actx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;

      // Create source from audio element (only once per element)
      let source = sourceRef.current;
      if (connectedRef.current !== audioElement) {
        source = actx.createMediaElementSource(audioElement);
        sourceRef.current = source;
        connectedRef.current = audioElement;
      }

      source!.connect(analyser);
      analyser.connect(actx.destination);

      rafRef.current = requestAnimationFrame(drawBars);
    } catch {
      // If connection fails (e.g., CORS, already connected), fall back to idle
      drawIdle();
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [audioElement, active, drawBars, drawIdle]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      // Redraw idle bars after sizing when not actively animating
      if (!active) drawIdle();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [active, drawIdle]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{ imageRendering: 'auto' }}
    />
  );
}
