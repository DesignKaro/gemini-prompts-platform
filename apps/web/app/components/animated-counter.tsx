'use client';

import { useEffect, useRef, useState } from 'react';

type AnimatedCounterProps = {
  value: string | number; // e.g. "1.2K+" or 240
  suffix?: string;
  className?: string;
};

function parseValue(raw: string | number): { num: number; suffix: string; isFloat: boolean } {
  const normalized = typeof raw === 'number' ? String(raw) : raw;
  const match = normalized.match(/^([\d.]+)([KkMm]?\+?)(.*)$/);
  if (!match) return { num: 0, suffix: normalized, isFloat: false };
  const numStr = match[1] ?? '';
  const unit = match[2] ?? '';
  const extra = match[3] ?? '';
  const num = parseFloat(numStr);
  const isFloat = numStr.includes('.');
  return { num, suffix: unit + extra, isFloat };
}

export function AnimatedCounter({ value, suffix: suffixProp, className }: AnimatedCounterProps) {
  const { num: target, suffix, isFloat } = parseValue(value);
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          const duration = 900;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOut cubic
            const eased = 1 - (1 - progress) ** 3;
            const val = eased * target;
            setCurrent(val);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.4 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  const display = isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString();
  const resolvedSuffix = suffixProp ?? suffix;
  const plusCount = (resolvedSuffix.match(/\+/g) ?? []).length;
  const suffixWithoutPlus = resolvedSuffix.replace(/\+/g, '');

  return (
    <span ref={ref} className={className}>
      {display}
      {suffixWithoutPlus}
      {Array.from({ length: plusCount }).map((_, index) => (
        <span key={`counter-plus-${index}`} className="text-[#cde25a]">
          +
        </span>
      ))}
    </span>
  );
}
