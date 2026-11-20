(() => {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes('PASTE_') || key.includes('PASTE_')) {
    console.warn('Supabase config is missing. Edit js/config.js');
    return;
  }
  if (!window.supabase?.createClient) {
    console.error('Supabase SDK did not load.');
    return;
  }
  window.db = window.supabase.createClient(url, key);
})();
