import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium transition-all rounded-xl gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow focus:ring-brand-500',
    secondary:
      'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 focus:ring-zinc-400',
    outline:
      'border border-zinc-300 hover:border-zinc-400 bg-white text-zinc-700 hover:bg-zinc-50 focus:ring-brand-500',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500',
    ghost:
      'bg-transparent hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 focus:ring-zinc-400',
    success:
      'bg-teal-600 hover:bg-teal-700 text-white shadow-sm focus:ring-teal-500',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-2.5',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

