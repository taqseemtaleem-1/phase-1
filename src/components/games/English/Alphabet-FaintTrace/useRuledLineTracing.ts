// File: src/components/games/English/Alphabet-RuledLineTrace/useRuledLineTracing.ts

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TracingResult {
  isCorrect: boolean;
  coverage: number;
  accuracy: number;
}

interface UseRuledLineTracingProps {
  letter: string;
  fontFamily: string;
  fontUrl: string;
  slotId: number;
  slotRect: { x: number; y: number; width: number; height: number };
  dpr?: number;
  onComplete?: (result: TracingResult) => void;
}

const STROKE_COLOR = '#E30613';
const STROKE_WIDTH_RATIO = 0.035;
const MIN_COVERAGE = 0.65;
const MIN_ACCURACY = 0.55;
const SAMPLE_STRIDE = 3;

export function useRuledLineTracing({
  letter,
  fontFamily,
  fontUrl,
  slotId,
  slotRect,
  dpr = 1,
  onComplete,
}: UseRuledLineTracingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitImageDataRef = useRef<ImageData | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<TracingResult | null>(null);
  
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const pointsRef = useRef<{ x: number; y: number; inside: boolean }[]>([]);
  const coveredSamplesRef = useRef<Set<string>>(new Set());
  const totalSamplesRef = useRef(0);
  
  // Load font and setup letter
  useEffect(() => {
    const canvas = canvasRef.current;
    const hitCanvas = hitCanvasRef.current;
    if (!canvas || !hitCanvas) return;
    
    const ctx = canvas.getContext('2d');
    const hitCtx = hitCanvas.getContext('2d');
    if (!ctx || !hitCtx) return;
    
    // Setup hit canvas (for detecting inside/outside)
    const { width, height } = slotRect;
    const pixelWidth = width * dpr;
    const pixelHeight = height * dpr;
    
    hitCanvas.width = pixelWidth;
    hitCanvas.height = pixelHeight;
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    
    // Calculate font size
    const fontSize = height * 0.65 * dpr;
    const centerX = pixelWidth / 2;
    const centerY = pixelHeight / 2 + (fontSize * 0.15);
    
    // Draw letter on hit canvas (filled, for detection)
    hitCtx.clearRect(0, 0, pixelWidth, pixelHeight);
    hitCtx.fillStyle = '#000';
    hitCtx.font = `${fontSize}px "${fontFamily}", sans-serif`;
    hitCtx.textAlign = 'center';
    hitCtx.textBaseline = 'alphabetic';
    hitCtx.fillText(letter, centerX, centerY);
    hitImageDataRef.current = hitCtx.getImageData(0, 0, pixelWidth, pixelHeight);
    
    // Draw dashed outline on visible canvas
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.save();
    ctx.setLineDash([6 * dpr, 6 * dpr]);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2 * dpr;
    ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeText(letter, centerX, centerY);
    ctx.restore();
    
    // Count total sample points inside the letter
    const imgData = hitImageDataRef.current;
    if (imgData) {
      let count = 0;
      for (let y = 0; y < pixelHeight; y += SAMPLE_STRIDE) {
        for (let x = 0; x < pixelWidth; x += SAMPLE_STRIDE) {
          const idx = (y * pixelWidth + x) * 4 + 3;
          if (imgData.data[idx] > 128) count++;
        }
      }
      totalSamplesRef.current = count;
    }
    
    return () => {
      hitImageDataRef.current = null;
    };
  }, [letter, fontFamily, fontUrl, slotRect, dpr]);
  
  const isPointInsideLetter = useCallback((x: number, y: number): boolean => {
    const imgData = hitImageDataRef.current;
    if (!imgData) return false;
    
    const px = Math.round(x);
    const py = Math.round(y);
    const width = hitCanvasRef.current?.width || 0;
    
    if (px < 0 || py < 0 || px >= width || py >= (hitCanvasRef.current?.height || 0)) {
      return false;
    }
    
    const idx = (py * width + px) * 4 + 3;
    return imgData.data[idx] > 128;
  }, []);
  
  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);
  
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isComplete) return;
    
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (!point) return;
    
    setIsDrawing(true);
    lastPointRef.current = point;
    pointsRef.current = [];
    coveredSamplesRef.current = new Set();
    
    const inside = isPointInsideLetter(point.x, point.y);
    pointsRef.current.push({ x: point.x, y: point.y, inside });
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.fillStyle = STROKE_COLOR;
      ctx.beginPath();
      ctx.arc(point.x, point.y, STROKE_WIDTH_RATIO * canvasRef.current!.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    markCoveredSamples(point.x, point.y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isComplete, getCanvasPoint, isPointInsideLetter]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isComplete) return;
    
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (!point || !lastPointRef.current) return;
    
    const inside = isPointInsideLetter(point.x, point.y);
    pointsRef.current.push({ x: point.x, y: point.y, inside });
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = STROKE_WIDTH_RATIO * canvasRef.current!.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    }
    
    markCoveredSamples(point.x, point.y);
    lastPointRef.current = point;
  }, [isDrawing, isComplete, getCanvasPoint, isPointInsideLetter]);
  
  const markCoveredSamples = useCallback((x: number, y: number) => {
    const radius = STROKE_WIDTH_RATIO * (canvasRef.current?.width || 0) * 1.5;
    const imgData = hitImageDataRef.current;
    const width = hitCanvasRef.current?.width || 0;
    const height = hitCanvasRef.current?.height || 0;
    
    if (!imgData) return;
    
    const startX = Math.max(0, Math.floor(x - radius));
    const endX = Math.min(width, Math.ceil(x + radius));
    const startY = Math.max(0, Math.floor(y - radius));
    const endY = Math.min(height, Math.ceil(y + radius));
    const r2 = radius * radius;
    
    for (let py = startY; py < endY; py += SAMPLE_STRIDE) {
      for (let px = startX; px < endX; px += SAMPLE_STRIDE) {
        const dx = px - x;
        const dy = py - y;
        if (dx * dx + dy * dy <= r2) {
          const idx = (py * width + px) * 4 + 3;
          if (imgData.data[idx] > 128) {
            coveredSamplesRef.current.add(`${px},${py}`);
          }
        }
      }
    }
  }, []);
  
  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isComplete) return;
    
    setIsDrawing(false);
    lastPointRef.current = null;
    
    const points = pointsRef.current;
    if (points.length < 3) {
      return;
    }
    
    const insideCount = points.filter(p => p.inside).length;
    const totalPoints = points.length;
    const accuracy = totalPoints > 0 ? insideCount / totalPoints : 0;
    const coverage = totalSamplesRef.current > 0 
      ? coveredSamplesRef.current.size / totalSamplesRef.current 
      : 0;
    
    const isCorrect = coverage >= MIN_COVERAGE && accuracy >= MIN_ACCURACY;
    
    const resultData: TracingResult = {
      isCorrect,
      coverage,
      accuracy,
    };
    
    setResult(resultData);
    setIsComplete(true);
    
    if (onComplete) {
      onComplete(resultData);
    }
  }, [isDrawing, isComplete, onComplete]);
  
  const resetSlot = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const { width, height } = canvas;
    const fontSize = (slotRect.height * 0.65) * dpr;
    const centerX = width / 2;
    const centerY = height / 2 + (fontSize * 0.15);
    
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.setLineDash([6 * dpr, 6 * dpr]);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2 * dpr;
    ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeText(letter, centerX, centerY);
    ctx.restore();
    
    setIsComplete(false);
    setResult(null);
    pointsRef.current = [];
    coveredSamplesRef.current = new Set();
    lastPointRef.current = null;
  }, [slotRect, dpr, fontFamily, letter]);
  
  return {
    canvasRef,
    hitCanvasRef,
    isDrawing,
    isComplete,
    result,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetSlot,
    getCanvasPoint,
    isPointInsideLetter,
  };
}