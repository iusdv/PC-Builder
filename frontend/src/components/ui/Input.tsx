import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className = '', ...props }: Props) {
  return (
    <input
      {...props}
      className={`app-input px-3 py-2 text-sm outline-none ${className}`.trim()}
    />
  );
}
