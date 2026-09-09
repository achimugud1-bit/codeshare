(() => {
  "use strict";

  const MAX_FILES = 100;
  const files = [];
  let activeOptionsIndex = -1;
  let optionsMode = "file"; // file | all-images
  let results = [];
  let cancelled = false;

  const $ = id => document.getElementById(id);
  const els = {
    input: $('file-input'), upload: $('upload-area'), browse: $('btn-browse'), addMore: $('btn-add-more'),
    clear: $('btn-clear'), list: $('file-list'), count: $('file-count'), summary: $('queue-summary'),
    compress: $('btn-compress'), applyImages: $('btn-apply-images'), progressSection: $('progress-section'),
    progressFill: $('progress-fill'), progressPercent: $('progress-percent'), progressStatus: $('progress-status'),
    progressDetails: $('progress-details'), cancel: $('btn-cancel'), resultsSection: $('results-section'),
    resultsList: $('results-list'), resultsSummary: $('results-summary'), totalResultSize: $('total-result-size'),
    downloadAll: $('btn-download-all'), reset: $('btn-reset'), modal: $('options-modal'),
    modalCard: document.querySelector('#options-modal .modal-card'), modalName: $('options-file-name'),
    closeModal: $('btn-close-options'), apply: $('btn-apply-options'), format: $('opt-format'), quality: $('opt-quality'),
    customWrap: $('opt-quality-custom-wrap'), customQuality: $('opt-quality-custom'), qualityValue: $('opt-quality-value'),
    target: $('opt-target'), targetUnit: $('opt-target-unit'), resolution: $('opt-resolution'), codec: $('opt-codec'),
    fps: $('opt-fps'), audio: $('opt-audio'), smart: $('opt-smart'), note: $('options-note'), theme: $('btn-theme')
  };

  const IMAGE_FORMATS = [['auto', 'Auto'], ['image/webp', 'WEBP'], ['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/avif', 'AVIF']];
  const VIDEO_FORMATS = [['video/mp4', 'MP4'], ['video/webm', 'WEBM']];
  const IMAGE_TYPES = /^image\//;
  const VIDEO_TYPES = /^video\//;
  const isImage = f => IMAGE_TYPES.test(f.type) || /\.(jpe?g|png|webp|avif|gif)$/i.test(f.name);
  const isVideo = f => VIDEO_TYPES.test(f.type) || /\.(mp4|webm|mov|mkv|avi|ogv)$/i.test(f.name);
  const fmtBytes = n => {
    if (!Number.isFinite(n)) return '0 B';
    if (n < 1024) return `${n} B`;
    const u = ['KB', 'MB', 'GB']; let x = n / 1024, i = 0;
    while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
    return `${x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2)} ${u[i]}`;
  };
  const ext = m => ({
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'application/zip': 'zip'
  })[m] || 'bin';
  const defaultOptions = f => ({
    format: isImage(f) ? 'image/webp' : 'video/mp4', quality: 'balanced', customQuality: 75,
    target: '', targetUnit: 'MB', resolution: 'original', codec: 'h264', fps: 'original', audio: 'copy', smart: true
  });
  const humanType = f => isImage(f) ? 'Image' : 'Video';
  const mimeFromFormat = (o, f) => o.format !== 'auto' ? o.format : (isImage(f) ? 'image/webp' : 'video/mp4');
  const qualityNumber = o => o.quality === 'max' ? 0.92 : o.quality === 'high' ? 0.84 : o.quality === 'small' ? 0.55 : o.quality === 'custom' ? Number(o.customQuality) / 100 : 0.75;
  const targetBytes = o => { const n = Number(o.target); if (!n || n <= 0) return null; return n * (o.targetUnit === 'KB' ? 1024 : 1024 * 1024); };
  const getOutputLabel = (f, o) => ext(mimeFromFormat(o, f)).toUpperCase();

  function updateButtons() {
    els.count.textContent = `${files.length} / ${MAX_FILES}`;
    els.clear.disabled = !files.length;
    els.compress.disabled = !files.length;
    els.applyImages.disabled = !files.some(x => isImage(x.file));
    els.addMore.disabled = files.length >= MAX_FILES;
    if (!files.length) els.summary.textContent = 'Add images or videos to get started.';
    else {
      const im = files.filter(x => isImage(x.file)).length, vi = files.length - im;
      els.summary.textContent = `${im} image${im === 1 ? '' : 's'} · ${vi} video${vi === 1 ? '' : 's'} · ${fmtBytes(files.reduce((a, x) => a + x.file.size, 0))}`;
    }
  }

  function thumb(file) {
    const wrap = document.createElement('div'); wrap.className = 'file-thumb';
    if (isImage(file)) {
      const img = document.createElement('img'); img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src); wrap.append(img);
    } else wrap.textContent = '▶';
    return wrap;
  }

  function renderQueue() {
    els.list.innerHTML = '';
    if (!files.length) {
      els.list.innerHTML = '<div class="empty-queue">Your selected files will appear here.</div>';
      updateButtons(); return;
    }

    files.forEach((item, i) => {
      const row = document.createElement('div'); row.className = 'file-row';
      row.append(thumb(item.file));

      const info = document.createElement('div'); info.className = 'file-info';
      info.innerHTML = `<div class="file-name">${escapeHtml(item.file.name)}</div><div class="file-meta">${fmtBytes(item.file.size)} · ${humanType(item.file)} · ${getOutputLabel(item.file, item.options)}</div>`;
      if (item.status) {
        const status = document.createElement('div'); status.className = `file-status ${item.status.error ? 'error' : 'success'}`;
        status.textContent = item.status.error ? `Failed: ${item.status.error}` : `Ready · ${fmtBytes(item.status.blob.size)} · ${Math.max(0, ((1 - item.status.blob.size / item.file.size) * 100)).toFixed(0)}% smaller`;
        info.append(status);
      }
      row.append(info);

      const convert = document.createElement('div'); convert.className = 'file-convert';
      const label = document.createElement('span'); label.textContent = 'Convert';
      const select = document.createElement('select');
      (isImage(item.file) ? IMAGE_FORMATS : VIDEO_FORMATS).forEach(([v, t]) => {
        const o = document.createElement('option'); o.value = v; o.textContent = t; o.selected = v === item.options.format; select.append(o);
      });
      select.onchange = () => { item.options.format = select.value; item.status = null; renderQueue(); };
      convert.append(label, select); row.append(convert);

      const opt = document.createElement('button'); opt.className = 'options-btn'; opt.textContent = '☷ Options'; opt.onclick = () => openOptions(i, 'file'); row.append(opt);

      const compress = document.createElement('button');
      compress.className = 'btn btn-small btn-compress-file';
      compress.textContent = item.status && !item.status.error ? 'Compress again' : 'Compress';
      compress.disabled = !!item.busy;
      compress.onclick = () => compressSingle(i);
      row.append(compress);

      if (item.status && !item.status.error) {
        const dl = document.createElement('button'); dl.className = 'icon-action download-file'; dl.textContent = '↓'; dl.title = 'Download compressed file';
        dl.onclick = () => downloadBlob(item.status.blob, item.file.name, item.status.mime); row.append(dl);
      }

      const rm = document.createElement('button'); rm.className = 'icon-action remove-file'; rm.textContent = '×'; rm.title = 'Remove file';
      rm.onclick = () => { files.splice(i, 1); renderQueue(); }; row.append(rm);
      els.list.append(row);
    });
    updateButtons();
  }

  function escapeHtml(s) { return s.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }

  function addFiles(list) {
    const incoming = Array.from(list || []), room = MAX_FILES - files.length;
    if (room <= 0) { alert(`You can upload a maximum of ${MAX_FILES} files at once.`); return; }
    const accepted = incoming.filter(f => isImage(f) || isVideo(f)).slice(0, room);
    accepted.forEach(f => files.push({ file: f, options: defaultOptions(f), status: null, busy: false }));
    if (incoming.length > accepted.length) alert(`Only ${room} more file${room === 1 ? '' : 's'} could be added. Unsupported files or files beyond the 100-file limit were skipped.`);
    renderQueue();
  }

  function fillOptions(o, f) {
    els.format.innerHTML = '';
    (isImage(f) ? IMAGE_FORMATS : VIDEO_FORMATS).forEach(([v, t]) => {
      const x = document.createElement('option'); x.value = v; x.textContent = t; x.selected = v === o.format; els.format.append(x);
    });
    els.quality.value = o.quality; els.customQuality.value = o.customQuality; els.qualityValue.textContent = `${o.customQuality}%`;
    els.target.value = o.target; els.targetUnit.value = o.targetUnit; els.resolution.value = o.resolution;
    els.codec.value = o.codec; els.fps.value = o.fps; els.audio.value = o.audio; els.smart.checked = o.smart;
    els.customWrap.classList.toggle('hidden', o.quality !== 'custom');
    els.modalCard.classList.toggle('video-mode', isVideo(f));
  }

  function openOptions(i, mode = 'file') {
    optionsMode = mode; activeOptionsIndex = i;
    const item = mode === 'all-images' ? files.find(x => isImage(x.file)) : files[i];
    if (!item) return;
    els.modalName.textContent = mode === 'all-images' ? `These settings will be applied to every image in the queue.` : `${item.file.name} · ${fmtBytes(item.file.size)}`;
    fillOptions(item.options, item.file);
    els.codec.closest('label').classList.toggle('hidden', mode === 'all-images');
    els.fps.closest('label').classList.toggle('hidden', mode === 'all-images');
    els.audio.closest('label').classList.toggle('hidden', mode === 'all-images');
    els.note.textContent = mode === 'all-images'
      ? 'Image settings only. Click Apply to All Images to copy these settings to every image in the queue.'
      : isVideo(item.file) ? 'Video compression is ready for the FFmpeg encoder integration.' : 'Image compression runs in the browser using Canvas.';
    els.apply.textContent = mode === 'all-images' ? 'Apply to All Images' : 'Apply';
    els.modal.classList.remove('hidden');
  }

  function closeOptions() { els.modal.classList.add('hidden'); activeOptionsIndex = -1; optionsMode = 'file'; }

  function readFormInto(o) {
    o.format = els.format.value; o.quality = els.quality.value; o.customQuality = Number(els.customQuality.value);
    o.target = els.target.value; o.targetUnit = els.targetUnit.value; o.resolution = els.resolution.value;
    o.codec = els.codec.value; o.fps = els.fps.value; o.audio = els.audio.value; o.smart = els.smart.checked;
  }

  function saveOptions() {
    if (optionsMode === 'all-images') {
      const firstImage = files.find(x => isImage(x.file)); if (!firstImage) return;
      const next = { ...firstImage.options }; readFormInto(next);
      files.forEach(item => { if (isImage(item.file)) { item.options = { ...next }; item.status = null; } });
      closeOptions(); renderQueue(); return;
    }
    if (activeOptionsIndex < 0) return;
    const o = files[activeOptionsIndex].options; readFormInto(o); files[activeOptionsIndex].status = null;
    closeOptions(); renderQueue();
  }

  function progress(p, status, details = '') {
    els.progressFill.style.width = `${Math.max(0, Math.min(100, p))}%`;
    els.progressPercent.textContent = `${Math.round(p)}%`;
    els.progressStatus.textContent = status; els.progressDetails.textContent = details;
  }

  async function imageDimensions(file) {
    const url = URL.createObjectURL(file);
    try { return await new Promise((res, rej) => { const img = new Image(); img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = () => rej(new Error('Could not read image')); img.src = url; }); }
    finally { URL.revokeObjectURL(url); }
  }

  function scale(w, h, max) { if (!max || Math.max(w, h) <= max) return { w, h }; const r = max / Math.max(w, h); return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) }; }

  async function imageCompress(file, o, onProgress) {
    const d = await imageDimensions(file);
    const max = o.resolution === 'original' ? Math.max(d.w, d.h) : Number(o.resolution);
    const size = scale(d.w, d.h, max);
    let mime = mimeFromFormat(o, file);
    if (mime === 'image/avif') mime = 'image/webp';
    const img = new Image(), url = URL.createObjectURL(file);
    try {
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Image decode failed')); img.src = url; });
      const c = document.createElement('canvas'); c.width = size.w; c.height = size.h;
      const ctx = c.getContext('2d'); if (!ctx) throw new Error('Canvas is unavailable');
      if (mime === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size.w, size.h); }
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, size.w, size.h);
      let q = qualityNumber(o);
      let blob = await new Promise(r => c.toBlob(r, mime, q));
      if (!blob) throw new Error('Browser could not encode this image');
      const target = targetBytes(o);
      if (target && blob.size > target && mime !== 'image/png') {
        for (let x = q - 0.07; x >= 0.25 && blob.size > target; x -= 0.07) {
          blob = await new Promise(r => c.toBlob(r, mime, x));
          onProgress(Math.min(96, 45 + (q - x) * 100), `Optimizing ${file.name}`, fmtBytes(blob.size));
        }
      }
      if (o.smart && blob.size >= file.size) blob = file;
      onProgress(100, `Finished ${file.name}`, `${fmtBytes(file.size)} → ${fmtBytes(blob.size)}`);
      return { file, blob, mime: blob.type || mime, original: file.size, dimensions: d, outputDimensions: size };
    } finally { URL.revokeObjectURL(url); }
  }

  async function videoCompress(file) {
    throw new Error('Video compression needs the FFmpeg encoder runtime. The per-file controls are ready, but this build does not fake video compression.');
  }

  async function compressSingle(i) {
    const item = files[i]; if (!item || item.busy) return;
    item.busy = true; item.status = null; renderQueue();
    try {
      const result = isImage(item.file)
        ? await imageCompress(item.file, item.options, (p, s, d) => progress(p, s, d))
        : await videoCompress(item.file, item.options);
      item.status = result; results = results.filter(r => r.file !== item.file); results.push(result);
    } catch (e) {
      item.status = { error: e.message }; results = results.filter(r => r.file !== item.file); results.push({ file: item.file, error: e.message });
    } finally { item.busy = false; renderQueue(); }
  }

  async function runAll() {
    if (!files.length) return;
    cancelled = false; results = []; els.progressSection.classList.remove('hidden'); els.resultsSection.classList.add('hidden'); els.cancel.disabled = false;
    for (let i = 0; i < files.length; i++) {
      if (cancelled) break;
      const item = files[i], base = i / files.length * 100; item.busy = true; renderQueue();
      progress(base, `Compressing ${i + 1} of ${files.length}`, item.file.name);
      try {
        const result = isImage(item.file)
          ? await imageCompress(item.file, item.options, (p, s, d) => progress(base + p / files.length, s, d))
          : await videoCompress(item.file, item.options, (p, s, d) => progress(base + p / files.length, s, d));
        item.status = result; results.push(result);
      } catch (e) { item.status = { error: e.message }; results.push({ file: item.file, error: e.message }); }
      item.busy = false; renderQueue();
    }
    els.cancel.disabled = true;
    if (cancelled) { progress(0, 'Cancelled', ''); return; }
    renderResults();
  }

  function renderResults() {
    els.resultsSection.classList.remove('hidden'); els.progressSection.classList.add('hidden'); els.resultsList.innerHTML = '';
    let original = 0, out = 0, ok = 0;
    results.forEach(r => {
      original += r.file.size; if (!r.error) { ok++; out += r.blob.size; }
      const row = document.createElement('div'); row.className = 'result-row';
      row.innerHTML = `<div class="result-icon">${isImage(r.file) ? '🖼' : '🎥'}</div><div><div class="file-name">${escapeHtml(r.file.name)}</div><div class="result-sizes">${fmtBytes(r.file.size)} → ${r.error ? 'Failed' : fmtBytes(r.blob.size)}</div></div><div class="saved">${r.error ? 'Error' : `${Math.max(0, ((1 - r.blob.size / r.file.size) * 100)).toFixed(0)}% saved`}</div>`;
      if (!r.error) { const b = document.createElement('button'); b.className = 'btn btn-secondary result-download'; b.textContent = 'Download'; b.onclick = () => downloadBlob(r.blob, outputFileName(r.file.name, r.mime || r.blob.type), r.mime || r.blob.type); row.append(b); }
      else { const err = document.createElement('div'); err.className = 'muted result-download'; err.textContent = r.error; row.append(err); }
      els.resultsList.append(row);
    });
    els.resultsSummary.textContent = `${ok} of ${results.length} files completed · ${fmtBytes(original)} original`;
    els.totalResultSize.textContent = ok ? `${fmtBytes(original)} → ${fmtBytes(out)}` : '—';
  }

  function outputFileName(originalName, mime) {
    const outputExt = ext(mime);
    const originalExt = (originalName.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();
    if (!outputExt || outputExt === originalExt) return originalName;
    return `${originalName.replace(/\.[^.]+$/, '')}.${outputExt}`;
  }

  function downloadBlob(blob, name, mime) {
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadAll() {
    const ok = results.filter(r => !r.error); if (!ok.length) return;
    if (!window.JSZip) { alert('ZIP support could not be loaded. Please refresh the page and try again.'); return; }
    const zip = new JSZip();
    const usedNames = new Map();
    ok.forEach(r => {
      const baseName = outputFileName(r.file.name, r.mime || r.blob.type);
      const count = usedNames.get(baseName) || 0;
      usedNames.set(baseName, count + 1);
      const finalName = count === 0 ? baseName : `${baseName.replace(/(\.[^.]+)$/, '')} (${count + 1})$1`;
      zip.file(finalName, r.blob);
    });
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    downloadBlob(blob, 'codeshare-compressed.zip', 'application/zip');
  }

  function reset() { files.splice(0); results = []; els.resultsSection.classList.add('hidden'); els.progressSection.classList.add('hidden'); renderQueue(); }

  els.browse.onclick = e => { e.stopPropagation(); els.input.click(); };
  els.addMore.onclick = () => els.input.click();
  els.upload.onclick = e => { if (e.target !== els.browse) els.input.click(); };
  els.upload.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.input.click(); } };
  els.input.onchange = () => { addFiles(els.input.files); els.input.value = ''; };
  ['dragenter', 'dragover'].forEach(n => els.upload.addEventListener(n, e => { e.preventDefault(); els.upload.classList.add('drag-over'); }));
  ['dragleave', 'drop'].forEach(n => els.upload.addEventListener(n, e => { e.preventDefault(); els.upload.classList.remove('drag-over'); }));
  els.upload.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  els.clear.onclick = reset; els.compress.onclick = runAll; els.applyImages.onclick = () => openOptions(-1, 'all-images');
  els.cancel.onclick = () => { cancelled = true; }; els.reset.onclick = reset; els.closeModal.onclick = closeOptions; els.apply.onclick = saveOptions;
  els.modal.addEventListener('click', e => { if (e.target === els.modal) closeOptions(); });
  els.quality.onchange = () => els.customWrap.classList.toggle('hidden', els.quality.value !== 'custom');
  els.customQuality.oninput = () => els.qualityValue.textContent = `${els.customQuality.value}%`;
  els.downloadAll.onclick = downloadAll;
  els.theme.onclick = () => { const light = document.documentElement.getAttribute('data-theme') === 'light'; document.documentElement.setAttribute('data-theme', light ? 'dark' : 'light'); localStorage.setItem('codeshare-theme', light ? 'dark' : 'light'); };
  const savedTheme = localStorage.getItem('codeshare-theme'); if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  renderQueue();
})();
