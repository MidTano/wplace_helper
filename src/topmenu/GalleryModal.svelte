<script>
  import { createEventDispatcher, onMount, tick, onDestroy } from 'svelte';
  import { t, lang } from '../i18n';
  import { getPersistentItem, setPersistentItem } from '../wguard/stealth/store';
  import { publishGalleryEntry, softDeleteGalleryEntry, parseAuthorIdFromToken } from '../gallery/api';
  import { buildShareFromCurrent, parseShareText, applySharePayload } from '../share/altcv';
  const dispatch = createEventDispatcher();
  export let open = false;
  export let loading = false;
  export let items = [];
  export let errorKey = '';
  export let loadingKey = 'gallery.loading';
  export let profiles = {};
  let thumbIdx = {};
  let thumbSrc = {};
  const __imgCache = new Map();
  const __objCache = new Map();
  const __badCache = new Set();
  function getPreviewUrls(item){
    const arr = [];
    try { if (item && item.previewUrl && /^https?:/i.test(item.previewUrl)) arr.push(item.previewUrl); } catch {}
    try {
      const u = item && item.share && item.share.img && Array.isArray(item.share.img.urls) ? item.share.img.urls : [];
      for (const x of u) { if (x && /^https?:/i.test(x)) arr.push(x); }
    } catch {}
    const seen = new Set();
    const out = [];
    for (const x of arr) { if (!seen.has(x)) { seen.add(x); out.push(x); } }
    return out;
  }

  function ensureAuthorId(){
    try {
      const tok = String(myToken||'');
      if (!tok || tok === lastResolvedToken) return;
      const aid = parseAuthorIdFromToken(tok);
      if (aid) { myAuthorId = String(aid); lastResolvedToken = tok; saveStored(); }
    } catch {}
  }
  $: if (myToken && myToken !== lastResolvedToken) { try { ensureAuthorId(); } catch {} }
  function isMine(item){
    try { return !!(myAuthorId && item && item.authorId && String(item.authorId)===String(myAuthorId)); } catch { return false; }
  }
  async function onDelete(item){
    try {
      if (!isMine(item) || !myToken || !myAuthorId) return;
      const old = items.slice();
      items = items.filter((it)=> it && it.id !== item.id);
      try {
        await softDeleteGalleryEntry(String(item.id), String(myToken), String(myAuthorId));
      } catch (e) {
        items = old;
      }
    } catch {}
  }
  function previewSrc(item){
    const id = item && item.id;
    const s = id && thumbSrc[id];
    if (s) return s;
    const urls = getPreviewUrls(item);
    const idx = ((thumbIdx[item.id] ?? 0)|0);
    return urls[idx] || '';
  }
  function onThumbError(item){
    const urls = getPreviewUrls(item);
    const idx = ((thumbIdx[item.id] ?? 0)|0) + 1;
    thumbIdx[item.id] = idx < urls.length ? idx : -1;
    thumbIdx = { ...thumbIdx };
    try { if (item && item.id) { delete thumbSrc[item.id]; thumbSrc = { ...thumbSrc }; ensureThumb(item); } } catch {}
  }
  function authorName(item){
    const id = item && item.authorId ? String(item.authorId) : '';
    if (id && profiles && profiles[id] && typeof profiles[id].name === 'string' && profiles[id].name) return profiles[id].name;
    if (item && item.author) return item.author;
    if (id) return id;
    return t('gallery.unknownAuthor');
  }
  const titleId = `gallery-modal-title-${Math.random().toString(36).slice(2,8)}`;
  function close(){ dispatch('close'); }
  function onBackdropKey(event){
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      close();
    }
  }
  function retry(){ dispatch('retry'); }
  $: _i18n_gallery_modal_lang = $lang;
  $: L_title = ($lang, t('gallery.title'));

  let tab = 0;
  let myToken = '';
  let myAuthorId = '';
  let myTitle = '';
  let publishing = false;
  let publishError = '';
  let publishSuccess = '';
  let likedAuthors = new Set();
  let blockedAuthors = new Set();
  let homeFilter = 'date';
  let lastResolvedToken = '';
  let bodyEl = null;
  let __prevIds = [];
  let __lastTab = -1;

  function readStored(){
    try { myToken = String(getPersistentItem('gallery:token')||''); } catch {}
    try { myAuthorId = String(getPersistentItem('gallery:authorId')||''); } catch {}
    try {
      const l = getPersistentItem('gallery:likedAuthors');
      if (l) likedAuthors = new Set(JSON.parse(l));
    } catch {}
    try {
      const b = getPersistentItem('gallery:blockedAuthors');
      if (b) blockedAuthors = new Set(JSON.parse(b));
    } catch {}
  }
  function saveStored(){
    try { setPersistentItem('gallery:token', myToken||''); } catch {}
    try { setPersistentItem('gallery:authorId', myAuthorId||''); } catch {}
    try { setPersistentItem('gallery:likedAuthors', JSON.stringify(Array.from(likedAuthors))); } catch {}
    try { setPersistentItem('gallery:blockedAuthors', JSON.stringify(Array.from(blockedAuthors))); } catch {}
  }
  onMount(()=>{ readStored(); try { ensureAuthorId(); } catch {} });

  function authorIdOf(item){ return String(item && item.authorId ? item.authorId : ''); }
  function isLiked(id){ return !!(id && likedAuthors && likedAuthors.has(id)); }
  function isBlocked(id){ return !!(id && blockedAuthors && blockedAuthors.has(id)); }
  async function toggleLike(item){
    const id = authorIdOf(item);
    if (!id) return;
    if (isLiked(id)) likedAuthors.delete(id); else { likedAuthors.add(id); blockedAuthors.delete(id); }
    likedAuthors = new Set(likedAuthors); blockedAuthors = new Set(blockedAuthors); saveStored();
    await tick();
  }
  async function toggleBlock(item){
    const id = authorIdOf(item);
    if (!id) return;
    if (isBlocked(id)) blockedAuthors.delete(id); else { blockedAuthors.add(id); likedAuthors.delete(id); }
    likedAuthors = new Set(likedAuthors); blockedAuthors = new Set(blockedAuthors); saveStored();
    await tick();
  }
  function viewOnMap(item){
    try {
      const p = typeof item.share === 'string' ? parseShareText(String(item.share)) : item.share;
      if (!p) return;
      const q = { type: 'wplace_share_v1', ts: Date.now() };
      if (p && p.camera) q.camera = p.camera;
      applySharePayload(q);
      close();
    } catch {}
  }

  async function getObjUrl(url){
    if (!url) return '';
    if (__objCache.has(url)) return __objCache.get(url);
    if (__badCache.has(url)) return url;
    let p = __imgCache.get(url);
    if (!p) {
      p = fetch(url).then(r=>r && r.ok ? r.blob() : null).then(b=>{ if (!b) return null; try { return URL.createObjectURL(b); } catch { return null; } }).catch(()=>null);
      __imgCache.set(url, p);
    }
    const o = await p;
    if (o) { __objCache.set(url, o); return o; }
    __badCache.add(url);
    return url;
  }

  async function ensureThumb(item){
    try {
      const id = item && item.id ? String(item.id) : '';
      if (!id) return;
      if (thumbSrc[id]) return;
      const urls = getPreviewUrls(item);
      const idx = ((thumbIdx[id] ?? 0)|0);
      const u = urls[idx] || '';
      if (!u) return;
      const o = await getObjUrl(u);
      if (o) { thumbSrc[id] = o; thumbSrc = { ...thumbSrc }; }
    } catch {}
  }

  async function prefetchVisible(){
    try {
      const arr = Array.isArray(visibleItems) ? visibleItems.slice(0, 36) : [];
      for (const it of arr) { await ensureThumb(it); }
    } catch {}
  }
  $: if (open && visibleItems) { try { prefetchVisible(); } catch {} }
  onDestroy(()=>{ try { for (const v of __objCache.values()) { try { URL.revokeObjectURL(v); } catch {} } __objCache.clear(); } catch {} });

  $: visibleItems = (() => {
    let arr = Array.isArray(items) ? items.slice() : [];
    if (tab === 1) {
      if (myAuthorId) arr = arr.filter((it)=> it && it.authorId && String(it.authorId)===String(myAuthorId));
      return arr;
    }
    if (tab === 0) {
      arr = arr.filter(it => {
        const id = authorIdOf(it);
        return !(id && blockedAuthors && blockedAuthors.has(id));
      });
      if (homeFilter === 'likes') {
        arr = arr.filter(it => {
          const id = authorIdOf(it);
          return id && likedAuthors && likedAuthors.has(id);
        });
      }
      arr.sort((a,b)=>{
        const ca = (a && typeof a.createdAt==='number') ? a.createdAt : 0;
        const cb = (b && typeof b.createdAt==='number') ? b.createdAt : 0;
        return cb - ca;
      });
      return arr;
    }
    return arr;
  })();

  $: if (!open) { __prevIds = []; }
  $: if (tab !== __lastTab) { __lastTab = tab; __prevIds = []; }

  $: (async () => {
    if (!open) return;
    if (!(tab === 0 || tab === 1)) return;
    const el = bodyEl;
    if (!el) return;
    try {
      const cur = Array.isArray(visibleItems) ? visibleItems : [];
      const curIds = cur.map(it => it && it.id).filter(Boolean);
      if (__prevIds.length === 0) { __prevIds = curIds; return; }
      let prependCount = 0;
      for (let i = 0; i < curIds.length; i++) {
        if (__prevIds.includes(curIds[i])) break;
        prependCount++;
      }
      if (prependCount > 0) {
        const before = el.scrollHeight;
        await tick();
        const after = el.scrollHeight;
        el.scrollTop += Math.max(0, after - before);
      }
      __prevIds = curIds;
    } catch {}
  })();

  function sanitizeTitle(v){
    try {
      let s = String(v||'');
      s = s.replace(/[^A-Za-z\u0410-\u044F\u0401\u04510-9]/g, '');
      if (s.length > 30) s = s.slice(0, 30);
      return s;
    } catch { return ''; }
  }

  function sanitizeAuthorId(v){
    try {
      let s = String(v||'');
      s = s.replace(/[^0-9]/g, '');
      if (s.length > 24) s = s.slice(0, 24);
      return s;
    } catch { return ''; }
  }

  async function onPublish(){
    try { await ensureAuthorId(); } catch {}
    if (!myToken || !myAuthorId) { publishError = 'gallery.error.missingFields'; publishSuccess = ''; return; }
    publishing = true; publishError = ''; publishSuccess = '';
    saveStored();
    try {
      const { payload, firstUrl } = await buildShareFromCurrent();
      if (myTitle) { payload.title = sanitizeTitle(myTitle); }
      const id = await publishGalleryEntry({ authorId: String(myAuthorId), share: payload, deleteToken: String(myToken) });
      publishSuccess = 'gallery.success.publish';
      publishError = '';
      myTitle = '';
      dispatch('retry');
      tab = 0;
    } catch (e) {
      publishError = 'gallery.error.publish';
      publishSuccess = '';
    } finally {
      publishing = false;
    }
  }
