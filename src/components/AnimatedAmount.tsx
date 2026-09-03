import React, { useEffect, useRef, useState } from 'react';
import { SpendingCalculator } from '../lib/calculator';

interface AnimatedAmountProps {
  amount: number;
  currencySymbol: string;
  isOverBudget: boolean;
  className?: string;
}

export const AnimatedAmount: React.FC<AnimatedAmountProps> = ({
  amount,
  currencySymbol,
  isOverBudget,
  className = '',
}) => {
  const [displayAmount, setDisplayAmount] = useState<number>(amount);
  const displayAmountRef = useRef<number>(amount);
  const prevTargetRef = useRef<number>(amount);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    displayAmountRef.current = displayAmount;
  }, [displayAmount]);

  useEffect(() => {
    const startVal = displayAmountRef.current;
    const targetVal = amount;

    // If identical, do nothing
    if (Math.abs(startVal - targetVal) < 0.001) {
      prevTargetRef.current = targetVal;
      return;
    }

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayAmount(targetVal);
      prevTargetRef.current = targetVal;
      return;
    }

    // Animate smoothly from startVal to targetVal over ~420ms
    const duration = 420;
    const startTime = performance.now();

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Apple-style standard cubic ease out
      const ease = 1 - Math.pow(1 - progress, 3);
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
    <span className={className}>
      {isOverBudget ? '-' : ''}
      {currencySymbol}
      {SpendingCalculator.formatExactDecimal(Math.abs(displayAmount))}
    </span>
  );
};
