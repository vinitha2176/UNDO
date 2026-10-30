import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'outline' | 'mint' | 'peach';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const variantStyles = {
    default: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    success: 'bg-teal-50 text-teal-700 border-teal-200',
    mint: 'bg-mint-100 text-mint-dark border-mint/40',
    peach: 'bg-peach-100 text-peach-dark border-peach/50',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    outline: 'bg-transparent text-zinc-600 border-zinc-300',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-full',
    md: 'text-xs px-2.5 py-1 rounded-full',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium border gap-1 select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};

