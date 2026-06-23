'use client';

import { useRef, useEffect, useCallback } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  /**
   * Optional shared AnalyserNode. When provided, the visualizer reads
   * real-time frequency data from it directly and does NOT create its own
   * AudioContext/MediaElementSource. This lets multiple visualizers share a
   * single source (an audio element can only be connected to one source).
   */
  analyser?: AnalyserNode | null;
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
  analyser: sharedAnalyser = null,
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

    // Use only the lower-mid portion of the spectrum (most voice energy).
    const usable = Math.floor(dataArray.length * 0.7);
    const step = Math.max(1, Math.floor(usable / barCount));

    for (let i = 0; i < barCount; i++) {
      // Average a small window of bins for smoother, prettier bars.
      let sum = 0;
      let cnt = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] || 0;
        cnt++;
      }
      const value = cnt ? sum / cnt : 0;
      // Ease the value a touch so quiet parts still show a little life.
      const norm = Math.pow(value / 255, 0.85);
      const barH = Math.max(1.5, norm * h);
      const x = i * (bw + barGap);
      const y = h - barH;

      // Vertical gradient: solid base brightening to a soft (not stark) tip.
      const gradient = ctx.createLinearGradient(x, h, x, y);
      gradient.addColorStop(0, barColor + '55');
      gradient.addColorStop(0.6, barColor);
      gradient.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = gradient;

      // Subtle glow for the "indah" look.
      ctx.shadowColor = barColor + '88';
      ctx.shadowBlur = 4;

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
    ctx.shadowBlur = 0;

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
      // Smooth, symmetric bell-ish shape so it looks like a tidy equalizer.
      const center = (barCount - 1) / 2;
      const dist = Math.abs(i - center) / (center || 1);
      const shape = 0.25 + (1 - dist) * 0.45;
      const barH = Math.max(2, shape * h);
      const x = i * (bw + barGap);
      const y = h - barH;
      const gradient = ctx.createLinearGradient(x, h, x, y);
      gradient.addColorStop(0, barColor + '33');
      gradient.addColorStop(1, barColor + '77');
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
  }, [barCount, barColor, barGap]);

  // Animated fallback bars (smooth pseudo-wave) when no real audio source
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
      // Gentle, flowing wave — softer and slower than before.
      const wave = Math.sin(t * 0.0026 + i * 0.55) * 0.28 +
                   Math.sin(t * 0.0041 + i * 0.9) * 0.16;
      const barH = Math.max(2.5, (0.4 + wave) * h);
      const x = i * (bw + barGap);
      const y = h - barH;
      const gradient = ctx.createLinearGradient(x, h, x, y);
      gradient.addColorStop(0, barColor + '55');
      gradient.addColorStop(0.6, barColor);
      gradient.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = gradient;
      ctx.shadowColor = barColor + '66';
      ctx.shadowBlur = 3;
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
    ctx.shadowBlur = 0;
    rafRef.current = requestAnimationFrame(drawAnimated);
  }, [barCount, barColor, barGap]);

  // Connect to audio element when it changes
  useEffect(() => {
    if (!active) {
      // Defer so the canvas has been sized by the resize effect before drawing
      rafRef.current = requestAnimationFrame(() => drawIdle());
      return () => cancelAnimationFrame(rafRef.current);
    }

    // Preferred path: a shared analyser was provided. Just read from it.
    // Do NOT create our own AudioContext/source (the element can only have one).
    if (sharedAnalyser) {
      analyserRef.current = sharedAnalyser;
      rafRef.current = requestAnimationFrame(drawBars);
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
  }, [audioElement, active, drawBars, drawIdle, drawAnimated, sharedAnalyser]);

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
