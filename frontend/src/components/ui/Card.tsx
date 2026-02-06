import type { HTMLAttributes, ReactNode } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export default function Card({ className = '', children, ...props }: Props) {
  return (
    <div {...props} className={`app-card ${className}`.trim()}>
      {children}
    </div>
  );
}
