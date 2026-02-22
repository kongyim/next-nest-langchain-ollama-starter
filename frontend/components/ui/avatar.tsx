import * as React from 'react';

import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700',
        className,
      )}
      {...props}
    />
  ),
);

Avatar.displayName = 'Avatar';

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn('leading-none', className)} {...props} />
));

AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarFallback };
