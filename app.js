/* ============================================================
   KasKu — Catatan Keuangan Offline v1.0.0
   Data tersimpan lokal (localStorage). Tanpa server, tanpa internet.
   ============================================================ */
'use strict';

const APP_VERSION = '1.0.1';
const STORE_KEY = 'kasku_tx_v1';
const PREF_KEY = 'kasku_pref_v1';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const CATS = {
  income: [
    { id: 'gaji', name: 'Gaji', color: '#10b981' },
    { id: 'freelance', name: 'Freelance', color: '#0ea5e9' },
    { id: 'bisnis', name: 'Bisnis', color: '#8b5cf6' },
    { id: 'investasi', name: 'Investasi', color: '#f59e0b' },
    { id: 'hadiah', name: 'Hadiah', color: '#ec4899' },
    { id: 'lainnya_in', name: 'Lainnya', color: '#64748b' }
  ],
  expense: [
    { id: 'makan', name: 'Makanan', color: '#f97316' },
    { id: 'transport', name: 'Transport', color: '#0ea5e9' },
    { id: 'belanja', name: 'Belanja', color: '#ec4899' },
    { id: 'tagihan', name: 'Tagihan', color: '#8b5cf6' },
    { id: 'kesehatan', name: 'Kesehatan', color: '#14b8a6' },
    { id: 'hiburan', name: 'Hiburan', color: '#f43f5e' },
    { id: 'pendidikan', name: 'Pendidikan', color: '#6366f1' },
    { id: 'lainnya_ex', name: 'Lainnya', color: '#64748b' }
  ]
};

const EMOJI = {
  gaji: '💰', freelance: '💻', bisnis: '🏪', investasi: '📈', hadiah: '🎁', lainnya_in: '📥',
  makan: '🍚', transport: '🚗', belanja: '🛍️', tagihan: '🧾', kesehatan: '💊',
  hiburan: '🎮', pendidikan: '📚', lainnya_ex: '📦'
};

const CAT_MAP = {};
Object.keys(CATS).forEach(type => CATS[type].forEach(c => { CAT_MAP[c.id] = { ...c, type }; }));

/* ---------------- State ---------------- */
let tx = loadTx();
let prefs = loadPrefs();
let curMonth = ymNow();
let editingId = null;
let formType = 'expense';
let formCat = CATS.expense[0].id;
let histFilter = { type: 'all', cat: 'all', q: '' };
let deferredInstallPrompt = null;

/* ---------------- Storage ---------------- */
function loadTx() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(normTx).filter(Boolean) : [];
  } catch (e) { return []; }
}

function saveTx() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(tx)); }
  catch (e) { toast('Gagal menyimpan — penyimpanan browser penuh'); }
}

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; }
  catch (e) { return {}; }
}

function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* abaikan */ }
}

function normTx(t) {
  if (!t || typeof t !== 'object') return null;
  const amount = Math.round(Number(t.amount) || 0);
  if (amount <= 0) return null;
  const type = t.type === 'income' ? 'income' : 'expense';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(t.date || '')) ? String(t.date) : todayISO();
  const category = CAT_MAP[t.category] && CAT_MAP[t.category].type === type
    ? t.category : CATS[type][CATS[type].length - 1].id;
  return {
    id: String(t.id || uid()),
    type, amount, category, date,
    note: String(t.note || '').slice(0, 80),
    created: Number(t.created) || Date.now()
  };
}

/* ---------------- Utils ---------------- */
const NF0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const NF1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

