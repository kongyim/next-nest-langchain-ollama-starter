import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'sm';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    const variantClass =
      variant === 'secondary'
        ? 'bg-slate-200 text-slate-900 hover:bg-slate-300'
        : variant === 'ghost'
          ? 'bg-transparent text-slate-700 hover:bg-slate-100'
          : 'bg-slate-900 text-white hover:bg-slate-700';

    const sizeClass = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm';

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          variantClass,
          sizeClass,
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
