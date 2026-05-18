/**
 * Supabase Configuration
 * 
 * For APK builds, environment variables from .env might not be available.
 * You can hardcode your values here if needed, but the default behavior
 * is to pull from Vite's environment variables.
 */

export const SUPABASE_URL = "https://siilzzsrokthtspnmwem.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaWx6enNyb2t0aHRzcG5td2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjQ1MDUsImV4cCI6MjA5MDAwMDUwNX0.CgMhSbuSC1fwUPmtTkk1Y9bNdO-tHCE1ZwkW7YkkuEE";

if (!SUPABASE_URL || SUPABASE_URL.includes('your-project')) {
  // In production/APK, we want to know immediately if config is broken
  if (import.meta.env.PROD) {
    throw new Error("Supabase configuration missing or invalid for production build.");
  }
  console.warn('⚠️ Supabase configuration is using placeholders. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}
