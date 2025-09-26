<script>
  import { setSelectedFile, setOriginCoords, rebuildStencilFromState, setCurrentHistoryId, setMoveMode } from './overlay/state';
  import { log } from './overlay/log';
  import EditorModal from './editor/EditorModal.svelte';
  import TopMenu from './topmenu/TopMenu.svelte';
  import ScreenAccessModal from './screen/ScreenAccessModal.svelte';
  import { addOrUpdate, getList, getBlob } from './topmenu/historyStore';
  import { getOriginCoords } from './overlay/state';
  import { onMount } from 'svelte';
  import { getStencilManager } from './template/stencilManager';
  import CopyArtModal from './copyart/CopyArtModal.svelte';

  let showPanel = true;
  let imgBitmap = null;
  let editorOpen = false;
  let currentFile = null; 
  let screenModalOpen = true; 
  let copyArtOpen = false;

  function cleanupEditorBackdrops() {
    try {
      const nodes = Array.from(document.querySelectorAll('.editor-backdrop'));
      for (const n of nodes) {
        try { n.parentNode && n.parentNode.removeChild(n); } catch {}
      }
    } catch {}
  }

  async function pick() {
    try { log('app', 'pick-click'); } catch {}
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    const picked = await new Promise((resolve, reject) => {
      input.addEventListener('change', async () => {
        if (!input.files || !input.files[0]) { reject(new Error('No file')); input.remove(); return; }
        const file = input.files[0];
        try {
          resolve(file);
        } catch (e) {
          try {
            
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = async () => {
              resolve(file);
              URL.revokeObjectURL(url);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(e); };
            img.src = url;
          } catch (e2) {
            reject(e2);
          }
        }
        input.remove();
      }, { once: true });
      input.click();
    });
    currentFile = picked;
    
    try {
      const bmpTmp = await createImageBitmap(picked);
      imgBitmap = bmpTmp;
      try { log('app', 'picked', { w: bmpTmp?.width, h: bmpTmp?.height }); } catch {}
    } catch {}
    
    try {
      const name = (currentFile && currentFile.name) || 'picked.png';
      const size = ((currentFile && currentFile.size) | 0);
      if (size > 0) setCurrentHistoryId(`${name}|${size}`);
    } catch {}
    
    editorOpen = true;
  }

  function clearImg() {
    if (imgBitmap && typeof imgBitmap.close === 'function') {
      try { imgBitmap.close(); } catch {}
    }
    imgBitmap = null;
    currentFile = null;
    try { setMoveMode(false); } catch {}
    setSelectedFile(null);
    setOriginCoords(null);
    try { getStencilManager().clear(); } catch {}
    try { setCurrentHistoryId(null); } catch {}
    rebuildStencilFromState();
    try { log('app', 'cleared'); } catch {}
  }
  onMount(async () => {
    try {
      const list = getList();
      if (!list || !list.length) return;
      const meta = list[0];
      const blob = await getBlob(meta.id);
      if (!blob) return;
      currentFile = blob;
      setSelectedFile(currentFile);
      try { setCurrentHistoryId(meta.id || null); } catch {}
      if (meta.origin && Array.isArray(meta.origin)) {
        setOriginCoords(meta.origin);
      } else if (meta.coords && typeof meta.coords === 'object') {
        setOriginCoords([0, 0, meta.coords.x|0, meta.coords.y|0]);
      }
      await rebuildStencilFromState();
    } catch {}
  });
</script>
<TopMenu onPick={pick} onClear={clearImg} on:historyLoad={(e)=>{
  try {
    const { blob, meta } = e.detail || {};
    if (blob) {
      currentFile = blob;
      try { setCurrentHistoryId(meta?.id || null); } catch {}
      setSelectedFile(currentFile);
      
      if (meta && meta.origin && Array.isArray(meta.origin)) {
        setOriginCoords(meta.origin);
      } else if (meta && meta.coords && typeof meta.coords === 'object' && meta.coords.x!=null && meta.coords.y!=null) {
        const c = meta.coords;
        setOriginCoords([0, 0, c.x|0, c.y|0]);
      }
      rebuildStencilFromState();
    }
  } catch {}
}} on:copyArt={()=>{ copyArtOpen = true; }} />

<ScreenAccessModal open={screenModalOpen} on:close={() => { screenModalOpen = false; }} />

<CopyArtModal open={copyArtOpen} on:close={()=>{ copyArtOpen = false; }} on:sendToEditor={(e)=>{
  try {
    const { file } = e.detail || {};
    if (!file) return;
    copyArtOpen = false;
    currentFile = file;
    setSelectedFile(currentFile);
    rebuildStencilFromState();
    
    editorOpen = true;
  } catch {}
}} />

<EditorModal
  open={editorOpen}
  file={currentFile}
  on:apply={(e) => {
    try {
      
      if (editorOpen) editorOpen = false;
      
      const baseName = (() => {
        try {
          const n = (currentFile && currentFile.name) ? String(currentFile.name) : 'image.png';
          const dot = n.lastIndexOf('.');
          return dot > 0 ? n.slice(0, dot) : n;
        } catch { return 'image'; }
      })();
      const ditherCode = (dm) => {
        switch (dm) {
          case 'none': return 'n';
          case 'ordered4': return 'o4';
          case 'lines': return 'ln';
          case 'random': return 'rnd';
          default: return String(dm || 'n');
        }
      };
      const paletteCode = (pm) => pm === 'full' ? 'F' : (pm === 'free' ? 'f' : 'C');
      const defaults = { pixelSize: 1, method: 'nearest', ditherMethod: 'none', ditherLevels: 4, paletteMode: 'full', outlineThickness: 0, erodeAmount: 0 };
      const { blob: outBlob, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, hadPixelEdits } = e.detail || {};
      const changed = hadPixelEdits || (pixelSize !== defaults.pixelSize || method !== defaults.method || ditherMethod !== defaults.ditherMethod || ditherLevels !== defaults.ditherLevels || paletteMode !== defaults.paletteMode || outlineThickness !== defaults.outlineThickness || erodeAmount !== defaults.erodeAmount);
      const suffix = `${pixelSize}${ditherCode(ditherMethod)}${ditherLevels}${paletteCode(paletteMode)}${outlineThickness}${erodeAmount}`;
      const finalName = changed ? `${baseName}_${suffix}.png` : `${baseName}.png`;
      currentFile = outBlob;
      setSelectedFile(currentFile);
      rebuildStencilFromState();
      
      try {
        const origin = getOriginCoords();
        addOrUpdate(currentFile, finalName, origin || null)
          .then((meta) => { try { setCurrentHistoryId(meta?.id || null); } catch {} });
      } catch {}
      
      cleanupEditorBackdrops();
      
      try { setMoveMode(true); } catch {}
    } catch {}
  }}
  on:close={() => { editorOpen = false; cleanupEditorBackdrops(); }}
/>

<style>
  :global(#wplace-svelte-overlay-root) {
    pointer-events: none;
  }
  :global(#wplace-svelte-overlay-root *), :global(#wplace-svelte-overlay-root input), :global(#wplace-svelte-overlay-root button) {
    pointer-events: auto;
  }
</style>


