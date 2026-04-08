
import { AppState, Player, SkillLevel } from '../types';
import { INITIAL_STATE } from '../data/initialState';
import { migrateState } from './migrations';

const STORAGE_KEY = 'picklequeue_db_v3';

const DEFAULT_STATE: AppState = INITIAL_STATE;

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return DEFAULT_STATE;
    const rawState = JSON.parse(serialized);
    
    // Deduplicate loaded players by id
    if (rawState.players) {
        rawState.players = rawState.players.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.id === v.id) === i);
    }
    
    const state = migrateState(rawState, DEFAULT_STATE);
    
    // Merge initial players if they don't exist in saved state
    const existingIds = new Set(state.players.map(p => p.id));
    DEFAULT_STATE.players.forEach(p => {
        if (!existingIds.has(p.id)) {
            state.players.push(p);
        }
    });

    return state;
  } catch (e) {
    return DEFAULT_STATE;
  }
};

export const saveState = (state: AppState) => {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    
    // 🛡️ Create a safety backup if we have a healthy number of players
    // This helps recover if a sync wipes the main key
    if (state.players.length > 5) {
      localStorage.setItem(`${STORAGE_KEY}_backup`, serialized);
    }
  } catch (e) {
    console.error('Failed to save state', e);
  }
};

export const resetLocalState = () => {
    try {
        // 🔒 Signal to the app that a reset is in progress
        sessionStorage.setItem('__PBZ_RESET_IN_PROGRESS__', 'true');
        localStorage.clear();
        window.location.reload();
    } catch (e) {
        console.error("Failed to reset local state", e);
        alert("Failed to reset. Please clear browser data manually.");
    }
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const formatPlayerName = (fullName: string): string => {
  if (!fullName) return '';
  return fullName.trim().toUpperCase();
};
