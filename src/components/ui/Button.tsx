import { ButtonHTMLAttributes, forwardRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, children, disabled, ...props }, ref) => {
    const setGlobalLoading = useAppStore((state) => state.setGlobalLoading);

    useEffect(() => {
      if (loading) {
        setGlobalLoading(true);
      } else {
        // We don't want to blindly set it to false because other buttons might be loading
        // But for a simple app like this, it's usually fine.
        // A better way would be a counter, but let's stick to this for now.
        setGlobalLoading(false);
      }
    }, [loading, setGlobalLoading]);

    const variants = {
      primary: 'bg-orange-600 text-white hover:bg-orange-700',
      secondary: 'bg-orange-100 text-orange-900 hover:bg-orange-200',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    return (
      <button
        ref={ref}
        disabled={loading || disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {children}
      </button>
    );
  }
);
