import React, { useEffect, useRef, useState } from 'react';
import { SpendingCalculator } from '../lib/calculator';
import { motion } from 'motion/react';

interface AnimatedAmountProps {
  amount: number;
  currencySymbol: string;
  isOverBudget: boolean;
  className?: string;
  actionTrigger?: number; // Optional timestamp/trigger to sync pop with expense actions
}

export const AnimatedAmount: React.FC<AnimatedAmountProps> = ({
  amount,
  currencySymbol,
  isOverBudget,
  className = '',
  actionTrigger,
}) => {
  const [displayAmount, setDisplayAmount] = useState<number>(amount);
  const [popKey, setPopKey] = useState(0);
  const displayAmountRef = useRef<number>(amount);
  const prevTargetRef = useRef<number>(amount);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    displayAmountRef.current = displayAmount;
  }, [displayAmount]);

  // Synchronized pop on action trigger (e.g. expense added or updated)
  useEffect(() => {
    if (actionTrigger) {
      setPopKey((k) => k + 1);
    }
  }, [actionTrigger]);

  useEffect(() => {
    const startVal = displayAmountRef.current;
    const targetVal = amount;

    // If identical, do nothing
    if (Math.abs(startVal - targetVal) < 0.001) {
      prevTargetRef.current = targetVal;
      return;
    }

    setPopKey((k) => k + 1);

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayAmount(targetVal);
      prevTargetRef.current = targetVal;
      return;
    }

    // Animate smoothly from startVal to targetVal over ~460ms using Apple-style cubic ease out
    const duration = 460;
    const startTime = performance.now();

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Quintic ease out for silky smooth number settling
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = startVal + (targetVal - startVal) * ease;

      setDisplayAmount(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayAmount(targetVal);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    prevTargetRef.current = targetVal;

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [amount]);

  return (
    <motion.span
      key={popKey}
      animate={{
        scale: [1, 1.07, 0.98, 1],
        y: [0, -4, 1, 0],
      }}
      transition={{
        duration: 0.52,
        ease: [0.25, 1, 0.5, 1],
      }}
      className={`${className} tabular-nums whitespace-nowrap inline-block transform-gpu`}
    >
      {isOverBudget ? '-' : ''}
      {currencySymbol}
      {SpendingCalculator.formatExactDecimal(Math.abs(displayAmount))}
    </motion.span>
  );
};


