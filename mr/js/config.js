/* ═══════════════════════════════════════════════════════════════
   FocusMirror · configuration
   ───────────────────────────────────────────────────────────────
   These two values are PUBLIC by design. Supabase's anon key is
   meant to ship in browser code — it only grants what your Row
   Level Security policies allow. Safe to commit, safe to deploy.

   NEVER put the service_role key here. It bypasses RLS entirely.
   ═══════════════════════════════════════════════════════════════ */

window.FM_CONFIG = {
  SUPABASE_URL: 'https://qnnqcdpkxtzukrpulndx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubnFjZHBreHR6dWtycHVsbmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzI4NzAsImV4cCI6MjEwMDc0ODg3MH0.p98rIDZ-V2V5o_r7mD9w_xpNOKOCfTbqEaVGFyGu0-g',

  // Cloud sync is optional. With no valid project the app still runs
  // exactly as before, storing everything in this browser only.
  ENABLE_CLOUD: true
};
