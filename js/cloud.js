(async () => {
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  for (let i = 0; i < 50 && !window.db; i++) await wait(100);
  if (!window.db) return;

  let userId = null;
  let saveTimer = null;
  let applyingRemote = false;

  async function ensureVisitor() {
    let { data: { session }, error } = await db.auth.getSession();
    if (error) console.warn('Session read:', error.message);
    if (!session) {
      const result = await db.auth.signInAnonymously();
      if (result.error) throw result.error;
      session = result.data.session;
    }
    userId = session.user.id;
  }

  async function loadContent() {
    const { data, error } = await db.from('site_content').select('content_value').eq('content_key', 'main').maybeSingle();
    if (error) { console.warn('Content load:', error.message); return; }
    if (data?.content_value) window.applyCloudContent?.(data.content_value);
  }

  async function saveProgress() {
    if (!userId || applyingRemote) return;
    const payload = {
      user_id: userId,
      current_step: Number(window.current || 0),
      visitor_data: {
        letterOpened: Boolean(window.letterOpened),
        giftOpened: Boolean(window.giftOpened)
      },
      updated_at: new Date().toISOString()
    };
    const { error } = await db.from('visitor_progress').upsert(payload, { onConflict: 'user_id' });
    if (error) console.warn('Progress save:', error.message);
  }

  window.saveVisitorProgress = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveProgress, 350);
  };

  async function restoreProgress() {
    const { data, error } = await db.from('visitor_progress').select('current_step,visitor_data').maybeSingle();
    if (error) { console.warn('Progress load:', error.message); return; }
    if (!data) return;
    applyingRemote = true;
    const state = data.visitor_data || {};
    if (state.letterOpened) {
      window.letterOpened = true;
      document.getElementById('letter')?.classList.add('open');
      const openBtn = document.getElementById('openBtn');
      const continueBtn = document.getElementById('continue1');
      if (openBtn) openBtn.style.display = 'none';
      if (continueBtn) continueBtn.style.display = 'block';
    }
    if (state.giftOpened) {
      window.giftOpened = true;
      document.getElementById('gift')?.classList.add('open');
      const hint = document.getElementById('giftHint');
      if (hint) hint.textContent = 'I LOVE YOU ❤️';
    }
    const step = Number(data.current_step || 0);
    if (step > 0 && typeof window.next === 'function') window.next(step);
    applyingRemote = false;
  }

  try {
    await ensureVisitor();
    await loadContent();
    await restoreProgress();
    console.info('Supabase connected. Visitor session ready.');
  } catch (error) {
    console.error('Supabase connection:', error.message || error);
  }
})();
