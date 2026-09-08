import React, { useState, useEffect, useRef } from 'react';
import { fmtILS } from '../../utils/formatters';

export default function AnimatedCounter({ 
  value = 0, 
  formatter = fmtILS, 
  isPrivacyMode = false, 
  duration = 600,
  className = "" 
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animFrameRef = useRef(null);

  useEffect(() => {
    // If privacy mode is on, or in Node/test environments without full requestAnimationFrame loop
    if (isPrivacyMode || typeof window === 'undefined' || !window.requestAnimationFrame) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startVal = prevValueRef.current ?? 0;
    const targetVal = typeof value === 'number' ? value : parseFloat(value) || 0;
    prevValueRef.current = targetVal;

    if (startVal === targetVal) {
      setDisplayValue(targetVal);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out curve
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetVal - startVal) * ease;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration, isPrivacyMode]);

  return (
    <span className={className}>
      {formatter(displayValue, isPrivacyMode)}
    </span>
  );
}