// Sengaja dibuat deklarasi fungsi (bukan const panah) agar aman dipanggil
// dari bagian state di atas — terhindar dari temporal dead zone.
function pad2(n) { return String(n).padStart(2, '0'); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function ymOf(iso) { return String(iso).slice(0, 7); }
function ymNow() { return ymOf(todayISO()); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
const daysInMonth = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function parseISO(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }

function fmtDay(iso) {
  const d = parseISO(iso);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function fmtRp(n) { return 'Rp ' + NF0.format(Math.abs(Math.round(n || 0))); }

function fmtShort(n) {
  n = Math.abs(Math.round(n || 0));
  if (n >= 1e9) return NF1.format(n / 1e9) + ' M';
  if (n >= 1e6) return NF1.format(n / 1e6) + ' jt';
  if (n >= 1e3) return NF1.format(n / 1e3) + ' rb';
  return NF0.format(n);
}

function catById(type, id) { return CAT_MAP[id] || CATS[type][CATS[type].length - 1]; }
function emojiOf(id) { return EMOJI[id] || '📦'; }

/* ---------------- Theme ---------------- */
function applyTheme() {
  const pref = prefs.theme || 'system';
  const dark = pref === 'dark' || (pref === 'system' &&
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0f172a' : '#047857');
}

function cycleTheme() {
  const order = ['light', 'dark', 'system'];
  const cur = prefs.theme || 'system';
  prefs.theme = order[(order.indexOf(cur) + 1) % order.length];
  savePrefs();
  applyTheme();
  renderSettingsInfo();
  toast('Tema: ' + ({ light: 'Terang', dark: 'Gelap', system: 'Sistem' }[prefs.theme]));
}

/* ---------------- Hitungan ---------------- */
const txOfMonth = ym => tx.filter(t => ymOf(t.date) === ym);
const sumOf = (list, type) => list.reduce((s, t) => s + (t.type === type ? t.amount : 0), 0);

/* ---------------- Render: Beranda ---------------- */
function renderHome() {
  document.getElementById('monthName').textContent = monthLabel(curMonth);
  document.getElementById('monthHint').textContent = curMonth === ymNow() ? 'Bulan ini' : '\u00A0';
  document.getElementById('monthName2').textContent = monthLabel(curMonth);

  const list = txOfMonth(curMonth);
  const inc = sumOf(list, 'income');
  const exp = sumOf(list, 'expense');

  document.getElementById('sumBalance').textContent = (inc - exp < 0 ? '− ' : '') + fmtRp(inc - exp);
  document.getElementById('sumIncome').textContent = fmtRp(inc);
  document.getElementById('sumExpense').textContent = fmtRp(exp);

  document.getElementById('quickCount').textContent = NF0.format(list.length);
  const dom = curMonth === ymNow() ? new Date().getDate() : daysInMonth(curMonth);
  document.getElementById('quickAvg').textContent = fmtRp(dom ? exp / dom : 0);

  // Kategori pengeluaran terbesar
  const byCat = {};
  list.filter(t => t.type === 'expense').forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('quickTopCat').textContent = top ? emojiOf(top[0]) + ' ' + catById('expense', top[0]).name : '—';
  document.getElementById('quickTopCatNote').textContent = top
    ? `${fmtRp(top[1])} · ${exp ? Math.round(top[1] / exp * 100) : 0}% dari pengeluaran`
    : 'belum ada pengeluaran';

  // Transaksi terakhir (semua bulan)
  const recent = tx.slice().sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created).slice(0, 5);
  const el = document.getElementById('recentList');
  if (!recent.length) {
    el.innerHTML = `<div class="empty">
      <span class="em-ic">🗡️</span>
      <b>Belum ada catatan</b>
      <p>Mulai catat pemasukan & pengeluaran Baginda dengan menekan tombol <b>+</b> di bawah.</p>
      <button class="chip" type="button" data-sample="1">✨ Coba dengan data contoh</button>
    </div>`;
  } else {
    el.innerHTML = recent.map(txRowHTML).join('');
  }
}

function txRowHTML(t) {
  const c = catById(t.type, t.category);
  const sign = t.type === 'income' ? '+ ' : '− ';
  const cls = t.type === 'income' ? 'txt-income' : 'txt-expense';
  return `<div class="tx-item" data-id="${esc(t.id)}" role="button" tabindex="0">
    <div class="tx-icon" style="background:${c.color}22">${emojiOf(t.category)}</div>
    <div class="tx-main">
      <b>${esc(c.name)}</b>
      <small>${esc(t.note || fmtDay(t.date))}${t.note ? ' · ' + fmtDay(t.date) : ''}</small>
    </div>
    <div class="tx-amount ${cls}">${sign}${fmtRp(t.amount)}</div>
  </div>`;
}

/* ---------------- Render: Grafik ---------------- */
function emptyChart(text) { return `<div class="chart-empty">${esc(text)}</div>`; }

function renderBarChart() {
  const el = document.getElementById('barChart');
  const months = [];
  let m = curMonth;
  for (let i = 0; i < 6; i++) { months.unshift(m); m = shiftMonth(m, -1); }
  const data = months.map(ym => {
    const l = txOfMonth(ym);
    return { ym, inc: sumOf(l, 'income'), exp: sumOf(l, 'expense') };
  });

  if (data.every(d => d.inc === 0 && d.exp === 0)) {
    el.innerHTML = emptyChart('Belum ada data 6 bulan terakhir');
    return;
  }

  const W = 360, H = 190, padL = 46, padR = 8, padT = 10, padB = 24;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(1, ...data.map(d => Math.max(d.inc, d.exp)));
  const groupW = iw / 6, bw = 14, gap = 4;

  let s = '';
  [0, 0.5, 1].forEach(f => {
    const y = padT + ih - ih * f;
    s += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
    s += `<text x="${padL - 6}" y="${y + 3.5}" font-size="9" fill="var(--muted)" text-anchor="end">${f === 0 ? '0' : fmtShort(max * f)}</text>`;
  });

  data.forEach((d, i) => {
    const cx = padL + groupW * i + groupW / 2;
    const hInc = d.inc / max * ih, hExp = d.exp / max * ih;
    const x1 = cx - bw - gap / 2, x2 = cx + gap / 2;
    s += `<rect x="${x1}" y="${padT + ih - hInc}" width="${bw}" height="${Math.max(hInc, d.inc > 0 ? 3 : 0)}" rx="4" fill="var(--income)"><title>${monthLabel(d.ym)} masuk: ${fmtRp(d.inc)}</title></rect>`;
    s += `<rect x="${x2}" y="${padT + ih - hExp}" width="${bw}" height="${Math.max(hExp, d.exp > 0 ? 3 : 0)}" rx="4" fill="var(--expense)"><title>${monthLabel(d.ym)} keluar: ${fmtRp(d.exp)}</title></rect>`;
    const lbl = MONTHS[Number(d.ym.slice(5)) - 1].slice(0, 3);
    const isCur = d.ym === curMonth;
    s += `<text x="${cx}" y="${H - 6}" font-size="10" font-weight="${isCur ? '700' : '500'}" fill="${isCur ? 'var(--primary)' : 'var(--muted)'}" text-anchor="middle">${lbl}</text>`;
  });

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik batang pemasukan versus pengeluaran 6 bulan">${s}</svg>
    <div class="chart-note">6 bulan terakhir · sentuh batang untuk melihat nominal</div>`;
}

function renderDonut() {
  const el = document.getElementById('donutChart');
  const list = txOfMonth(curMonth).filter(t => t.type === 'expense');
  const total = sumOf(list, 'expense');
  if (!total) { el.innerHTML = emptyChart('Belum ada pengeluaran bulan ini'); return; }

  const byCat = {};
  list.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const rows = Object.entries(byCat)
    .map(([id, v]) => ({ cat: catById('expense', id), v }))
    .sort((a, b) => b.v - a.v);

  const R = 58, C = 2 * Math.PI * R, SW = 22;
  let off = 0, segs = '';
  rows.forEach(r => {
    const len = (r.v / total) * C;
    segs += `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${r.cat.color}" stroke-width="${SW}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)"><title>${esc(r.cat.name)}: ${fmtRp(r.v)} (${Math.round(r.v / total * 100)}%)</title></circle>`;
    off += len;
  });

  const legend = rows.map(r => `<div class="leg-row">
      <span class="dot" style="background:${r.cat.color}"></span>
      <span class="leg-name">${emojiOf(r.cat.id)} ${esc(r.cat.name)}</span>
      <b>${fmtRp(r.v)}</b>
      <span class="leg-pct">${Math.round(r.v / total * 100)}%</span>
    </div>`).join('');

  el.innerHTML = `<div class="donut-wrap">
    <svg class="donut-svg" viewBox="0 0 160 160" role="img" aria-label="Grafik donat pengeluaran per kategori">
      <circle cx="80" cy="80" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="${SW}"/>
      ${segs}
      <text x="80" y="74" text-anchor="middle" font-size="10.5" fill="var(--muted)">Total keluar</text>
      <text x="80" y="93" text-anchor="middle" font-size="15" font-weight="800" fill="var(--text)">${fmtShort(total)}</text>
    </svg>
    <div class="donut-legend">${legend}</div>
  </div>`;
}

