import { animate, useMotionValue } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

export default function useAnimatedNumber(target: number, opts?: { duration?: number }) {
  const duration = opts?.duration ?? 0.35;
  const mv = useMotionValue(target);
  const [value, setValue] = useState(target);

  useEffect(() => {
    const controls = animate(mv, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => setValue(latest),
    });
    return () => controls.stop();
  }, [mv, target, duration]);

  return useMemo(() => value, [value]);
}
