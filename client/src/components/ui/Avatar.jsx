import React from 'react';
import { cn } from '../../lib/utils';

export const Avatar = ({ src, name = '', size = 'md', className, status }) => {
  const sizes = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  };

  const getInitials = (n) => {
    if (!n) return 'U';
    return n
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex items-center justify-center font-medium text-zinc-300 select-none shadow-sm',
          sizes[size]
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {status === 'online' && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#09090b] rounded-full pulse-presence" />
      )}
    </div>
  );
};