function renderTrend() {
  const el = document.getElementById('trendChart');
  const [y, m] = curMonth.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const daily = new Array(days).fill(0);
  txOfMonth(curMonth).filter(t => t.type === 'expense')
    .forEach(t => { daily[Number(t.date.slice(8)) - 1] += t.amount; });

  const max = Math.max(...daily);
  if (!max) { el.innerHTML = emptyChart('Belum ada pengeluaran bulan ini'); return; }

  const W = 360, H = 150, padL = 44, padR = 10, padT = 12, padB = 22;
  const iw = W - padL - padR, ih = H - padT - padB;
  const X = i => padL + (days > 1 ? (i / (days - 1)) * iw : iw / 2);
  const Y = v => padT + ih - (v / max) * ih;

  const line = daily.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' L ');
  const area = `M ${X(0).toFixed(1)},${padT + ih} L ${line} L ${X(days - 1).toFixed(1)},${padT + ih} Z`;

  let s = `<defs><linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--expense)" stop-opacity="0.35"/>
      <stop offset="1" stop-color="var(--expense)" stop-opacity="0.02"/>
    </linearGradient></defs>`;

  [0, 0.5, 1].forEach(f => {
    const gy = padT + ih - ih * f;
    s += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="var(--border)" stroke-width="1"/>`;
    s += `<text x="${padL - 6}" y="${gy + 3.5}" font-size="9" fill="var(--muted)" text-anchor="end">${f === 0 ? '0' : fmtShort(max * f)}</text>`;
  });

  s += `<path d="${area}" fill="url(#gradTrend)"/>`;
  s += `<path d="M ${line}" fill="none" stroke="var(--expense)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;

  const mi = daily.indexOf(max);
  s += `<circle cx="${X(mi).toFixed(1)}" cy="${Y(max).toFixed(1)}" r="3.6" fill="var(--expense)"><title>Tanggal ${mi + 1}: ${fmtRp(max)}</title></circle>`;

  [1, Math.ceil(days / 2), days].forEach((d, idx) => {
    const anchor = idx === 0 ? 'start' : (idx === 2 ? 'end' : 'middle');
    s += `<text x="${X(d - 1).toFixed(1)}" y="${H - 5}" font-size="9.5" fill="var(--muted)" text-anchor="${anchor}">${d}</text>`;
  });

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik tren pengeluaran harian">${s}</svg>
    <div class="chart-note">Puncak: tanggal ${mi + 1} · ${fmtRp(max)}</div>`;
}

function renderCharts() { renderBarChart(); renderDonut(); renderTrend(); }

/* ---------------- Render: Riwayat ---------------- */
function renderCatSelect() {
  const sel = document.getElementById('catSelect');
  const types = histFilter.type === 'all' ? ['income', 'expense'] : [histFilter.type];
  const opts = ['<option value="all">Semua kategori</option>'];
  types.forEach(tp => CATS[tp].forEach(c => {
    opts.push(`<option value="${esc(c.id)}">${emojiOf(c.id)} ${esc(c.name)} (${tp === 'income' ? 'masuk' : 'keluar'})</option>`);
  }));
  sel.innerHTML = opts.join('');
  if (![...sel.options].some(o => o.value === histFilter.cat)) histFilter.cat = 'all';
  sel.value = histFilter.cat;
}

function renderHistory() {
  renderCatSelect();
  let list = tx.slice();
  if (histFilter.type !== 'all') list = list.filter(t => t.type === histFilter.type);
  if (histFilter.cat !== 'all') list = list.filter(t => t.category === histFilter.cat);
  const q = histFilter.q.trim().toLowerCase();
  if (q) list = list.filter(t => (t.note + ' ' + catById(t.type, t.category).name).toLowerCase().includes(q));
  list.sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);

  const inc = sumOf(list, 'income'), exp = sumOf(list, 'expense');
  document.getElementById('historySummary').textContent = list.length
    ? `${list.length} transaksi · masuk ${fmtRp(inc)} · keluar ${fmtRp(exp)}`
    : '';

  const el = document.getElementById('historyList');
  if (!list.length) {
    el.innerHTML = `<div class="empty">
      <span class="em-ic">🔍</span>
      <b>Tidak ada transaksi</b>
      <p>${q || histFilter.cat !== 'all' || histFilter.type !== 'all' ? 'Coba ubah kata kunci atau filter.' : 'Catatan Baginda masih kosong.'}</p>
    </div>`;
    return;
  }

  let html = '', lastDate = '';
  list.forEach(t => {
    if (t.date !== lastDate) {
      lastDate = t.date;
      const dayList = list.filter(x => x.date === t.date);
      const dIn = sumOf(dayList, 'income'), dEx = sumOf(dayList, 'expense');
      const parts = [];
      if (dIn) parts.push(`<b class="txt-income">+${fmtRp(dIn)}</b>`);
      if (dEx) parts.push(`<b class="txt-expense">−${fmtRp(dEx)}</b>`);
      html += `<div class="day-head"><span>${esc(fmtDay(t.date))}</span><span>${parts.join(' · ')}</span></div>`;
    }
    html += txRowHTML(t);
  });
  el.innerHTML = html;
}

/* ---------------- Render: Pengaturan ---------------- */
function renderSettingsInfo() {
  document.getElementById('aboutVersion').textContent = APP_VERSION;
  document.getElementById('aboutCount').textContent = NF0.format(tx.length) + ' transaksi';
  const bytes = new Blob([JSON.stringify(tx)]).size;
  document.getElementById('aboutSize').textContent = (bytes / 1024).toFixed(1) + ' KB';
  document.getElementById('aboutNet').textContent =
    (navigator.onLine ? '🟢 Online' : '🔴 Offline') + ' — semua fitur tetap jalan';
  document.querySelectorAll('#themeSeg button').forEach(b => {
    b.classList.toggle('active', b.dataset.themeChoice === (prefs.theme || 'system'));
  });
}

function renderAll() { renderHome(); renderCharts(); renderHistory(); renderSettingsInfo(); }

/* ---------------- Sheet (form transaksi) ---------------- */
const $ = id => document.getElementById(id);

function openSheet(id) {
  editingId = id || null;
  const t = id ? tx.find(x => x.id === id) : null;
  $('sheetTitle').textContent = t ? 'Ubah Transaksi' : 'Tambah Transaksi';
  formType = t ? t.type : 'expense';
  formCat = t ? t.category : CATS[formType][0].id;
  $('inpAmount').value = t ? NF0.format(t.amount) : '';
  $('inpDate').value = t ? t.date : (curMonth === ymNow() ? todayISO() : `${curMonth}-${pad2(daysInMonth(curMonth))}`);
  $('inpNote').value = t ? t.note : '';
  $('btnDeleteTx').hidden = !t;
  syncTypeSeg();
  renderCatChips();
  $('sheetBackdrop').hidden = false;
  $('sheet').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => { if (!t) $('inpAmount').focus(); }, 60);
}

function closeSheet() {
  $('sheet').hidden = true;
  $('sheetBackdrop').hidden = true;
  document.body.style.overflow = '';
  editingId = null;
}

function syncTypeSeg() {
  document.querySelectorAll('#typeSeg button').forEach(b =>
    b.classList.toggle('active', b.dataset.formType === formType));
}

function renderCatChips() {
  $('catChips').innerHTML = CATS[formType].map(c =>
    `<button class="chip cat-chip${c.id === formCat ? ' active' : ''}" type="button" data-cat="${esc(c.id)}">
      <span class="dot" style="background:${c.color}"></span>${emojiOf(c.id)} ${esc(c.name)}
    </button>`).join('');
}

function digitsOf(str) { return String(str).replace(/\D/g, ''); }

function saveFromSheet() {
  const amount = Number(digitsOf($('inpAmount').value));
  if (!amount || amount <= 0) { toast('Masukkan nominal dulu, Baginda'); $('inpAmount').focus(); return; }
  const date = $('inpDate').value;
  if (!date) { toast('Tanggal belum dipilih'); return; }

  const existing = editingId ? tx.find(x => x.id === editingId) : null;
  const rec = {
    id: existing ? existing.id : uid(),
    type: formType,
    amount,
    category: formCat,
    date,
    note: $('inpNote').value.trim().slice(0, 80),
    created: existing ? existing.created : Date.now()
  };
  if (existing) tx = tx.map(x => (x.id === rec.id ? rec : x));
  else tx.push(rec);

  saveTx();
  closeSheet();
  renderAll();
  toast(existing ? 'Transaksi diperbarui ✓' : 'Tersimpan ✓');
}

function deleteFromSheet() {
  const id = editingId;
  if (!id) return;
  confirmDialog('Hapus transaksi?', 'Catatan ini akan dihapus permanen dari perangkat.', () => {
    tx = tx.filter(x => x.id !== id);
    saveTx();
    closeSheet();
    renderAll();
    toast('Transaksi dihapus');
  });
}

/* ---------------- Dialog & Toast ---------------- */
let dialogCb = null;

function confirmDialog(title, text, onYes) {
  $('dialogTitle').textContent = title;
  $('dialogText').textContent = text;
  dialogCb = onYes;
  $('dialogBackdrop').hidden = false;
}

function closeDialog() { $('dialogBackdrop').hidden = true; dialogCb = null; }

let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------------- Navigasi ---------------- */
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  $('fabAdd').style.display = name === 'settings' ? 'none' : 'flex';
  if (name === 'chart') renderCharts();
  if (name === 'history') renderHistory();
  if (name === 'settings') renderSettingsInfo();
  window.scrollTo({ top: 0 });
}

function changeMonth(delta) {
  curMonth = shiftMonth(curMonth, delta);
  renderHome();
  renderCharts();
}

/* ---------------- Data: ekspor/impor/contoh ---------------- */
function exportData() {
  const payload = {
    app: 'kasku', version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    transactions: tx
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kasku-cadangan-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Cadangan diunduh ✓');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const arr = Array.isArray(parsed) ? parsed : parsed.transactions;
      if (!Array.isArray(arr)) throw new Error('format');
      const clean = arr.map(normTx).filter(Boolean);
      if (!clean.length) throw new Error('kosong');
      confirmDialog('Impor cadangan?', `${clean.length} transaksi ditemukan. Data akan digabung dengan data saat ini.`, () => {
        const ids = new Set(tx.map(t => t.id));
        let added = 0;
        clean.forEach(t => { if (!ids.has(t.id)) { tx.push(t); ids.add(t.id); added++; } });
        saveTx();
        renderAll();
        toast(`Impor selesai: ${added} transaksi baru ✓`);
      });
    } catch (e) {
      toast('File tidak valid — pastikan file cadangan KasKu');
    }
  };
  reader.onerror = () => toast('Gagal membaca file');
  reader.readAsText(file);
}

function mkTx(type, category, amount, date, note) {
  return { id: uid(), type, category, amount, date, note: note || '', created: Date.now() };
}

function loadSample() {
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = arr => arr[rand(0, arr.length - 1)];
  const notes = {
    makan: ['Nasi padang', 'Kopi pagi', 'Jajan sore', 'Makan malam', 'Sarapan'],
    transport: ['Bensin', 'Ojek online', 'Tol & parkir', 'Busway'],
    belanja: ['Belanja bulanan', 'Baju', 'Peralatan rumah'],
    tagihan: ['Listrik', 'Internet', 'Pulsa & paket data', 'Air'],
    hiburan: ['Nonton bioskop', 'Langganan musik', 'Game'],
    kesehatan: ['Vitamin', 'Apotek', 'Cek kesehatan'],
    pendidikan: ['Buku', 'Kursus online']
  };
  const now = new Date();
  const out = [];
  for (let back = 2; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const y = d.getFullYear(), mo = d.getMonth();
    const ym = `${y}-${pad2(mo + 1)}`;
    const limitDay = back === 0 ? now.getDate() : new Date(y, mo + 1, 0).getDate();
    if (limitDay < 1) continue;
    if (25 <= limitDay) out.push(mkTx('income', 'gaji', 5500000, `${ym}-25`, 'Gaji bulanan'));
    for (let i = 0; i < rand(0, 2); i++) {
      out.push(mkTx('income', 'freelance', rand(2, 9) * 250000, `${ym}-${pad2(rand(1, limitDay))}`, 'Proyek freelance'));
    }
    for (let i = 0; i < rand(12, 18); i++) {
      const cat = pick(['makan', 'makan', 'makan', 'transport', 'belanja', 'tagihan', 'hiburan', 'kesehatan', 'pendidikan']);
      const amount = cat === 'makan' ? rand(12, 65) * 1000
        : cat === 'transport' ? rand(5, 40) * 1000
        : cat === 'belanja' ? rand(30, 300) * 1000
        : cat === 'tagihan' ? rand(100, 500) * 1000
        : rand(20, 150) * 1000;
      out.push(mkTx('expense', cat, amount, `${ym}-${pad2(rand(1, limitDay))}`, pick(notes[cat] || ['Pengeluaran'])));
    }
  }
  out.forEach((t, i) => { t.created = Date.now() + i; });
  tx = tx.concat(out);
  saveTx();
  renderAll();
  toast(`${out.length} data contoh dimuat ✓`);
}

/* ---------------- Event wiring ---------------- */
function wire() {
  // Navigasi bawah
  document.querySelectorAll('.nav-item').forEach(b =>
    b.addEventListener('click', () => switchView(b.dataset.view)));
  document.querySelectorAll('[data-goto]').forEach(b =>
    b.addEventListener('click', () => switchView(b.dataset.goto)));

  // Ganti bulan (dua month-bar)
  ['btnPrevMonth', 'btnPrevMonth2'].forEach(id => $(id).addEventListener('click', () => changeMonth(-1)));
  ['btnNextMonth', 'btnNextMonth2'].forEach(id => $(id).addEventListener('click', () => changeMonth(1)));

  // FAB & sheet
  $('fabAdd').addEventListener('click', () => openSheet(null));
  $('btnCloseSheet').addEventListener('click', closeSheet);
  $('sheetBackdrop').addEventListener('click', closeSheet);
  $('btnSaveTx').addEventListener('click', saveFromSheet);
  $('btnDeleteTx').addEventListener('click', deleteFromSheet);

  // Segmented tipe pada form
  document.querySelectorAll('#typeSeg button').forEach(b => b.addEventListener('click', () => {
    formType = b.dataset.formType;
    formCat = CATS[formType][0].id;
    syncTypeSeg();
    renderCatChips();
  }));

  // Pilih kategori pada form
  $('catChips').addEventListener('click', e => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    formCat = chip.dataset.cat;
    renderCatChips();
  });

  // Format nominal saat diketik
  $('inpAmount').addEventListener('input', () => {
    const d = digitsOf($('inpAmount').value).replace(/^0+(?=\d)/, '');
    $('inpAmount').value = d ? NF0.format(Number(d)) : '';
  });

  // Klik transaksi (edit) — delegasi global
  document.addEventListener('click', e => {
    const item = e.target.closest('.tx-item');
    if (item && item.dataset.id) { openSheet(item.dataset.id); return; }
    const sample = e.target.closest('[data-sample]');
    if (sample) {
      confirmDialog('Muat data contoh?', 'Sekitar 3 bulan data contoh akan ditambahkan agar Baginda bisa melihat grafik. Bisa dihapus kapan saja lewat menu Atur.', () => loadSample());
    }
  });

  // Filter riwayat
  $('typeChips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    histFilter.type = chip.dataset.type;
    document.querySelectorAll('#typeChips .chip').forEach(c => c.classList.toggle('active', c === chip));
    renderHistory();
  });
  $('catSelect').addEventListener('change', e => { histFilter.cat = e.target.value; renderHistory(); });
  $('searchInput').addEventListener('input', e => { histFilter.q = e.target.value; renderHistory(); });

  // Tema
  $('btnTheme').addEventListener('click', cycleTheme);
  document.querySelectorAll('#themeSeg button').forEach(b => b.addEventListener('click', () => {
    prefs.theme = b.dataset.themeChoice;
    savePrefs();
    applyTheme();
    renderSettingsInfo();
  }));

  // Data
  $('btnExport').addEventListener('click', exportData);
  $('btnImport').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) importData(f);
    e.target.value = '';
  });
  $('btnReset').addEventListener('click', () => {
    confirmDialog('Hapus semua data?', 'Seluruh catatan keuangan akan dihapus permanen. Unduh cadangan dulu jika perlu!', () => {
      tx = [];
      saveTx();
      curMonth = ymNow();
      renderAll();
      toast('Semua data dihapus');
    });
  });

  // Dialog
  $('dialogNo').addEventListener('click', closeDialog);
  $('dialogBackdrop').addEventListener('click', e => { if (e.target === $('dialogBackdrop')) closeDialog(); });
  $('dialogYes').addEventListener('click', () => { const cb = dialogCb; closeDialog(); if (cb) cb(); });

  // Keyboard: Esc
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('dialogBackdrop').hidden) closeDialog();
      else if (!$('sheet').hidden) closeSheet();
    }
  });

  // Jaringan (info saja)
  window.addEventListener('online', renderSettingsInfo);
  window.addEventListener('offline', renderSettingsInfo);

  // Perubahan tema sistem
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(() => {
      if ((prefs.theme || 'system') === 'system') applyTheme();
    });
  }

  // Pasang aplikasi (PWA)
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    $('btnInstall').hidden = false;
  });
  $('btnInstall').addEventListener('click', async () => {
    if (!deferredInstallPrompt) { toast('Gunakan menu browser → “Tambahkan ke layar utama”'); return; }
    deferredInstallPrompt.prompt();
    const res = await deferredInstallPrompt.userChoice;
    if (res && res.outcome === 'accepted') toast('KasKu dipasang di layar utama ✓');
    deferredInstallPrompt = null;
    $('btnInstall').hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    $('btnInstall').hidden = true;
    toast('KasKu terpasang ✓');
  });
}

/* ---------------- Init ---------------- */
function init() {
  applyTheme();
  wire();
  renderAll();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline tetap jalan via cache browser */ });
    // Perisai pembaruan: saat versi baru tersedia, muat ulang sekali otomatis
    // agar perbaikan Bug tidak pernah tertahan cache lama.
    let refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
