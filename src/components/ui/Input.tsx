import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
