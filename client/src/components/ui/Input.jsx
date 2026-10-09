import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({ className, label, error, ...props }, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-xs font-medium text-zinc-400">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full bg-[#111215] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-all duration-150 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50',
          error && 'border-rose-500/50 focus:border-rose-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
