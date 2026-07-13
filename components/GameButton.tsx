// components/GameButton.tsx
import { motion, HTMLMotionProps } from 'framer-motion';

interface GameButtonProps extends HTMLMotionProps<'button'> {}

export default function GameButton({ children, className, ...props }: GameButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}