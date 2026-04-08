
import React from 'react';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface Props {
  status: SyncStatus;
  onRetry?: () => void;
}

export function SyncStatusPill({ status, onRetry }: Props) {
  const map = {
    synced: {
      label: 'SYNCED',
      color: 'bg-green-500',
      border: 'border-green-500/20',
      glow: 'shadow-[0_0_10px_rgba(34,197,94,0.2)]'
    },
    syncing: {
      label: 'SYNCING',
      color: 'bg-yellow-400',
      border: 'border-yellow-500/20',
      glow: 'shadow-[0_0_10px_rgba(250,204,21,0.2)]'
    },
    offline: {
      label: 'OFFLINE',
      color: 'bg-zinc-500',
      border: 'border-zinc-500/20',
      glow: 'shadow-[0_0_10px_rgba(113,113,122,0.2)]'
    },
    error: {
      label: 'ERROR',
      color: 'bg-red-500',
      border: 'border-red-500/20',
      glow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]'
    }
  };

  const s = map[status];

  return (
    <div 
        onClick={(status === 'offline' || status === 'error') ? onRetry : undefined}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-md border ${s.border} transition-all duration-500 ${s.glow} ${(status === 'offline' || status === 'error') ? 'cursor-pointer hover:bg-zinc-900 pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div className="relative">
        <div className={`w-1.5 h-1.5 rounded-full ${s.color} relative z-10`} />
        {status === 'syncing' && (
            <div className={`absolute inset-0 rounded-full ${s.color} animate-ping opacity-75`} />
        )}
      </div>
      <span className="text-[9px] font-black tracking-widest text-zinc-400">
        {(status === 'offline' || status === 'error') ? 'RETRY SYNC' : s.label}
      </span>
    </div>
  );
}
