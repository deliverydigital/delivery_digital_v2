import { motion } from 'framer-motion';

/**
 * Apple-style animated SVG illustrations per training category.
 * Pure SVG + Framer Motion (no external deps, no GIFs, no Lottie JSON).
 * Each is a self-contained 96x96 animated icon, designed to sit on a soft
 * gradient background and to STAY alive (continuous loops, not one-shot).
 */

const SIZE = 96;

/* Reusable: subtle floating wrapper to give the whole illustration breathing */
function Float({ children, range = 3, duration = 4, delay = 0 }: { children: React.ReactNode; range?: number; duration?: number; delay?: number }) {
  return (
    <motion.g
      animate={{ y: [0, -range, 0, range * 0.5, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {children}
    </motion.g>
  );
}

/* ---------- Nutrition: bowl + ingredients dancing ---------- */
function NutritionIllo() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 96 96" fill="none">
      {/* Steam (always rising) */}
      <motion.path
        d="M40 26 q3 -4 0 -8"
        stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.3}
        animate={{ y: [-2, -10, -2], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M52 24 q3 -4 0 -8"
        stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.3}
        animate={{ y: [-2, -10, -2], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      />
      <motion.path
        d="M46 22 q3 -4 0 -8"
        stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.3}
        animate={{ y: [-2, -10, -2], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
      />

      {/* Bowl (gentle breathing) */}
      <motion.g
        animate={{ scaleY: [1, 1.02, 1] }}
        style={{ transformOrigin: '48px 78px' }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M16 50 Q16 78 48 78 Q80 78 80 50 Z" fill="#fff" stroke="#1D1D1F" strokeWidth={2} strokeLinejoin="round" />
        <ellipse cx={48} cy={50} rx={32} ry={6} fill="#F5F5F7" stroke="#1D1D1F" strokeWidth={2} />
      </motion.g>

      {/* Tomato bouncing */}
      <motion.g
        animate={{ y: [0, -4, 0], rotate: [-3, 3, -3] }}
        style={{ transformOrigin: '36px 44px' }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <circle cx={36} cy={44} r={7} fill="#FF6B6B" stroke="#1D1D1F" strokeWidth={1.4} />
        <path d="M34 38 q2 -3 4 0" stroke="#34C759" strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <ellipse cx={34} cy={42} rx={1.4} ry={2} fill="#fff" opacity={0.5} />
      </motion.g>

      {/* Lettuce leaf swaying */}
      <motion.path
        d="M52 42 q4 -6 10 -3 q3 4 -1 8 q-5 2 -9 -5 z"
        fill="#34C759" stroke="#1D1D1F" strokeWidth={1.4}
        animate={{ rotate: [-6, 8, -6], y: [0, -2, 0] }}
        style={{ transformOrigin: '57px 45px' }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />

      {/* Carrot slice with rim light */}
      <motion.g
        animate={{ y: [0, -3, 0], rotate: [0, 360] }}
        style={{ transformOrigin: '64px 48px' }}
        transition={{
          y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
          rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
        }}
      >
        <circle cx={64} cy={48} r={4} fill="#FF9F0A" stroke="#1D1D1F" strokeWidth={1.2} />
        <circle cx={64} cy={48} r={1.6} fill="#FFB340" />
      </motion.g>

      {/* Sparkle */}
      <motion.circle
        cx={78} cy={32} r={1.2} fill="#FFD60A"
        animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 }}
      />
      <motion.circle
        cx={20} cy={36} r={1} fill="#FF6B6B"
        animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 1.2 }}
      />
    </svg>
  );
}

/* ---------- Hygiène HACCP: rotating plate + drawn shield ---------- */
function HygieneIllo() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 96 96" fill="none">
      {/* Plate (slow rotation) */}
      <motion.g
        animate={{ rotate: [0, 360] }}
        style={{ transformOrigin: '48px 56px' }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx={48} cy={56} r={26} fill="#fff" stroke="#1D1D1F" strokeWidth={2} />
        <circle cx={48} cy={56} r={20} fill="none" stroke="#1D1D1F" strokeWidth={1} opacity={0.3} />
        <circle cx={32} cy={56} r={1.3} fill="#1D1D1F" opacity={0.25} />
        <circle cx={64} cy={56} r={1.3} fill="#1D1D1F" opacity={0.25} />
      </motion.g>

      {/* Cutlery balancing */}
      <motion.line
        x1={26} y1={50} x2={26} y2={70}
        stroke="#1D1D1F" strokeWidth={2} strokeLinecap="round" opacity={0.7}
        animate={{ rotate: [-3, 3, -3] }}
        style={{ transformOrigin: '26px 60px' }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.line
        x1={70} y1={50} x2={70} y2={70}
        stroke="#1D1D1F" strokeWidth={2} strokeLinecap="round" opacity={0.7}
        animate={{ rotate: [3, -3, 3] }}
        style={{ transformOrigin: '70px 60px' }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Shield + redrawing checkmark loop */}
      <motion.g
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M48 16 L62 22 V34 Q62 44 48 50 Q34 44 34 34 V22 Z" fill="#34C759" stroke="#1D1D1F" strokeWidth={2} strokeLinejoin="round" />
        <motion.path
          d="M41 32 L46 37 L55 27"
          stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none"
          animate={{ pathLength: [0, 1, 1, 0] }}
          transition={{ duration: 3.2, times: [0, 0.4, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>

      {/* Sparkles */}
      <motion.circle
        cx={20} cy={26} r={1.2} fill="#34C759"
        animate={{ scale: [0, 1.6, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      />
      <motion.circle
        cx={78} cy={36} r={1.2} fill="#34C759"
        animate={{ scale: [0, 1.6, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1.3 }}
      />
    </svg>
  );
}

/* ---------- Sécurité chantier: hat with looping reflective stripe ---------- */
function ConstructionIllo() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 96 96" fill="none">
      <defs>
        <clipPath id="hat-strip">
          <rect x={20} y={58} width={56} height={6} rx={3} />
        </clipPath>
      </defs>

      {/* Hat group bobbing */}
      <motion.g
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M22 60 Q22 36 48 36 Q74 36 74 60 Z" fill="#FFB340" stroke="#1D1D1F" strokeWidth={2} strokeLinejoin="round" />
        <line x1={48} y1={36} x2={48} y2={60} stroke="#1D1D1F" strokeWidth={2} />
        <rect x={20} y={58} width={56} height={6} rx={3} fill="#FF9500" stroke="#1D1D1F" strokeWidth={2} />
        {/* Reflective stripe sliding across band */}
        <g clipPath="url(#hat-strip)">
          <motion.rect
            y={59} width={20} height={4} fill="#fff" opacity={0.85}
            animate={{ x: [-30, 90] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>
        {/* Brand dot */}
        <circle cx={48} cy={48} r={2} fill="#1D1D1F" />
      </motion.g>

      {/* Sparkles around the hat */}
      <motion.circle cx={32} cy={28} r={1.5} fill="#FFD60A"
        animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, delay: 0.2 }}
      />
      <motion.circle cx={62} cy={26} r={1.2} fill="#FFD60A"
        animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, delay: 0.8 }}
      />
      <motion.circle cx={78} cy={48} r={1} fill="#FF9500"
        animate={{ scale: [0, 1.6, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 1.2 }}
      />

      {/* Base shadow stretching */}
      <motion.ellipse
        cx={48} cy={76} rx={28} ry={3} fill="#1D1D1F" opacity={0.15}
        animate={{ scaleX: [1, 1.1, 1] }}
        style={{ transformOrigin: '48px 76px' }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/* ---------- Anglais: globe rotating with FR/EN bubbles ---------- */
function LanguagesIllo() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 96 96" fill="none">
      {/* Globe (continuous spin) */}
      <circle cx={48} cy={50} r={26} fill="#0A84FF" stroke="#1D1D1F" strokeWidth={2} />
      <motion.g
        animate={{ rotate: 360 }}
        style={{ transformOrigin: '48px 50px' }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      >
        <ellipse cx={48} cy={50} rx={26} ry={9} fill="none" stroke="#fff" strokeWidth={1.4} opacity={0.7} />
        <ellipse cx={48} cy={50} rx={9} ry={26} fill="none" stroke="#fff" strokeWidth={1.4} opacity={0.7} />
        <ellipse cx={48} cy={50} rx={20} ry={26} fill="none" stroke="#fff" strokeWidth={1} opacity={0.4} />
        {/* Continents (rotating with the globe) */}
        <path d="M38 42 q4 -2 8 0 q2 4 -2 6 q-4 0 -6 -6z" fill="#34C759" opacity={0.85} />
        <path d="M52 56 q4 -1 6 2 q-1 4 -5 4 q-3 -2 -1 -6z" fill="#34C759" opacity={0.85} />
        <circle cx={42} cy={36} r={1.4} fill="#34C759" opacity={0.85} />
        <circle cx={58} cy={42} r={1.2} fill="#34C759" opacity={0.85} />
      </motion.g>

      {/* Floating FR pill */}
      <motion.g
        animate={{ y: [0, -4, 0], x: [0, 1.5, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x={8} y={18} width={22} height={12} rx={6} fill="#fff" stroke="#1D1D1F" strokeWidth={1.6} />
        <text x={19} y={26.6} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="#1D1D1F">FR</text>
      </motion.g>
      {/* Floating EN pill */}
      <motion.g
        animate={{ y: [0, -4, 0], x: [0, -1.5, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
      >
        <rect x={66} y={70} width={22} height={12} rx={6} fill="#1D1D1F" />
        <text x={77} y={78.6} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="#fff">EN</text>
      </motion.g>

      {/* Sound dot (translation in transit) */}
      <motion.circle
        cx={32} cy={28} r={1.5} fill="#0A84FF"
        animate={{
          cx: [32, 48, 70],
          cy: [28, 40, 70],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      />
    </svg>
  );
}

/* ---------- Développement durable: plant growing + sway ---------- */
function SustainableIllo() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 96 96" fill="none">
      {/* Pot static */}
      <path d="M30 64 H66 L62 84 H34 Z" fill="#A0522D" stroke="#1D1D1F" strokeWidth={2} strokeLinejoin="round" />
      <line x1={30} y1={64} x2={66} y2={64} stroke="#1D1D1F" strokeWidth={2} />
      <ellipse cx={48} cy={64} rx={16} ry={1.5} fill="#1D1D1F" opacity={0.2} />

      {/* Plant swaying */}
      <motion.g
        animate={{ rotate: [-3, 3, -3] }}
        style={{ transformOrigin: '48px 64px' }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M48 64 V32" stroke="#34C759" strokeWidth={3} strokeLinecap="round" fill="none" />
        <motion.path
          d="M48 50 q-10 -6 -14 0 q4 6 14 0z"
          fill="#34C759" stroke="#1D1D1F" strokeWidth={1.5}
          animate={{ scaleX: [1, 1.06, 1] }}
          style={{ transformOrigin: '48px 50px' }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M48 42 q10 -6 14 0 q-4 6 -14 0z"
          fill="#34C759" stroke="#1D1D1F" strokeWidth={1.5}
          animate={{ scaleX: [1, 1.06, 1] }}
          style={{ transformOrigin: '48px 42px' }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
        <motion.path
          d="M48 32 q4 -8 0 -10 q-4 2 0 10z"
          fill="#34C759" stroke="#1D1D1F" strokeWidth={1.5}
          animate={{ scaleY: [1, 1.1, 1] }}
          style={{ transformOrigin: '48px 32px' }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        />
      </motion.g>

      {/* Falling water drops */}
      <motion.circle
        cx={70} cy={20} r={1.6} fill="#0A84FF"
        animate={{ cy: [20, 60], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeIn' }}
      />
      <motion.circle
        cx={26} cy={20} r={1.2} fill="#0A84FF"
        animate={{ cy: [20, 60], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeIn', delay: 0.7 }}
      />

      {/* Sparkle */}
      <motion.circle
        cx={66} cy={26} r={1.5} fill="#FFD60A"
        animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
      />
    </svg>
  );
}

/* ---------- Sécurité (générale): shield with continuous redraw + pulse ring ---------- */
function ShieldIllo() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 96 96" fill="none">
      {/* Pulse rings */}
      <motion.path
        d="M48 14 L72 22 V46 Q72 64 48 80 Q24 64 24 46 V22 Z"
        fill="none" stroke="#0A84FF" strokeWidth={2}
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0, 0.6] }}
        style={{ transformOrigin: '48px 47px' }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.path
        d="M48 14 L72 22 V46 Q72 64 48 80 Q24 64 24 46 V22 Z"
        fill="none" stroke="#0A84FF" strokeWidth={2}
        animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
        style={{ transformOrigin: '48px 47px' }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
      />

      {/* Shield breathing */}
      <motion.g
        animate={{ scale: [1, 1.03, 1] }}
        style={{ transformOrigin: '48px 47px' }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M48 14 L72 22 V46 Q72 64 48 80 Q24 64 24 46 V22 Z" fill="#0A84FF" stroke="#1D1D1F" strokeWidth={2} strokeLinejoin="round" />
        <motion.path
          d="M36 46 L46 56 L62 38"
          stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none"
          animate={{ pathLength: [0, 1, 1, 0] }}
          transition={{ duration: 3.2, times: [0, 0.4, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>

      {/* Sparks on the side */}
      <motion.circle cx={20} cy={30} r={1.3} fill="#0A84FF"
        animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
      />
      <motion.circle cx={76} cy={64} r={1.3} fill="#0A84FF"
        animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1.1 }}
      />
    </svg>
  );
}

/* ---------- Web / Code: live typing inside browser ---------- */
function WebIllo() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 96 96" fill="none">
      {/* Browser frame */}
      <rect x={14} y={20} width={68} height={56} rx={6} fill="#fff" stroke="#1D1D1F" strokeWidth={2} />
      <rect x={14} y={20} width={68} height={11} rx={6} fill="#F2F2F7" stroke="#1D1D1F" strokeWidth={2} />
      <circle cx={20} cy={25.5} r={1.5} fill="#FF6B6B" />
      <circle cx={26} cy={25.5} r={1.5} fill="#FFD60A" />
      <circle cx={32} cy={25.5} r={1.5} fill="#34C759" />

      {/* Brackets gentle pulsing */}
      <motion.path
        d="M30 44 L24 52 L30 60"
        stroke="#0A84FF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none"
        animate={{ x: [0, -1.5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M66 44 L72 52 L66 60"
        stroke="#0A84FF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none"
        animate={{ x: [0, 1.5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Typing lines (looping draw → erase) */}
      <motion.line
        x1={36} y1={42} x2={60} y2={42}
        stroke="#1D1D1F" strokeWidth={2} strokeLinecap="round" opacity={0.7}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 3, times: [0, 0.4, 0.7, 1], repeat: Infinity }}
      />
      <motion.line
        x1={36} y1={50} x2={56} y2={50}
        stroke="#0A84FF" strokeWidth={2} strokeLinecap="round"
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 3, times: [0, 0.5, 0.8, 1], repeat: Infinity, delay: 0.4 }}
      />
      <motion.line
        x1={36} y1={58} x2={50} y2={58}
        stroke="#1D1D1F" strokeWidth={2} strokeLinecap="round" opacity={0.7}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 3, times: [0, 0.55, 0.9, 1], repeat: Infinity, delay: 0.8 }}
      />

      {/* Cursor blinking */}
      <motion.line
        x1={58} y1={66} x2={58} y2={72}
        stroke="#1D1D1F" strokeWidth={2.5} strokeLinecap="round"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.9, repeat: Infinity }}
      />
    </svg>
  );
}

/* ---------- Default: book pages flipping continuously ---------- */
function BookIllo() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 96 96" fill="none">
      {/* Book cover */}
      <rect x={18} y={22} width={60} height={52} rx={4} fill="#fff" stroke="#1D1D1F" strokeWidth={2} />
      <line x1={48} y1={22} x2={48} y2={74} stroke="#1D1D1F" strokeWidth={2} />
      {/* Static text lines */}
      <line x1={24} y1={32} x2={42} y2={32} stroke="#1D1D1F" strokeWidth={1.5} opacity={0.4} />
      <line x1={24} y1={38} x2={44} y2={38} stroke="#1D1D1F" strokeWidth={1.5} opacity={0.4} />
      <line x1={24} y1={44} x2={40} y2={44} stroke="#1D1D1F" strokeWidth={1.5} opacity={0.4} />
      <line x1={54} y1={32} x2={72} y2={32} stroke="#1D1D1F" strokeWidth={1.5} opacity={0.4} />
      <line x1={54} y1={38} x2={70} y2={38} stroke="#1D1D1F" strokeWidth={1.5} opacity={0.4} />
      <line x1={54} y1={44} x2={68} y2={44} stroke="#1D1D1F" strokeWidth={1.5} opacity={0.4} />
      {/* Flipping page */}
      <motion.path
        d="M48 22 Q60 28 60 50 Q60 72 48 74 Z"
        fill="#F5F5F7" stroke="#1D1D1F" strokeWidth={1.6}
        animate={{ scaleX: [1, 0.05, 1] }}
        style={{ transformOrigin: '48px 48px' }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
      />
      {/* Sparkle on cover */}
      <motion.circle cx={70} cy={62} r={1.4} fill="#FFD60A"
        animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 }}
      />
    </svg>
  );
}

/* ---------- Health/heart: ECG line ---------- */
function HealthIllo() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 96 96" fill="none">
      <motion.path
        d="M48 76 C20 56 20 32 36 28 Q44 26 48 34 Q52 26 60 28 C76 32 76 56 48 76 Z"
        fill="#FF375F" stroke="#1D1D1F" strokeWidth={2} strokeLinejoin="round"
        animate={{ scale: [1, 1.08, 1] }}
        style={{ transformOrigin: '48px 52px' }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M22 50 H32 L36 42 L44 58 L52 38 L60 50 H74"
        stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none"
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 2.4, times: [0, 0.5, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Pulse rings */}
      <motion.circle
        cx={48} cy={52} r={32} fill="none" stroke="#FF375F" strokeWidth={1.5}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
        style={{ transformOrigin: '48px 52px' }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
      />
    </svg>
  );
}

/* ============================================================
   Public selector: pick illustration based on program metadata
   ============================================================ */
export function getProgramIllustration(program: any) {
  const t = (program.title || program.id || '').toLowerCase();
  const cat = (program.category || '').toLowerCase();

  if (/nutrition|allerg/.test(t)) return <NutritionIllo />;
  if (/d[ée]veloppement durable|écolog|environn|durabilit/.test(t)) return <SustainableIllo />;
  if (/hygi[èe]ne|haccp|alimentai/.test(t)) return <HygieneIllo />;
  if (/chantier|construction|btp/.test(t)) return <ConstructionIllo />;
  if (/english|anglai|langue|reflex/.test(t)) return <LanguagesIllo />;
  if (/web|d[ée]veloppe(?:ur|ment)|code|programmation/.test(t)) return <WebIllo />;
  if (/sant[ée]|m[ée]dic|sst|secourisme/.test(t)) return <HealthIllo />;
  if (/s[ée]curit[ée]/.test(t)) return <ShieldIllo />;

  if (cat === 'safety') return <HygieneIllo />;
  if (cat === 'languages') return <LanguagesIllo />;
  if (cat === 'web') return <WebIllo />;
  if (cat === 'health') return <HealthIllo />;

  return <BookIllo />;
}
