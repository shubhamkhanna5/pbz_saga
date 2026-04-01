
import React, { useState } from 'react';
import { IconX, IconCheck, IconAlert, IconLock } from './ui/Icons';
import { vibrate } from '../utils/godMode';

interface AdminUnlockModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AdminUnlockModal: React.FC<AdminUnlockModalProps> = ({ onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  
  // Use env var or fallback for dev
  const ADMIN_PASSWORD = (import.meta as any).env?.VITE_ADMIN_PASSWORD || "1234";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      vibrate('success');
      onSuccess();
    } else {
      setError(true);
      vibrate('error');
      setTimeout(() => setError(false), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200 backdrop-blur-md">
      <div className={`w-full max-w-sm bg-zinc-950 rounded-[2rem] overflow-hidden border-2 ${error ? 'border-danger-500 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'border-zinc-800 shadow-2xl'} transition-all duration-300 relative`}>
        
        <button 
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-zinc-900 rounded-full transition-colors"
        >
            <IconX size={20} />
        </button>

        <div className="p-8 space-y-8">
          <div className="text-center space-y-3">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 transition-colors ${error ? 'bg-danger-900/20 text-danger-500 border-danger-500' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
              <IconLock size={32} />
            </div>
            <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase transform -skew-x-6">Admin Access</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Enter Command Code</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <div className={`absolute -inset-0.5 rounded-2xl blur opacity-30 transition duration-500 ${error ? 'bg-red-600' : 'bg-gradient-to-r from-primary to-aura-purple group-hover:opacity-75'}`}></div>
              <input 
                autoFocus
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`relative w-full bg-zinc-950 border-2 rounded-2xl p-5 text-center text-2xl font-black tracking-[0.5em] text-white focus:outline-none transition-all placeholder:text-zinc-800 placeholder:tracking-normal ${error ? 'border-danger-500' : 'border-zinc-800 focus:border-white/20'}`}
              />
            </div>
            
            {error && (
                <div className="text-center animate-shake">
                    <span className="text-[10px] font-black text-danger-500 uppercase tracking-widest bg-danger-900/10 px-3 py-1 rounded border border-danger-500/20">Access Denied</span>
                </div>
            )}

            <button 
                type="submit"
                className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl shadow-xl hover:bg-aura-gold hover:scale-[1.02] active:scale-95 transition-all"
            >
                UNLOCK
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminUnlockModal;
