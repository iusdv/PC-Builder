import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  leftIcon?: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export default function Button({
  variant = 'secondary',
  leftIcon,
  className = '',
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={`btn ${variantClass[variant]} text-sm ${className}`.trim()}
    >
      {leftIcon}
      {children}
    </button>
  );
}
