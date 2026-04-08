
import React, { useState, useEffect } from 'react';
import { IconZap, IconMenu, IconX, IconPlay, IconCheck, IconTrophy, IconUsers, IconDumbbell, IconHome, IconCloud, IconActivity, IconLock, IconSun, IconMoon } from './ui/Icons';
import { AppState } from '../types';
import { SyncStatus, SyncStatusPill } from './SyncStatusPill';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: any) => void;
  isAdmin: boolean;
  actions?: React.ReactNode; 
  title?: string;
}

interface LayoutWithSyncProps extends LayoutProps {
    appState?: AppState;
    onAppStateRestore?: (s: AppState) => void;
    syncStatus?: SyncStatus;
    onRetrySync?: () => void;
    onHardReset?: () => void;
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
}

const Layout: React.FC<LayoutWithSyncProps> = ({ children, activeTab, onNavigate, isAdmin, actions, title, appState, onAppStateRestore, syncStatus, onRetrySync, onHardReset, isDarkMode, onToggleDarkMode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home Base', icon: IconHome, color: 'text-primary' },
    { id: 'league', label: 'Saga Battle', icon: IconCheck, color: 'text-tertiary' },
    { id: 'roster', label: 'Z-Fighters', icon: IconUsers, color: 'text-primary' },
    { id: 'leaderboards', label: 'Hall of Fame', icon: IconDumbbell, color: 'text-tertiary' },
    { id: 'backup', label: 'God Mode', icon: IconCloud, color: 'text-purple-500' },
  ];

  const bottomNavItems = [
    { id: 'home', label: 'Home', icon: IconHome },
    { id: 'league', label: 'Saga', icon: IconCheck },
    { id: 'roster', label: 'Roster', icon: IconUsers },
    { id: 'leaderboards', label: 'Hall', icon: IconDumbbell },
  ];

  const handleNav = (id: string) => {
    onNavigate(id);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] w-full bg-surface text-on-surface relative overflow-x-hidden transition-colors duration-500 font-body">
      
      {/* Scouter Grid Background */}
      <div className="fixed inset-0 scouter-grid pointer-events-none z-0"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-surface/90 backdrop-blur-xl border-b border-outline/10 shadow-sm transition-colors duration-500">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-primary-container to-tertiary-container"></div>
        
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -ml-2 text-primary hover:text-primary-container transition-colors"
        >
          <IconMenu size={24} />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pt-[env(safe-area-inset-top)]">
             <div className="flex items-center gap-2">
                <IconZap size={18} className="text-primary-container fill-primary-container animate-pulse" />
                <span className="font-headline font-black italic tracking-tighter uppercase text-lg text-on-surface drop-shadow-sm">
                  {title || 'PICKLEBALL Z'}
                </span>
             </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 flex justify-end">
            {actions}
          </div>
        </div>
      </header>

      {/* Sync Status Indicator */}
      {syncStatus && (
        <div className="fixed top-[calc(env(safe-area-inset-top)+0.8rem)] right-24 z-[60]">
            <SyncStatusPill status={syncStatus} onRetry={onRetrySync} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 relative">
        <div className="max-w-md mx-auto h-full">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-lg border-t border-outline/10 px-4 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {bottomNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${
                activeTab === item.id ? 'text-primary scale-110' : 'text-on-surface-variant'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${activeTab === item.id ? 'bg-primary/10' : ''}`}>
                <item.icon size={22} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div 
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          <div className="relative w-[85%] max-w-xs bg-surface h-full border-r border-outline/10 shadow-2xl p-8 pt-[calc(3rem+env(safe-area-inset-top))] animate-in slide-in-from-left duration-300 flex flex-col overflow-y-auto safe-bottom">
            
            <div className="mb-12">
               <h2 className="text-4xl font-headline font-black italic tracking-tighter text-on-surface uppercase transform -skew-x-12">
                   PBZ<span className="text-primary">SAGA</span>
               </h2>
               <div className="h-1.5 w-20 mt-2 bg-gradient-to-r from-primary to-primary-container rounded-full"></div>
               <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2em] mt-3 italic">
                 Welcome, Z-Fighter
               </p>
            </div>

            <nav className="space-y-3 flex-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-5 p-4 rounded-2xl transition-all border ${
                    activeTab === item.id 
                    ? 'bg-primary/5 border-primary shadow-sm' 
                    : 'bg-transparent border-transparent hover:bg-surface-variant/50 text-on-surface-variant'
                  }`}
                >
                  <div className={`${activeTab === item.id ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'} p-2 rounded-xl transition-colors`}>
                    <item.icon size={20} />
                  </div>
                  <span className={`font-headline font-black uppercase tracking-widest text-sm ${activeTab === item.id ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>

            <div className="pt-6 border-t border-outline/10 text-center">
              <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.5em]">
                v8.0 Saga Tech
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
