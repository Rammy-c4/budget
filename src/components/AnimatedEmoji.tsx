import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SpendingMoodType } from '../types';
import { haptics } from '../lib/haptics';

export interface EmojiActionEvent {
  type: 'ADD' | 'EDIT' | 'DELETE' | 'TOUCH' | 'STATE_CHANGE' | 'CELEBRATION';
  expenseAmount?: number;
  dailyAllowance?: number;
  timestamp: number;
}

interface AnimatedEmojiProps {
  emoji: string;
  moodType?: SpendingMoodType | string;
  actionEvent?: EmojiActionEvent | null;
  className?: string;
  sizeClassName?: string;
  onTap?: () => void;
}

type ReactionStyle =
  | 'SAVING_CELEBRATION'
  | 'SPECIAL_CELEBRATION'
  | 'NORMAL_BOUNCE'
  | 'NOTICEABLE_RECOIL'
  | 'LARGE_WOBBLE'
  | 'OVERSPENDING_PANIC'
  | 'PLAYFUL_TAP';

/**
 * MascotStubArm:
 * Renders subtle, rounded stub arms flanking the emoji.
 * High-contrast gold gradient with specular edge highlight matching standard emoji skin tones.
 * Scaled and positioned so it never overlaps or conceals the emoji face.
 */
