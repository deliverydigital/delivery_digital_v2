import { motion } from 'framer-motion';

/**
 * Apple Intelligence-style animated AI orb.
 * Rotating conic gradient ring + pulsing halo + center glow + floating sparkles.
 *
 * Use innerColor to match the surface the orb sits on (cream, white, blue, etc.)
 * so the inner disc blends in - the ring becomes the visible halo.
 */
export default function AIOrb({ size = 28, innerColor = '#F2EFE9' }: { size?: number; innerColor?: string }) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Pulsing halo */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: 'radial-gradient(circle, rgba(139,92,246,0.45), transparent 70%)',
        }}
        animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
      />
      {/* Rotating conic gradient ring (Siri style) */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: 'conic-gradient(from 0deg, #FF6B6B, #FFD60A, #34C759, #0A84FF, #8B5CF6, #FF375F, #FF6B6B)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      {/* Inner disc to leave just a ring (color matches surface) */}
      <div
        className="absolute rounded-full"
        style={{ width: size - 6, height: size - 6, background: innerColor }}
      />
      {/* Center glowing dot */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.42,
          height: size * 0.42,
          background: 'radial-gradient(circle, #FFFFFF 0%, #C7BBF8 50%, #8B5CF6 100%)',
          boxShadow: '0 0 14px rgba(139,92,246,0.7)',
        }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Floating sparkles */}
      <motion.span
        className="absolute rounded-full bg-[#8B5CF6]"
        style={{ width: 3, height: 3, top: -2, left: size * 0.78 }}
        animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className="absolute rounded-full bg-[#0A84FF]"
        style={{ width: 2, height: 2, bottom: 0, left: -2 }}
        animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, delay: 0.9 }}
      />
      <motion.span
        className="absolute rounded-full bg-[#FF375F]"
        style={{ width: 2, height: 2, top: size * 0.5, right: -2 }}
        animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, delay: 1.4 }}
      />
    </div>
  );
}
