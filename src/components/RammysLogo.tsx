import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type LogoSwallowPhase = 'IDLE' | 'ANTICIPATE' | 'SWALLOW' | 'PULSE' | 'CELEBRATE';

interface RammysLogoProps {
  size?: number;
  showBrandingText?: boolean;
  className?: string;
  swallowPhase?: LogoSwallowPhase;
}

export const RammysLogo: React.FC<RammysLogoProps> = ({
  size = 180,
  showBrandingText = true,
  className = '',
  swallowPhase = 'IDLE',
}) => {
  const isAnticipating = swallowPhase === 'ANTICIPATE';
  const isSwallowing = swallowPhase === 'SWALLOW';
  const isPulsing = swallowPhase === 'PULSE' || swallowPhase === 'CELEBRATE';

  return (
    <motion.div
      animate={
        isSwallowing
          ? {
              scaleX: [1, 1.22, 0.9, 1.08, 1],
              scaleY: [1, 0.8, 1.18, 0.94, 1],
              rotate: [0, -3, 3, -1, 0],
            }
          : isAnticipating
          ? {
              scale: [1, 1.06, 1.04],
              y: [0, -4, -2],
            }
          : isPulsing
          ? {
              scale: [1, 1.1, 1],
              y: [0, -3, 0],
            }
          : { scale: 1, y: 0 }
      }
      transition={{
        duration: isSwallowing ? 0.45 : isAnticipating ? 0.4 : 0.35,
        ease: [0.25, 1, 0.5, 1],
      }}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Expanding Ripple Shockwave on Pulse / Swallow */}
      <AnimatePresence>
        {isPulsing && (
          <>
            <motion.div
              initial={{ scale: 0.7, opacity: 0.85 }}
              animate={{ scale: 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              className="absolute inset-0 rounded-[44px] border-2 border-indigo-400 dark:border-indigo-300 pointer-events-none"
            />
            <motion.div
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 1.65, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
              className="absolute inset-0 rounded-[44px] bg-gradient-to-r from-amber-400/30 to-indigo-500/30 blur-md pointer-events-none"
            />
          </>
        )}
      </AnimatePresence>

      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="w-full h-full drop-shadow-xl overflow-visible"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="100%" stopColor="#2E1065" />
          </linearGradient>
          <linearGradient id="logoWalletGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C7B3ED" />
            <stop offset="50%" stopColor="#AF98DE" />
            <stop offset="100%" stopColor="#8B72C2" />
          </linearGradient>
          <radialGradient id="logoCoinGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFF9C4" />
            <stop offset="45%" stopColor="#FFCA28" />
            <stop offset="100%" stopColor="#FFA000" />
          </radialGradient>
          <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#090615" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Outer squircle base */}
        <rect width="200" height="200" rx="44" fill="url(#logoBgGrad)" />

        {/* Subtle radial inner glow */}
        <circle cx="100" cy="85" r="70" fill="#4338CA" opacity="0.35" />

        {/* Analytics Growth Bars (Background Right) */}
        <g>
          {/* Bar 1 */}
          <rect x="134" y="102" width="13" height="24" rx="3.5" fill="#10B981" opacity="0.75" />
          {/* Bar 2 */}
          <rect x="150" y="88" width="13" height="38" rx="3.5" fill="#10B981" opacity="0.9" />
          {/* Bar 3 */}
          <rect x="166" y="74" width="13" height="52" rx="3.5" fill="#34D399" />
          {/* Trend Curved Arrow */}
          <path
            d="M 140 92 Q 152 75 170 52"
            fill="none"
            stroke="#6EE7B7"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <polygon points="176,48 163,52 171,64" fill="#6EE7B7" />
        </g>

        {/* 3D Lavender Wallet */}
        <g filter="url(#logoShadow)">
          {/* Wallet body */}
          <rect x="54" y="58" width="88" height="68" rx="14" fill="url(#logoWalletGrad)" />
          {/* Top flap */}
          <rect x="54" y="70" width="88" height="16" fill="#8B72C2" opacity="0.35" />

          {/* Dynamic Absorption Aperture / Suction Aura */}
          {(isAnticipating || isSwallowing) && (
            <g>
              <ellipse
                cx="98"
                cy="74"
                rx={isSwallowing ? '26' : '16'}
                ry={isSwallowing ? '14' : '8'}
                fill="#F59E0B"
                opacity={isSwallowing ? '0.85' : '0.55'}
              />
              <ellipse
                cx="98"
                cy="74"
                rx={isSwallowing ? '14' : '8'}
                ry={isSwallowing ? '7' : '4'}
                fill="#FFFFFF"
                opacity="0.9"
              />
            </g>
          )}

          {/* Celebration Light Sparkle on Pulse */}
          {isPulsing && (
            <g>
              <circle cx="98" cy="74" r="14" fill="#FFFFFF" opacity="0.75" />
              <path
                d="M 98 52 L 101 69 L 118 74 L 101 79 L 98 96 L 95 79 L 78 74 L 95 69 Z"
                fill="#FDE047"
                opacity="0.95"
              />
            </g>
          )}

          {/* Stitching */}
          <rect
            x="58"
            y="62"
            width="80"
            height="60"
            rx="11"
            fill="none"
            stroke="#7E66B5"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            opacity="0.6"
          />
          {/* Snap strap */}
          <rect x="114" y="88" width="32" height="22" rx="11" fill="#7E65B5" />
          <circle cx="125" cy="99" r="5.5" fill="#2E1C52" />
          <circle cx="125" cy="99" r="2.2" fill="#9E8AC7" />
        </g>

        {/* Ghanaian Cedi Gold Coin (Foreground) */}
        <g filter="url(#logoShadow)">
          <circle cx="64" cy="110" r="26" fill="url(#logoCoinGrad)" stroke="#FFB300" strokeWidth="2.5" />
          <circle cx="64" cy="110" r="22" fill="none" stroke="#FF8F00" strokeWidth="1" strokeDasharray="3 2" />
          {/* Ghanaian Cedi Symbol ₵ */}
          <path
            d="M 72 101 A 11 11 0 1 0 72 119"
            fill="none"
            stroke="#B45309"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <line
            x1="64"
            y1="95"
            x2="64"
            y2="125"
            stroke="#B45309"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </g>

        {/* Branding Typography */}
        {showBrandingText && (
          <g>
            <text
              x="100"
              y="158"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="22"
              fontWeight="900"
              fontFamily="system-ui, sans-serif"
            >
              Rammy's
            </text>
            <text
              x="100"
              y="174"
              textAnchor="middle"
              fill="#6EE7B7"
              fontSize="9.5"
              fontWeight="800"
              letterSpacing="2.5"
              fontFamily="system-ui, sans-serif"
            >
              SPEND TRACKER
            </text>
            {/* Bottom accent pill */}
            <rect x="86" y="182" width="28" height="3" rx="1.5" fill="#A78BFA" />
          </g>
        )}
      </svg>
    </motion.div>
  );
};