const MascotStubArm: React.FC<{
  side: 'left' | 'right';
  className?: string;
}> = ({ side, className = '' }) => {
  return (
    <svg
      width="15"
      height="22"
      viewBox="0 0 15 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible select-none drop-shadow-2xs ${className}`}
      style={{ opacity: 1, visibility: 'visible' }}
    >
      <defs>
        <linearGradient
          id={`stubArmGrad-${side}`}
          x1={side === 'left' ? '100%' : '0%'}
          y1="0%"
          x2={side === 'left' ? '0%' : '100%'}
          y2="100%"
        >
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Small rounded stub mitt */}
      <path
        d={
          side === 'left'
            ? 'M 12 2.5 C 13.5 2.5 14.5 4 13.8 5.8 L 10.5 14 C 9.8 17.5 6.8 20.2 3.8 19.2 C 1.2 18.2 0.8 14.8 1.8 12.2 L 6.5 3.8 C 7.8 2.2 9.8 2.5 12 2.5 Z'
            : 'M 3 2.5 C 1.5 2.5 0.5 4 1.2 5.8 L 4.5 14 C 5.2 17.5 8.2 20.2 11.2 19.2 C 13.8 18.2 14.2 14.8 13.2 12.2 L 8.5 3.8 C 7.2 2.2 5.2 2.5 3 2.5 Z'
        }
        fill={`url(#stubArmGrad-${side})`}
        stroke="#B45309"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Subtle glossy ridge highlight */}
      <path
        d={
          side === 'left'
            ? 'M 8 4.2 C 5 7.2 3.8 11.2 4.2 14.2'
            : 'M 7 4.2 C 10 7.2 11.2 11.2 10.8 14.2'
        }
        stroke="rgba(255, 255, 255, 0.7)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const AnimatedEmoji: React.FC<AnimatedEmojiProps> = ({
  emoji = '✨',
  moodType = 'ON_TRACK',
  actionEvent,
  className = '',
  sizeClassName = 'text-[48px] sm:text-[54px] leading-none',
  onTap,
}) => {
  const [activeReaction, setActiveReaction] = useState<ReactionStyle>('NORMAL_BOUNCE');
  const [isReacting, setIsReacting] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMountRef = useRef(true);
  const prevEmojiRef = useRef<string>(emoji);
  const prevMoodRef = useRef<string | undefined>(moodType);

  // Determine physical reaction based on mood and recent action
  const determineReaction = (
    mood?: SpendingMoodType | string,
    event?: EmojiActionEvent | null
  ): ReactionStyle => {
    if (event?.type === 'CELEBRATION') {
      return 'SPECIAL_CELEBRATION';
    }

    if (event?.type === 'TOUCH') {
      return 'PLAYFUL_TAP';
    }

    if (mood === 'OVER_BUDGET') {
      return 'OVERSPENDING_PANIC';
    }

    if (event?.type === 'DELETE') {
      return 'SAVING_CELEBRATION';
    }

    if (event?.type === 'ADD' || event?.type === 'EDIT') {
      const amt = event.expenseAmount || 0;
      const allowance = event.dailyAllowance || 50;
      const ratio = amt / Math.max(allowance, 1);

      if (ratio > 0.7) {
        return 'LARGE_WOBBLE'; // Very large expense -> dramatic recoil & arm flail
      } else if (ratio > 0.25) {
        return 'NOTICEABLE_RECOIL'; // Big expense -> jumps back, arms fly out in surprise
      } else {
        return 'NORMAL_BOUNCE'; // Normal spending -> small bounce & tiny arm movement
      }
    }

    if (mood === 'AHEAD_OF_GOAL' || mood === 'EXCELLENT') {
      return 'SAVING_CELEBRATION';
    } else if (mood === 'GETTING_CLOSE') {
      return 'NOTICEABLE_RECOIL';
    }

    return 'NORMAL_BOUNCE';
  };

  // Trigger reactive character physics whenever actionEvent fires or moodType changes
  useEffect(() => {
    // Avoid triggering full recoil or unprompted celebration on initial mount
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevEmojiRef.current = emoji;
      prevMoodRef.current = moodType;
      return;
    }

    // Only fire haptics when the displayed expense mascot/emoji actually changes reaction state
    const hasReactionStateChanged =
      prevEmojiRef.current !== emoji || prevMoodRef.current !== moodType;

    if (hasReactionStateChanged) {
      haptics.emojiChange(moodType, emoji);
      prevEmojiRef.current = emoji;
      prevMoodRef.current = moodType;
    }

    const reaction = determineReaction(moodType, actionEvent);
    setActiveReaction(reaction);
    setIsReacting(true);

    if (reaction === 'SAVING_CELEBRATION' || reaction === 'SPECIAL_CELEBRATION') {
      setShowSparkles(true);
      const sparkTimer = setTimeout(() => setShowSparkles(false), 950);
      return () => clearTimeout(sparkTimer);
    }

    // After the animation duration, return cleanly to stable idle breathing
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => {
      setIsReacting(false);
    }, 1000);

    return () => {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    };
  }, [actionEvent, moodType, emoji]);

  const handleTap = () => {
    setActiveReaction('PLAYFUL_TAP');
    setIsReacting(true);

    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => {
      setIsReacting(false);
    }, 800);

    if (onTap) onTap();
  };

  // Reduced motion check for accessibility
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mascot physics & keyframe definitions
  // CRITICAL: Every state explicitly sets opacity: 1 and visibility: visible so the emoji is NEVER invisible!
  const mascotPhysics = useMemo(() => {
    switch (activeReaction) {
      // 1. CELEBRATING / SAVING:
      // High excited hop, arms raise upward triumphantly, soft landing squash, secondary arm settle
      case 'SAVING_CELEBRATION':
        return {
          body: {
            y: [0, 3, -30, -30, 3, -10, 0],
            x: 0,
            opacity: 1,
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.9, ease: 'easeInOut' },
          },
          face: {
            scaleX: [1, 1.25, 0.88, 0.96, 1.2, 0.96, 1],
            scaleY: [1, 0.75, 1.22, 1.04, 0.8, 1.04, 1],
            rotate: [0, -6, 10, -4, 2, -1, 0],
            opacity: 1,
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.9, ease: 'easeInOut' },
          },
          leftArm: {
            rotate: [-15, 0, -80, -88, 8, -40, -15],
            x: [0, 1, -3, -4, 1, -1, 0],
            y: [0, 1, -5, -6, 1, -1, 0],
            opacity: 1,
            times: [0, 0.14, 0.44, 0.56, 0.74, 0.88, 1],
            transition: { duration: 0.9, ease: 'easeInOut' },
          },
          rightArm: {
            rotate: [15, 0, 80, 88, -8, 40, 15],
            x: [0, -1, 3, 4, -1, 1, 0],
            y: [0, 1, -5, -6, 1, -1, 0],
            opacity: 1,
            times: [0, 0.14, 0.44, 0.56, 0.74, 0.88, 1],
            transition: { duration: 0.9, ease: 'easeInOut' },
          },
          shadow: {
            scaleX: [1, 1.3, 0.55, 0.55, 1.25, 0.85, 1],
            opacity: [0.25, 0.35, 0.1, 0.1, 0.3, 0.18, 0.25],
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.9, ease: 'easeInOut' },
          },
        };

      // 1b. SPECIAL MILESTONE CELEBRATION (Positive spending state, zero-spend day confirmation):
      // Higher jump, triumphant arm raise, playful spin, sparkle burst, satisfying squash landing
      case 'SPECIAL_CELEBRATION':
        return {
          body: {
            y: [0, 4, -40, -40, 4, -12, 0],
            x: 0,
            opacity: 1,
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.95, ease: 'easeInOut' },
          },
          face: {
            scaleX: [1, 1.28, 0.85, 0.96, 1.22, 0.96, 1],
            scaleY: [1, 0.72, 1.25, 1.04, 0.78, 1.04, 1],
            rotate: [0, -12, 360, 360, 6, -2, 0],
            opacity: 1,
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.95, ease: 'easeInOut' },
          },
          leftArm: {
            rotate: [-15, 6, -95, -102, 12, -45, -15],
            x: [0, 1, -4, -5, 1, -1, 0],
            y: [0, 1, -7, -8, 1, -1, 0],
            opacity: 1,
            times: [0, 0.14, 0.44, 0.56, 0.74, 0.88, 1],
            transition: { duration: 0.95, ease: 'easeInOut' },
          },
          rightArm: {
            rotate: [15, -6, 95, 102, -12, 45, 15],
            x: [0, -1, 4, 5, -1, 1, 0],
            y: [0, 1, -7, -8, 1, -1, 0],
            opacity: 1,
            times: [0, 0.14, 0.44, 0.56, 0.74, 0.88, 1],
            transition: { duration: 0.95, ease: 'easeInOut' },
          },
          shadow: {
            scaleX: [1, 1.35, 0.45, 0.45, 1.3, 0.82, 1],
            opacity: [0.25, 0.38, 0.08, 0.08, 0.32, 0.18, 0.25],
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.95, ease: 'easeInOut' },
          },
        };

      // 2. NORMAL SPENDING:
      // Small bounce, tiny arm movement, relaxed settling motion
      case 'NORMAL_BOUNCE':
        return {
          body: {
            y: [0, 2, -15, -15, 2, -5, 0],
            x: 0,
            opacity: 1,
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.65, ease: 'easeInOut' },
          },
          face: {
            scaleX: [1, 1.18, 0.9, 1, 1.12, 0.97, 1],
            scaleY: [1, 0.82, 1.15, 1, 0.88, 1.03, 1],
            rotate: [0, -3, 3, -1, 1, 0],
            opacity: 1,
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.65, ease: 'easeInOut' },
          },
          leftArm: {
            rotate: [-15, -4, -36, -30, 4, -22, -15],
            x: [0, 1, -2, -2, 1, 0, 0],
            y: [0, 1, -2, -2, 1, 0, 0],
            opacity: 1,
            times: [0, 0.14, 0.44, 0.56, 0.74, 0.88, 1],
            transition: { duration: 0.65, ease: 'easeInOut' },
          },
          rightArm: {
            rotate: [15, 4, 36, 30, -4, 22, 15],
            x: [0, -1, 2, 2, -1, 0, 0],
            y: [0, 1, -2, -2, 1, 0, 0],
            opacity: 1,
            times: [0, 0.14, 0.44, 0.56, 0.74, 0.88, 1],
            transition: { duration: 0.65, ease: 'easeInOut' },
          },
          shadow: {
            scaleX: [1, 1.18, 0.75, 0.75, 1.15, 0.9, 1],
            opacity: [0.25, 0.32, 0.15, 0.15, 0.28, 0.2, 0.25],
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.65, ease: 'easeInOut' },
          },
        };

      // 3. BIG EXPENSE (NOTICEABLE RECOIL):
      // Emoji jumps backward slightly, arms fly outward in surprise, brief wobble
      case 'NOTICEABLE_RECOIL':
        return {
          body: {
            y: [0, -6, -16, 2, 0],
            x: [0, -10, 6, -3, 0],
            opacity: 1,
            times: [0, 0.2, 0.5, 0.8, 1],
            transition: { duration: 0.72, ease: 'easeOut' },
          },
          face: {
            scaleX: [1, 1.15, 0.93, 1.05, 1],
            scaleY: [1, 0.86, 1.15, 0.95, 1],
            rotate: [0, -10, 6, -2, 0],
            opacity: 1,
            times: [0, 0.2, 0.5, 0.8, 1],
            transition: { duration: 0.72, ease: 'easeOut' },
          },
          leftArm: {
            rotate: [-15, -60, 20, -30, -15],
            x: [0, -4, 2, -1, 0],
            opacity: 1,
            times: [0, 0.22, 0.52, 0.82, 1],
            transition: { duration: 0.72, ease: 'easeOut' },
          },
          rightArm: {
            rotate: [15, 60, -20, 30, 15],
            x: [0, 4, -2, 1, 0],
            opacity: 1,
            times: [0, 0.22, 0.52, 0.82, 1],
            transition: { duration: 0.72, ease: 'easeOut' },
          },
          shadow: {
            x: [0, -8, 5, -2, 0],
            scaleX: [1, 0.85, 1.1, 0.95, 1],
            opacity: [0.25, 0.16, 0.28, 0.22, 0.25],
            times: [0, 0.2, 0.5, 0.8, 1],
            transition: { duration: 0.72, ease: 'easeOut' },
          },
        };

      // 4. VERY LARGE EXPENSE (LARGE WOBBLE):
      // Dramatic recoil, arms flail briefly, exaggerated bounce/wobble, humorous reaction
      case 'LARGE_WOBBLE':
        return {
          body: {
            y: [0, -25, -25, 4, -10, 0],
            x: [0, -14, 12, -8, 4, 0],
            opacity: 1,
            times: [0, 0.18, 0.45, 0.68, 0.85, 1],
            transition: { duration: 0.9, ease: 'easeOut' },
          },
          face: {
            scaleX: [1, 0.84, 1.22, 0.85, 1.08, 1],
            scaleY: [1, 1.22, 0.82, 1.18, 0.95, 1],
            rotate: [0, -18, 16, -10, 5, 0],
            opacity: 1,
            times: [0, 0.18, 0.45, 0.68, 0.85, 1],
            transition: { duration: 0.9, ease: 'easeOut' },
          },
          leftArm: {
            rotate: [-15, -80, 40, -60, 25, -20, -15],
            x: [0, -5, 3, -3, 2, -1, 0],
            opacity: 1,
            times: [0, 0.2, 0.47, 0.7, 0.87, 1],
            transition: { duration: 0.9, ease: 'easeOut' },
          },
          rightArm: {
            rotate: [15, 80, -40, 60, -25, 20, 15],
            x: [0, 5, -3, 3, -2, 1, 0],
            opacity: 1,
            times: [0, 0.2, 0.47, 0.7, 0.87, 1],
            transition: { duration: 0.9, ease: 'easeOut' },
          },
          shadow: {
            x: [0, -12, 10, -6, 3, 0],
            scaleX: [1, 0.65, 0.65, 1.25, 0.88, 1],
            opacity: [0.25, 0.12, 0.12, 0.32, 0.19, 0.25],
            times: [0, 0.18, 0.45, 0.68, 0.85, 1],
            transition: { duration: 0.9, ease: 'easeOut' },
          },
        };

      // 5. OVERSPENDING PANIC:
      // Nervous rapid bounce, tiny arms shake frantically, rapid side-to-side tremor
      case 'OVERSPENDING_PANIC':
        return {
          body: {
            x: [0, -8, 8, -7, 7, -5, 5, -3, 3, -2, 2, 0],
            y: [0, -3, 2, -3, 2, -2, 1, -2, 1, -1, 0, 0],
            opacity: 1,
            transition: { duration: 0.85, ease: 'easeInOut' },
          },
          face: {
            scaleX: [1, 1.18, 0.9, 1.16, 0.92, 1.1, 0.94, 1.05, 0.97, 1],
            scaleY: [1, 0.85, 1.18, 0.88, 1.15, 0.92, 1.1, 0.97, 1.03, 1],
            rotate: [0, -12, 12, -10, 10, -7, 7, -4, 4, -2, 2, 0],
            opacity: 1,
            transition: { duration: 0.85, ease: 'easeInOut' },
          },
          leftArm: {
            rotate: [-15, -55, 18, -60, 20, -50, 12, -40, 8, -25, -15],
            y: [0, -4, 2, -5, 2, -4, 1, -2, 0, -1, 0],
            opacity: 1,
            transition: { duration: 0.85, ease: 'easeInOut' },
          },
          rightArm: {
            rotate: [15, 55, -18, 60, -20, 50, -12, 40, -8, 25, 15],
            y: [0, -4, 2, -5, 2, -4, 1, -2, 0, -1, 0],
            opacity: 1,
            transition: { duration: 0.85, ease: 'easeInOut' },
          },
          shadow: {
            x: [0, -7, 7, -6, 6, -4, 4, -3, 3, -1, 1, 0],
            scaleX: [1, 1.12, 0.9, 1.1, 0.92, 1.06, 0.95, 1.03, 1],
            opacity: [0.25, 0.28, 0.22, 0.27, 0.23, 0.26, 0.24, 0.25, 0.25],
            transition: { duration: 0.85, ease: 'easeInOut' },
          },
        };

      // 6. PLAYFUL TAP:
      // Cheerful tactile hop, friendly arm wave
      case 'PLAYFUL_TAP':
      default:
        return {
          body: {
            y: [0, 3, -22, -22, 2, -7, 0],
            x: 0,
            opacity: 1,
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.65, ease: 'easeOut' },
          },
          face: {
            scaleX: [1, 1.22, 0.88, 0.98, 1.15, 0.97, 1],
            scaleY: [1, 0.78, 1.18, 1.02, 0.85, 1.03, 1],
            rotate: [0, -8, 10, -5, 2, 0],
            opacity: 1,
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.65, ease: 'easeOut' },
          },
          leftArm: {
            rotate: [-15, -65, -20, -55, -12, -30, -15],
            y: [0, -3, -1, -3, 1, -1, 0],
            opacity: 1,
            times: [0, 0.14, 0.44, 0.56, 0.74, 0.88, 1],
            transition: { duration: 0.65, ease: 'easeOut' },
          },
          rightArm: {
            rotate: [15, 40, -5, 35, 8, 20, 15],
            y: [0, -2, 1, -2, 0, 0, 0],
            opacity: 1,
            times: [0, 0.14, 0.44, 0.56, 0.74, 0.88, 1],
            transition: { duration: 0.65, ease: 'easeOut' },
          },
          shadow: {
            scaleX: [1, 1.2, 0.65, 0.65, 1.15, 0.88, 1],
            opacity: [0.25, 0.3, 0.12, 0.12, 0.28, 0.2, 0.25],
            times: [0, 0.12, 0.42, 0.54, 0.72, 0.86, 1],
            transition: { duration: 0.65, ease: 'easeOut' },
          },
        };
    }
  }, [activeReaction]);

  // Personality-driven idle breathing loop (always visible, opacity: 1, subtle living movement)
  const idleBreathing = useMemo(() => {
    if (moodType === 'AHEAD_OF_GOAL') {
      // Confident, proud posture when savings are high
      return {
        body: {
          y: [0, -3.5, 0],
          x: 0,
          opacity: 1,
          transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
        },
        face: {
          scaleY: [1, 1.035, 1],
          scaleX: [1, 0.98, 1],
          rotate: [0, 1, 0],
          opacity: 1,
          transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
        },
        leftArm: {
          rotate: [-20, -26, -20],
          x: 0,
          y: -1,
          opacity: 1,
          transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
        },
        rightArm: {
          rotate: [20, 26, 20],
          x: 0,
          y: -1,
          opacity: 1,
          transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
        },
        shadow: {
          scaleX: [1, 0.88, 1],
          opacity: [0.26, 0.16, 0.26],
          transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
        },
      };
    }

    if (moodType === 'GETTING_CLOSE') {
      // Subtle nervous micro-tremor when approaching limit
      return {
        body: {
          y: [0, -1.8, 0],
          x: [0, -1, 1, -0.5, 0],
          opacity: 1,
          transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
        },
        face: {
          scaleY: [1, 1.015, 1],
          scaleX: [1, 0.99, 1],
          rotate: [0, -1.5, 1.5, 0],
          opacity: 1,
          transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
        },
        leftArm: {
          rotate: [-15, -22, -15],
          x: 0,
          y: 0,
          opacity: 1,
          transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
        },
        rightArm: {
          rotate: [15, 22, 15],
          x: 0,
          y: 0,
          opacity: 1,
          transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
        },
        shadow: {
          scaleX: [1, 0.94, 1],
          opacity: [0.24, 0.18, 0.24],
          transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
        },
      };
    }

    if (moodType === 'OVER_BUDGET') {
      // Small nervous flutter
      return {
        body: {
          y: [0, -1, 0],
          x: [0, -1.5, 1.5, 0],
          opacity: 1,
          transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
        },
        face: {
          scaleY: [1, 0.98, 1],
          scaleX: [1, 1.02, 1],
          rotate: [0, -1, 1, 0],
          opacity: 1,
          transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
        },
        leftArm: {
          rotate: [-15, -24, -15],
          x: 0,
          y: 0,
          opacity: 1,
          transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
        },
        rightArm: {
          rotate: [15, 24, 15],
          x: 0,
          y: 0,
          opacity: 1,
          transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
        },
        shadow: {
          scaleX: [1, 0.96, 1],
          opacity: [0.24, 0.19, 0.24],
          transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
        },
      };
    }

    // Default relaxed, friendly breathing during normal days
    return {
      body: {
        y: [0, -2.5, 0],
        x: 0,
        opacity: 1,
        transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
      },
      face: {
        scaleY: [1, 1.025, 1],
        scaleX: [1, 0.985, 1],
        rotate: 0,
        opacity: 1,
        transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
      },
      leftArm: {
        rotate: [-15, -19, -15],
        x: 0,
        y: 0,
        opacity: 1,
        transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
      },
      rightArm: {
        rotate: [15, 19, 15],
        x: 0,
        y: 0,
        opacity: 1,
        transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
      },
      shadow: {
        scaleX: [1, 0.92, 1],
        opacity: [0.24, 0.17, 0.24],
        transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
      },
    };
  }, [moodType]);

  return (
    <div
      onClick={handleTap}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer ${className}`}
      style={{ opacity: 1, visibility: 'visible' }}
      aria-label={`Budget mascot reacting to spending: ${emoji}`}
      role="img"
    >
      {/* Celebration Starburst Sparkles */}
      <AnimatePresence>
        {showSparkles && !prefersReducedMotion && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
            {[-45, 0, 45, 135, 180, 225].map((deg, idx) => (
              <motion.span
                key={`sparkle-${idx}`}
                initial={{ opacity: 1, scale: 0.4, x: 0, y: 0 }}
                animate={{
                  opacity: [1, 0.95, 0],
                  scale: [0.4, 1.15, 0.6],
                  x: Math.cos((deg * Math.PI) / 180) * 32,
                  y: Math.sin((deg * Math.PI) / 180) * 32,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                className="absolute text-amber-400 text-sm select-none drop-shadow-xs"
              >
                ✦
              </motion.span>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Ground Physical Drop Shadow */}
      <motion.div
        animate={
          prefersReducedMotion
            ? { opacity: 0.2, scaleX: 1 }
            : isReacting
            ? mascotPhysics.shadow
            : idleBreathing.shadow
        }
        className="absolute -bottom-1 w-11 h-2 rounded-full bg-slate-900/25 dark:bg-black/40 blur-[2px] pointer-events-none z-0"
        style={{ opacity: 0.25 }}
      />

      {/* Mascot Main Physical Body Container (ALWAYS MOUNTED, NEVER UNMOUNTED) */}
      <motion.div
        initial={false}
        animate={
          prefersReducedMotion
            ? { opacity: 1, y: 0, x: 0 }
            : isReacting
            ? mascotPhysics.body
            : idleBreathing.body
        }
        className="relative inline-flex items-center justify-center z-10"
        style={{ opacity: 1, visibility: 'visible' }}
      >
        {/* 1. Left Tiny Stub Arm */}
        <motion.div
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : isReacting
              ? mascotPhysics.leftArm
              : idleBreathing.leftArm
          }
          style={{
            transformOrigin: '90% 25%',
            opacity: 1,
            visibility: 'visible',
          }}
          className="absolute -left-2.5 top-[48%] -translate-y-1/2 z-0 pointer-events-none"
        >
          <MascotStubArm side="left" />
        </motion.div>

        {/* 2. Central Emoji Face Mascot Body (Guaranteed 100% visible) */}
        <motion.div
          animate={
            prefersReducedMotion
              ? { opacity: 1, scale: 1 }
              : isReacting
              ? mascotPhysics.face
              : idleBreathing.face
          }
          style={{
            transformOrigin: '50% 90%',
            opacity: 1,
            visibility: 'visible',
          }}
          className={`inline-block leading-none transform-gpu z-10 select-none ${sizeClassName}`}
        >
          <span
            className="inline-block select-none"
            style={{
              opacity: 1,
              visibility: 'visible',
              display: 'inline-block',
              lineHeight: 1,
            }}
          >
            {emoji}
          </span>
        </motion.div>

        {/* 3. Right Tiny Stub Arm */}
        <motion.div
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : isReacting
              ? mascotPhysics.rightArm
              : idleBreathing.rightArm
          }
          style={{
            transformOrigin: '10% 25%',
            opacity: 1,
            visibility: 'visible',
          }}
          className="absolute -right-2.5 top-[48%] -translate-y-1/2 z-0 pointer-events-none"
        >
          <MascotStubArm side="right" />
        </motion.div>
      </motion.div>
    </div>
  );
};