</script>

{#if open}
  <div class="gallery-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
    <div class="gm-backdrop" role="button" tabindex="0" aria-label={t('common.close')} on:click={close} on:keydown={onBackdropKey}></div>
    <div class="gm-content" role="document">
      <header>
        <h2 id={titleId}>{L_title}</h2>
        <button type="button" on:click={close} aria-label={t('common.close')}>×</button>
      </header>
      {#if tab === 2}
        <div class="gm-body gm-body-publish">
          <div class="gm-form">
            <label>
              <span>{t('gallery.form.token')}</span>
              <input type="text" bind:value={myToken} placeholder={t('gallery.form.tokenPlaceholder')} />
            </label>
            <label>
              <span>{t('gallery.form.title')}</span>
              <input type="text" bind:value={myTitle} placeholder={t('gallery.form.titlePlaceholder')} maxlength="30" on:input={(e)=>{ myTitle = sanitizeTitle(e.target.value); }} />
            </label>
            {#if publishError}
              <div class="gm-msg error">{t(publishError)}</div>
            {/if}
            {#if publishSuccess}
              <div class="gm-msg ok">{t(publishSuccess)}</div>
            {/if}
            <div class="gm-actions">
              <button type="button" class="gm-btn" disabled={publishing} on:click={onPublish}>{publishing ? t('gallery.form.saving') : t('gallery.form.publish')}</button>
            </div>
            <div class="gm-actions-secondary">
              <a class="gm-btn-alt" href="https://discord.com/channels/1416213076277071965/1430138873035358272/1430139235113107508" target="_blank" rel="noopener noreferrer">{t('gallery.form.getToken')}</a>
              <p class="gm-actions-hint">{t('gallery.form.getTokenHint')}</p>
            </div>
          </div>
        </div>
      {:else if loading}
        <div class="gm-body gm-loading">{t(loadingKey)}</div>
      {:else if errorKey}
        <div class="gm-body gm-error">
          <p>{t(errorKey)}</p>
          <button type="button" on:click={retry}>{t('gallery.retry')}</button>
        </div>
      {:else if tab === 3}
        <div class="gm-body gm-users-body">
          <div class="gm-users-header">
            <h3>{t('gallery.users.title')}</h3>
            <p>{t('gallery.users.hint')}</p>
          </div>
          <div class="gm-users">
            <section>
              <header>
                <h4>{t('gallery.users.liked')}</h4>
                <span>{Array.from(likedAuthors).length}</span>
              </header>
              {#if Array.from(likedAuthors).length === 0}
                <div class="gm-empty-sec">{t('gallery.users.empty')}</div>
              {:else}
                <ul>
                  {#each Array.from(likedAuthors) as uid}
                    <li>
                      <div class="gm-user-meta">
                        <span class="gm-user-name">{(profiles && profiles[uid] && profiles[uid].name) ? profiles[uid].name : uid}</span>
                        <span class="gm-user-id">{uid}</span>
                      </div>
                      <div class="gm-user-actions">
                        <button type="button" on:click={()=>{ likedAuthors.delete(uid); likedAuthors=new Set(likedAuthors); saveStored(); }}>{t('gallery.action.unlike')}</button>
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
            </section>
            <section>
              <header>
                <h4>{t('gallery.users.blocked')}</h4>
                <span>{Array.from(blockedAuthors).length}</span>
              </header>
              {#if Array.from(blockedAuthors).length === 0}
                <div class="gm-empty-sec">{t('gallery.users.empty')}</div>
              {:else}
                <ul>
                  {#each Array.from(blockedAuthors) as uid}
                    <li>
                      <div class="gm-user-meta">
                        <span class="gm-user-name">{(profiles && profiles[uid] && profiles[uid].name) ? profiles[uid].name : uid}</span>
                        <span class="gm-user-id">{uid}</span>
                      </div>
                      <div class="gm-user-actions">
                        <button type="button" on:click={()=>{ blockedAuthors.delete(uid); blockedAuthors=new Set(blockedAuthors); saveStored(); }}>{t('gallery.action.unblock')}</button>
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
            </section>
          </div>
        </div>
      {:else if tab === 1}
        <div class="gm-body gm-list" bind:this={bodyEl}>
          {#if visibleItems.length === 0}
            <div class="gm-empty">
              <p>{t('gallery.mine.empty')}</p>
              <p>{t('gallery.mine.hint')}</p>
            </div>
          {:else}
            {#each visibleItems as item (item.id)}
              <article class="gm-card">
                <div class="gm-card-thumb-wrap">
                  {#if previewSrc(item)}
                    <img class="gm-card-thumb" src={previewSrc(item)} alt={(item.share && item.share.title) || item.title || t('gallery.untitled')} loading="lazy" decoding="async" on:error={()=>onThumbError(item)} />
                  {:else}
                    <div class="gm-card-thumb gm-card-thumb--placeholder" aria-hidden="true"></div>
                  {/if}
                </div>
                <div class="gm-card-body">
                  <div class="gm-card-meta">
                    <h3>{(item.share && item.share.title) || item.title || t('gallery.untitled')}</h3>
                    <p class="gm-author">
                      {#if authorIdOf(item)}
                        <a class="gm-author-link" href={`https://discord.com/users/${authorIdOf(item)}`} target="_blank" rel="noopener noreferrer" aria-label="Discord" title="Discord">
                          <svg class="gm-dc-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.8944 4.34399C17.5184 3.71467 16.057 3.256 14.5317 3C14.3397 3.33067 14.1263 3.77866 13.977 4.13067C12.3546 3.89599 10.7439 3.89599 9.14394 4.13067C8.9946 3.77866 8.77059 3.33067 8.58925 3C7.05328 3.256 5.59194 3.71467 4.22555 4.34399C1.46289 8.41865 0.716219 12.3973 1.08955 16.3226C2.92421 17.6559 4.6949 18.4666 6.43463 19C6.86129 18.424 7.2453 17.8053 7.57597 17.1546C6.94663 16.92 6.3493 16.632 5.7733 16.2906C5.92263 16.184 6.07197 16.0667 6.21064 15.9493C9.68796 17.5387 13.4544 17.5387 16.889 15.9493C17.0383 16.0667 17.177 16.184 17.3263 16.2906C16.7503 16.632 16.153 16.92 15.5237 17.1546C15.8543 17.8053 16.2384 18.424 16.665 19C18.4037 18.4666 20.185 17.6559 22.0101 16.3226C22.4687 11.7787 21.2837 7.83202 18.8944 4.34399ZM8.05596 13.9013C7.01061 13.9013 6.15728 12.952 6.15728 11.7893C6.15728 10.6267 6.98928 9.67731 8.05596 9.67731C9.11194 9.67731 9.97591 10.6267 9.95457 11.7893C9.95457 12.952 9.11194 13.9013 8.05596 13.9013ZM15.065 13.9013C14.0197 13.9013 13.1653 12.952 13.1653 11.7893C13.1653 10.6267 13.9983 9.67731 15.065 9.67731C16.121 9.67731 16.985 10.6267 16.9637 11.7893C16.9637 12.952 16.1317 13.9013 15.065 13.9013Z"/></svg>
                          <span>{authorName(item)}</span>
                        </a>
                      {:else}
                        <span>{authorName(item)}</span>
                      {/if}
                    </p>
                  </div>
                  <div class="gm-card-actions-wrap">
                    <div class="gm-card-actions">
                      <div class="gm-card-actions-left">
                      <button type="button" class="gm-icon-btn" aria-label={t('gallery.action.view')} title={t('gallery.action.view')} on:click={()=>viewOnMap(item)}>
                        <svg width="18" height="18" viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><g><path d="M384,448H128c-17.672,0-32,14.328-32,32s14.328,32,32,32h256c17.672,0,32-14.328,32-32S401.672,448,384,448z"/><path d="M256,416c10.391,0,20.133-5.047,26.125-13.523C294.195,385.414,400,233.016,400,137.602C400,61.727,335.398,0,256,0 S112,61.727,112,137.602c0,95.414,105.805,247.813,117.875,264.875C235.867,410.953,245.609,416,256,416z M208,144.048 C208,117.516,229.492,96,256,96c26.532,0,48,21.516,48,48.048C304,170.577,282.532,192,256,192 C229.492,192,208,170.577,208,144.048z"/></g></svg>
                      </button>
                      <button type="button" class="gm-icon-btn" aria-label={t('gallery.action.loadRobot')} title={t('gallery.action.loadRobot')} on:click={()=>dispatch('load', { item })}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9 15C8.44771 15 8 15.4477 8 16C8 16.5523 8.44771 17 9 17C9.55229 17 10 16.5523 10 16C10 15.4477 9.55229 15 9 15Z"/><path d="M14 16C14 15.4477 14.4477 15 15 15C15.5523 15 16 15.4477 16 16C16 16.5523 15.5523 17 15 17C14.4477 17 14 16.5523 14 16Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 1C10.8954 1 10 1.89543 10 3C10 3.74028 10.4022 4.38663 11 4.73244V7H6C4.34315 7 3 8.34315 3 10V20C3 21.6569 4.34315 23 6 23H18C19.6569 23 21 21.6569 21 20V10C21 8.34315 19.6569 7 18 7H13V4.73244C13.5978 4.38663 14 3.74028 14 3C14 1.89543 13.1046 1 12 1ZM5 10C5 9.44772 5.44772 9 6 9H7.38197L8.82918 11.8944C9.16796 12.572 9.86049 13 10.618 13H13.382C14.1395 13 14.832 12.572 15.1708 11.8944L16.618 9H18C18.5523 9 19 9.44772 19 10V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V10ZM13.382 11L14.382 9H9.61803L10.618 11H13.382Z"/><path d="M1 14C0.447715 14 0 14.4477 0 15V17C0 17.5523 0.447715 18 1 18C1.55228 18 2 17.5523 2 17V15C2 14.4477 1.55228 14 1 14Z"/><path d="M22 15C22 14.4477 22.4477 14 23 14C23.5523 14 24 14.4477 24 15V17C24 17.5523 23.5523 18 23 18C22.4477 18 22 17.5523 22 17V15Z"/></svg>
                      </button>
                    </div>
                    <div class="gm-card-actions-right">
                        <button type="button" class={`gm-icon-btn is-delete`} aria-label={t('gallery.action.delete')} title={t('gallery.action.delete')} on:click={()=>onDelete(item)}>
                          <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="12" width="2" height="12"/><rect x="18" y="12" width="2" height="12"/><path d="M4,6V8H6V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V8h2V6ZM8,28V8H24V28Z"/><rect x="12" y="2" width="8" height="2"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            {/each}
          {/if}
        </div>
      {:else if tab === 0}
        <div class="gm-body gm-home" bind:this={bodyEl}>
          <div class="gm-home-bar">
            <div class="gm-home-filter" role="group" aria-label={t('gallery.filter.aria')}>
              <button type="button" class:active={homeFilter==='date'} on:click={()=>{ homeFilter='date'; }}>{t('gallery.filter.date')}</button>
              <button type="button" class:active={homeFilter==='likes'} on:click={()=>{ homeFilter='likes'; }}>{t('gallery.filter.likes')}</button>
            </div>
          </div>
          {#if visibleItems.length === 0}
            <div class="gm-home-empty">{t('gallery.empty')}</div>
          {:else}
            <div class="gm-home-grid">
            {#each visibleItems as item (item.id)}
              <article class="gm-card">
                <div class="gm-card-thumb-wrap">
                  {#if previewSrc(item)}
                    <img class="gm-card-thumb" src={previewSrc(item)} alt={(item.share && item.share.title) || item.title || t('gallery.untitled')} loading="lazy" decoding="async" on:error={()=>onThumbError(item)} />
                  {:else}
                    <div class="gm-card-thumb gm-card-thumb--placeholder" aria-hidden="true"></div>
                  {/if}
                </div>
                <div class="gm-card-body">
                  <div class="gm-card-meta">
                    <h3>{(item.share && item.share.title) || item.title || t('gallery.untitled')}</h3>
                    <p class="gm-author">
                      {#if authorIdOf(item)}
                        <a class="gm-author-link" href={`https://discord.com/users/${authorIdOf(item)}`} target="_blank" rel="noopener noreferrer" aria-label="Discord" title="Discord">
                          <svg class="gm-dc-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.8944 4.34399C17.5184 3.71467 16.057 3.256 14.5317 3C14.3397 3.33067 14.1263 3.77866 13.977 4.13067C12.3546 3.89599 10.7439 3.89599 9.14394 4.13067C8.9946 3.77866 8.77059 3.33067 8.58925 3C7.05328 3.256 5.59194 3.71467 4.22555 4.34399C1.46289 8.41865 0.716219 12.3973 1.08955 16.3226C2.92421 17.6559 4.6949 18.4666 6.43463 19C6.86129 18.424 7.2453 17.8053 7.57597 17.1546C6.94663 16.92 6.3493 16.632 5.7733 16.2906C5.92263 16.184 6.07197 16.0667 6.21064 15.9493C9.68796 17.5387 13.4544 17.5387 16.889 15.9493C17.0383 16.0667 17.177 16.184 17.3263 16.2906C16.7503 16.632 16.153 16.92 15.5237 17.1546C15.8543 17.8053 16.2384 18.424 16.665 19C18.4037 18.4666 20.185 17.6559 22.0101 16.3226C22.4687 11.7787 21.2837 7.83202 18.8944 4.34399ZM8.05596 13.9013C7.01061 13.9013 6.15728 12.952 6.15728 11.7893C6.15728 10.6267 6.98928 9.67731 8.05596 9.67731C9.11194 9.67731 9.97591 10.6267 9.95457 11.7893C9.95457 12.952 9.11194 13.9013 8.05596 13.9013ZM15.065 13.9013C14.0197 13.9013 13.1653 12.952 13.1653 11.7893C13.1653 10.6267 13.9983 9.67731 15.065 9.67731C16.121 9.67731 16.985 10.6267 16.9637 11.7893C16.9637 12.952 16.1317 13.9013 15.065 13.9013Z"/></svg>
                          <span>{authorName(item)}</span>
                        </a>
                      {:else}
                        <span>{authorName(item)}</span>
                      {/if}
                    </p>
                  </div>
                  <div class="gm-card-actions-wrap">
                    <div class="gm-card-actions">
                      <div class="gm-card-actions-left">
                      <button type="button" class="gm-icon-btn" aria-label={t('gallery.action.view')} title={t('gallery.action.view')} on:click={()=>viewOnMap(item)}>
                        <svg width="18" height="18" viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><g><path d="M384,448H128c-17.672,0-32,14.328-32,32s14.328,32,32,32h256c17.672,0,32-14.328,32-32S401.672,448,384,448z"/><path d="M256,416c10.391,0,20.133-5.047,26.125-13.523C294.195,385.414,400,233.016,400,137.602C400,61.727,335.398,0,256,0 S112,61.727,112,137.602c0,95.414,105.805,247.813,117.875,264.875C235.867,410.953,245.609,416,256,416z M208,144.048 C208,117.516,229.492,96,256,96c26.532,0,48,21.516,48,48.048C304,170.577,282.532,192,256,192 C229.492,192,208,170.577,208,144.048z"/></g></svg>
                      </button>
                      <button type="button" class="gm-icon-btn" aria-label={t('gallery.action.loadRobot')} title={t('gallery.action.loadRobot')} on:click={()=>dispatch('load', { item })}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9 15C8.44771 15 8 15.4477 8 16C8 16.5523 8.44771 17 9 17C9.55229 17 10 16.5523 10 16C10 15.4477 9.55229 15 9 15Z"/><path d="M14 16C14 15.4477 14.4477 15 15 15C15.5523 15 16 15.4477 16 16C16 16.5523 15.5523 17 15 17C14.4477 17 14 16.5523 14 16Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 1C10.8954 1 10 1.89543 10 3C10 3.74028 10.4022 4.38663 11 4.73244V7H6C4.34315 7 3 8.34315 3 10V20C3 21.6569 4.34315 23 6 23H18C19.6569 23 21 21.6569 21 20V10C21 8.34315 19.6569 7 18 7H13V4.73244C13.5978 4.38663 14 3.74028 14 3C14 1.89543 13.1046 1 12 1ZM5 10C5 9.44772 5.44772 9 6 9H7.38197L8.82918 11.8944C9.16796 12.572 9.86049 13 10.618 13H13.382C14.1395 13 14.832 12.572 15.1708 11.8944L16.618 9H18C18.5523 9 19 9.44772 19 10V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V10ZM13.382 11L14.382 9H9.61803L10.618 11H13.382Z"/><path d="M1 14C0.447715 14 0 14.4477 0 15V17C0 17.5523 0.447715 18 1 18C1.55228 18 2 17.5523 2 17V15C2 14.4477 1.55228 14 1 14Z"/><path d="M22 15C22 14.4477 22.4477 14 23 14C23.5523 14 24 14.4477 24 15V17C24 17.5523 23.5523 18 23 18C22.4477 18 22 17.5523 22 17V15Z"/></svg>
                      </button>
                    </div>
                    <div class="gm-card-actions-right">
                        {#if isMine(item)}
                          <button type="button" class={`gm-icon-btn is-delete`} aria-label={t('gallery.action.delete')} title={t('gallery.action.delete')} on:click={()=>onDelete(item)}>
                            <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="12" width="2" height="12"/><rect x="18" y="12" width="2" height="12"/><path d="M4,6V8H6V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V8h2V6ZM8,28V8H24V28Z"/><rect x="12" y="2" width="8" height="2"/></svg>
                        </button>
                      {:else}
                        <button type="button" class={`gm-icon-btn ${likedAuthors && likedAuthors.has(authorIdOf(item)) ? 'is-liked' : ''}`} aria-label={(likedAuthors && likedAuthors.has(authorIdOf(item))) ? t('gallery.action.unlike') : t('gallery.action.like')} title={(likedAuthors && likedAuthors.has(authorIdOf(item))) ? t('gallery.action.unlike') : t('gallery.action.like')} on:click={()=>toggleLike(item)}>
                          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M1.24264 8.24264L8 15L14.7574 8.24264C15.553 7.44699 16 6.36786 16 5.24264V5.05234C16 2.8143 14.1857 1 11.9477 1C10.7166 1 9.55233 1.55959 8.78331 2.52086L8 3.5L7.21669 2.52086C6.44767 1.55959 5.28338 1 4.05234 1C1.8143 1 0 2.8143 0 5.05234V5.24264C0 6.36786 0.44699 7.44699 1.24264 8.24264Z"/></svg>
                        </button>
                        <button type="button" class={`gm-icon-btn ${blockedAuthors && blockedAuthors.has(authorIdOf(item)) ? 'is-blocked' : ''}`} aria-label={(blockedAuthors && blockedAuthors.has(authorIdOf(item))) ? t('gallery.action.unblock') : t('gallery.action.block')} title={(blockedAuthors && blockedAuthors.has(authorIdOf(item))) ? t('gallery.action.unblock') : t('gallery.action.block')} on:click={()=>toggleBlock(item)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18.364 5.63604C19.9926 7.26472 21 9.51472 21 12C21 16.9706 16.9706 21 12 21C9.51472 21 7.26472 19.9926 5.63604 18.364M18.364 5.63604C16.7353 4.00736 14.4853 3 12 3C7.02944 3 3 7.02944 3 12C3 14.4853 4.00736 16.7353 5.63604 18.364M18.364 5.63604L5.63604 18.364" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                      {/if}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            {/each}
            </div>
          {/if}
        </div>
      {/if}
      <div class="gm-tabs" role="tablist" aria-label={t('gallery.tabs.aria')}>
        <div class="gm-tabs-track" style={`--active-index:${tab};`}>
          <div class="gm-tabs-slider"></div>
        </div>
        <button type="button" role="tab" aria-selected={tab===0} class:active={tab===0} on:click={()=>{ tab=0; }}>{t('gallery.tab.home')}</button>
        <button type="button" role="tab" aria-selected={tab===1} class:active={tab===1} on:click={()=>{ tab=1; }}>{t('gallery.tab.mine')}</button>
        <button type="button" role="tab" aria-selected={tab===2} class:active={tab===2} on:click={()=>{ tab=2; }}>{t('gallery.tab.add')}</button>
        <button type="button" role="tab" aria-selected={tab===3} class:active={tab===3} on:click={()=>{ tab=3; }}>{t('gallery.tab.users')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .gallery-modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:var(--z-modal);pointer-events:auto;}
  .gm-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.6);}
  .gm-content{position:relative;width:min(960px,95vw);height:min(720px,85vh);background:var(--wph-surface,#16171a);color:#fff;display:flex;flex-direction:column;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,0.45);overflow:hidden;font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}
  .gm-tabs{position:relative;display:flex;gap:10px;padding:14px 18px;border-top:1px solid rgba(255,255,255,0.09);background:rgba(0,0,0,0.18);font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;letter-spacing:0.02em;text-transform:uppercase;flex-shrink:0;}
  .gm-tabs-track{position:absolute;inset:10px 18px;border-radius:12px;background:rgba(255,255,255,0.04);pointer-events:none;overflow:hidden;--count:4;}
  .gm-tabs-slider{position:absolute;inset:2px;height:calc(100% - 4px);width:calc((100% - 4px)/var(--count));border-radius:10px;background:var(--wph-primary,rgba(240,81,35,0.8));transform:translateX(calc(var(--active-index)*(100% + 4px)));transition:transform 200ms cubic-bezier(0.22,0.61,0.36,1);box-shadow:0 6px 18px rgba(0,0,0,0.28);}
  .gm-tabs button{position:relative;z-index:1;flex:1;display:flex;align-items:center;justify-content:center;border:none;background:transparent;color:rgba(255,255,255,0.62);padding:8px 0;border-radius:10px;cursor:pointer;transition:color 140ms ease,opacity 140ms ease;}
  .gm-tabs button.active{color:var(--wph-onPrimary,#0d0d0d);font-weight:600;}
  .gm-tabs button:focus-visible{outline:2px solid rgba(255,255,255,0.45);outline-offset:4px}
  header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;}
  header h2{margin:0;font-size:1.1rem;font-weight:600;}
  header button{background:none;border:none;color:inherit;font-size:1.4rem;cursor:pointer;padding:4px 8px;}
  .gm-body{flex:1;padding:20px;overflow:auto;box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.35) transparent;scrollbar-gutter:stable both-edges;padding-right:12px}
  .gm-body-publish{display:flex;justify-content:center;align-items:center;padding:32px 20px}
  .gm-home{display:flex;flex-direction:column;gap:18px;padding:24px 20px}
  .gm-home-bar{display:flex;justify-content:flex-end}
  .gm-home-filter{display:inline-flex;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:4px}
  .gm-home-filter button{background:transparent;border:none;color:rgba(255,255,255,0.62);font-size:12px;padding:8px 14px;border-radius:8px;cursor:pointer;transition:color 120ms ease,background 120ms ease}
  .gm-home-filter button.active{background:var(--wph-primary,rgba(240,81,35,0.85));color:var(--wph-onPrimary,#0d0d0d);font-weight:600}
  .gm-home-filter button:not(.active):hover{color:rgba(255,255,255,0.85)}
  .gm-home-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}
  .gm-users-body{display:flex;flex-direction:column;gap:20px;padding:28px}
  .gm-body::-webkit-scrollbar{width:8px;height:8px}
  .gm-body::-webkit-scrollbar-track{background:rgba(255,255,255,0.08);border-radius:8px}
  .gm-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.35);border-radius:8px}
  .gm-body::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.4)}
  .gm-body::-webkit-scrollbar-button{display:none;width:0;height:0;background:transparent;border:0}
  .gm-loading,.gm-error,.gm-empty{text-align:center;font-size:0.95rem;opacity:0.85;display:flex;flex-direction:column;align-items:center;gap:12px;}
  .gm-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;}
  .gm-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;display:grid;grid-template-rows:190px 1fr auto;min-height:330px;transition:transform .12s ease, box-shadow .12s ease, border-color .12s ease;}
  .gm-card-thumb-wrap{position:relative;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.12)}
  .gm-card-thumb{background-color:rgba(0,0,0,0.42);background-image:linear-gradient(45deg,rgba(255,255,255,0.08) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,0.08) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,0.08) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,0.08) 75%);background-size:12px 12px;background-position:0 0,0 6px,6px -6px,-6px 0;height:100%;width:100%;object-fit:contain;object-position:center;display:block;image-rendering:pixelated;}
  .gm-card-thumb--placeholder{display:block;width:100%;height:100%;}
  .gm-card-body{display:flex;flex-direction:column;gap:10px;background:rgba(0,0,0,0.18);border-top:1px solid rgba(255,255,255,0.08);padding:14px 16px 14px}
  .gm-card-meta{display:flex;flex-direction:column;gap:10px}
  .gm-card-meta h3{margin:0;font-size:0.95rem;}
  .gm-card-meta p{margin:0;font-size:0.8rem;opacity:0.8;}
  .gm-author{display:flex;align-items:center;gap:8px}
  .gm-author-link{display:inline-flex;align-items:center;gap:6px;color:inherit;text-decoration:none;opacity:.9}
  .gm-author-link:hover{opacity:1}
  .gm-dc-icon{color:#7289da}
  .gm-card-actions-wrap{padding:0 12px}
  .gm-card-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;margin-top:10px}
  .gm-card-actions-left,.gm-card-actions-right{display:flex;gap:8px;flex-wrap:wrap}
  .gm-card-actions ._alt{background:rgba(24,25,30,0.92);border:1px solid rgba(255,255,255,0.12)}
  .gm-icon-btn{background:rgba(24,25,30,0.92);border:1px solid rgba(255,255,255,0.12);width:40px;height:40px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;color:#fff;padding:0;cursor:pointer;transition:transform .1s ease, filter .1s ease, background .1s ease, border-color .1s ease;flex:0 0 auto}
  .gm-icon-btn:hover{filter:brightness(1.12);transform:translateY(-1px)}
  .gm-icon-btn:focus{outline:2px solid rgba(255,255,255,0.22);outline-offset:2px}
  .gm-icon-btn svg{width:20px;height:20px}
  .gm-icon-btn.is-liked{color:#ef4444;background:rgba(239,68,68,0.14);border-color:rgba(239,68,68,0.36)}
  .gm-icon-btn.is-blocked{color:#f59e0b;background:rgba(245,158,11,0.14);border-color:rgba(245,158,11,0.36)}
  .gm-users-header h3{margin:0;font-size:1.05rem}
  .gm-users-header p{margin:6px 0 0 0;font-size:12px;color:rgba(255,255,255,0.65);max-width:540px}
  .gm-users{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
  .gm-users section{background:rgba(255,255,255,0.04);padding:16px;border-radius:12px;display:flex;flex-direction:column;gap:14px;border:1px solid rgba(255,255,255,0.08)}
  .gm-users section header{display:flex;align-items:center;justify-content:space-between;font-size:0.95rem;color:rgba(255,255,255,0.85)}
  .gm-users section header span{background:rgba(255,255,255,0.08);border-radius:8px;padding:4px 8px;font-size:11px}
  .gm-users ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
  .gm-users li{display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(0,0,0,0.18);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px}
  .gm-user-meta{display:flex;flex-direction:column;gap:4px;min-width:0}
  .gm-user-name{font-size:0.9rem;color:rgba(255,255,255,0.92);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}
  .gm-user-id{font-size:0.75rem;color:rgba(255,255,255,0.45);letter-spacing:0.02em}
  .gm-user-actions{display:flex;gap:8px}
  .gm-user-actions button{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);border-radius:8px;color:rgba(255,255,255,0.85);padding:6px 10px;font-size:12px;cursor:pointer;transition:filter 120ms ease}
  .gm-user-actions button:hover{filter:brightness(1.1)}
  .gm-empty-sec{opacity:.75;font-size:0.85rem;text-align:center;padding:18px;background:rgba(0,0,0,0.18);border-radius:10px;border:1px dashed rgba(255,255,255,0.12)}
  .gm-form{display:grid;gap:14px;min-width:320px;max-width:420px;width:100%;margin:0 auto;text-align:left}
  .gm-form label{display:grid;gap:6px}
  .gm-form input{background:#0f1115;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px;font-size:13px}
  .gm-actions{display:flex;justify-content:center;margin-top:12px}
  .gm-actions-secondary{display:flex;flex-direction:column;align-items:center;gap:8px}
  .gm-actions-hint{margin:0;font-size:11px;color:rgba(255,255,255,0.55);text-align:center;max-width:360px;line-height:1.5}
  .gm-btn{background:var(--wph-primary,#f05123);border:none;border-radius:10px;color:var(--wph-onPrimary,#0d0d0d);padding:10px 18px;font-size:13px;cursor:pointer;transition:filter 120ms ease;min-width:220px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600}
  .gm-btn:disabled{opacity:0.6;cursor:default}
  .gm-btn:hover:enabled{filter:brightness(1.05)}
  .gm-btn-alt{display:inline-flex;align-items:center;justify-content:center;margin-top:4px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);border-radius:10px;color:rgba(255,255,255,0.85);padding:9px 16px;font-size:12px;text-decoration:none;text-transform:uppercase;letter-spacing:0.04em;transition:filter 120ms ease,background 120ms ease}
  .gm-btn-alt:hover{filter:brightness(1.1);background:rgba(255,255,255,0.12)}
  .gm-msg{padding:8px 10px;border-radius:8px;font-size:13px}
  .gm-msg.error{background:rgba(229,57,53,0.18);border:1px solid rgba(229,57,53,0.4)}
  .gm-msg.ok{background:rgba(76,175,80,0.18);border:1px solid rgba(76,175,80,0.4)}
</style>
