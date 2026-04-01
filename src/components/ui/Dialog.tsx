
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconLock } from './Icons';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'alert' | 'confirm';
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'alert',
  onConfirm,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/10">
                <IconLock className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white">
                {title}
              </h3>
            </div>

            <div className="mb-8 text-lg font-medium leading-relaxed text-zinc-400">
              {message.split('\n').map((line, i) => (
                <p key={i} className={cn(line.startsWith('⚠️') && "text-amber-400 font-bold mt-2")}>
                  {line}
                </p>
              ))}
            </div>

            <div className="flex gap-3">
              {type === 'confirm' && (
                <button
                  onClick={onClose}
                  className="flex-1 rounded-2xl border-2 border-white/5 bg-white/5 py-4 font-black uppercase tracking-widest text-white transition-all hover:bg-white/10 active:scale-95"
                >
                  {cancelLabel}
                </button>
              )}
              <button
                onClick={() => {
                  if (type === 'confirm' && onConfirm) {
                    onConfirm();
                  }
                  onClose();
                }}
                className={cn(
                  "flex-1 rounded-2xl py-4 font-black uppercase tracking-widest text-on-primary transition-all active:scale-95",
                  type === 'confirm' 
                    ? "bg-primary shadow-lg shadow-purple-900/40 hover:bg-primary/80" 
                    : "bg-zinc-100 text-zinc-900 hover:bg-white"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Dialog;
