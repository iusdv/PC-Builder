import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: 'line' | 'box';
};

export default function Skeleton({ variant = 'box', className = '', ...props }: Props) {
  const base = variant === 'line' ? 'skeleton skeleton-line' : 'skeleton skeleton-box';
  return <div {...props} className={`${base} ${className}`.trim()} />;
}
