/* Guia não oficial do ANIMAGE 2026 — comportamento das páginas.
   Os dados vêm de assets/data.js (window.ANIMAGE). */
(function () {
  'use strict';
  const D = window.ANIMAGE;
  if (!D) return;
  const root = document.documentElement;
  const app = document.getElementById('app');
  /* a página principal publicada não tem <html> próprio: lê o tipo do #app */
  const PAGE = root.dataset.page || (app && app.dataset.view) || '';
  const VSLUG = root.dataset.venue || (app && app.dataset.venue) || '';
  if (!root.lang) root.lang = 'pt-BR';

  /* ------------------------------------------------------------ utilidades */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mkStore = area => ({
    get(k, d) { try { const v = window[area].getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { window[area].setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } },
  });
  const store = mkStore('localStorage');
  const sess = mkStore('sessionStorage');
  const throttle = (fn, ms) => { let t = 0, timer; return (...a) => { const n = Date.now(); clearTimeout(timer); if (n - t > ms) { t = n; fn(...a); } else timer = setTimeout(() => { t = Date.now(); fn(...a); }, ms); }; };

  const THUMBS = window.ANIMAGE_THUMBS || {};
  const VBY = Object.fromEntries(D.venues.map(v => [v.slug, v]));
  const VIDX = Object.fromEntries(D.venues.map((v, i) => [v.slug, i]));
  const SBY = Object.fromEntries(D.sessions.map(s => [s.id, s]));
  const FILM_SESS = {};
  D.sessions.forEach(s => s.films.forEach(f => (FILM_SESS[f] = FILM_SESS[f] || []).push(s)));
  const RORD = { L: 0, '10': 10, '12': 12, '14': 14, '16': 16, '18': 18 };

  const WD = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const WDL = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const WDS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  function dinfo(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const w = new Date(y, m - 1, d).getDay();
    return { d, wd: WD[w], wdl: WDL[w], wds: WDS[w], long: `${WD[w]}, ${d} de novembro` };
  }
  const localISO = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  const NOWD = new Date();
  const NOW = { iso: localISO(NOWD), min: NOWD.getHours() * 60 + NOWD.getMinutes() };
  const FIRST = D.days[0], LAST = D.days[D.days.length - 1];
  const IN_FEST = NOW.iso >= FIRST && NOW.iso <= LAST;
  const AFTER_FEST = NOW.iso > LAST;
  const hm = min => { min = Math.round(min); const h = Math.floor(min / 60) % 24, m = min % 60; return h + 'h' + (m ? String(m).padStart(2, '0') : ''); };
  const sEnd = s => s.start + (s.total || 90);
  const isPast = s => s.date < NOW.iso || (s.date === NOW.iso && sEnd(s) < NOW.min);
  /* rola só a faixa horizontal (sem mexer na rolagem da página) */
  function revealX(container, el, smooth) {
    const cr = container.getBoundingClientRect(), er = el.getBoundingClientRect();
    if (er.left < cr.left + 8 || er.right > cr.right - 8) container.scrollTo({ left: container.scrollLeft + er.left - cr.left - 8, behavior: smooth ? 'smooth' : 'instant' });
  }

  const KEEP = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'BAP', 'ANIMAGE', 'EUA', 'ABCA']);
  const SMALL = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'o', 'a', 'os', 'as', 'no', 'na', 'com', 'para', 'x']);
  function pretty(s) {
    if (!s) return '';
    if (s !== s.toUpperCase()) return s;
    return s.split(' ').map((w, i) => {
      if (KEEP.has(w)) return w;
      const lw = w.toLowerCase();
      if (i > 0 && SMALL.has(lw)) return lw;
      return lw.replace(/^([^a-zà-ÿ]*)([a-zà-ÿ])/, (m, p, c) => p + c.toUpperCase());
    }).join(' ');
  }
  function sTitle(s) {
    if (s.kind === 'filme') { const f = D.films[s.films[0]]; return f ? f.t : (s.heading || pretty(s.mostra)); }
    if (s.kind === 'mostra') return pretty(s.mostra);
    return s.heading || pretty(s.mostra);
  }
  const sSub = s => (s.kind === 'filme' ? pretty(s.mostra) : '');
  const venueLink = (s) => `${VBY[s.venue].file}#d=${s.date}&s=${encodeURIComponent(s.id)}`;

  /* ------------------------------------------------------------ ícones */
  const IC = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    calPlus: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
    bookmark: '<path d="M6.5 4h11v16.5L12 16.8l-5.5 3.7z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    route: '<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M9.5 14v-2.2c0-.9.6-1.5 1.5-1.5h3.5"/><path d="m13 8.5 1.8 1.8L13 12.1"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>', chevR: '<path d="m9 18 6-6-6-6"/>', chevD: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    alert: '<path d="M12 3.5 22 20.5H2z"/><path d="M12 10v4.5M12 17.4v.3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  };
  const icon = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${IC[n]}</svg>`;
  const NEWTAB = '<span class="sr-only"> (abre em nova aba)</span>';

  /* ------------------------------------------------------------ classificação */
  const rlabel = r => (r ? (r === 'L' ? 'Livre' : `${r} anos`) : 'não informada');
  const rlong = r => (r ? (r === 'L' ? 'Livre para todos os públicos' : `Não recomendado para menores de ${r} anos`) : 'Classificação não informada no site oficial');
  const rb = (r, sm) => `<span class="rb${sm ? ' sm' : ''}" data-r="${r || '?'}" title="Classificação: ${rlabel(r)}" aria-hidden="true">${r || '?'}</span><span class="sr-only">Classificação ${rlabel(r)}.</span>`;
  const AGE_OPTS = [
    { value: '99', label: 'Todas as idades' }, { value: '0', label: 'Só Livre' }, { value: '10', label: 'Até 10 anos' },
    { value: '12', label: 'Até 12 anos' }, { value: '14', label: 'Até 14 anos' }, { value: '16', label: 'Até 16 anos' },
  ];
  let ageLimit = String(store.get('guia-idade', '99'));
  if (!AGE_OPTS.some(o => o.value === ageLimit)) ageLimit = '99';
  const overAge = r => !!r && RORD[r] > +ageLimit;

  /* ------------------------------------------------------------ ilustrações próprias */
  const PALS = [['#4B2A7E', '#EE7BAE', '#F7BFD9', '#EEAB83'], ['#395B50', '#A9C6A9', '#F7BFD9', '#EB5C37'], ['#745B9E', '#EEAB83', '#C7AFCE', '#F7BFD9'],
    ['#661619', '#EB5C37', '#EEAB83', '#F7BFD9'], ['#4B2A7E', '#A9C6A9', '#EE7BAE', '#C7AFCE'], ['#395B50', '#EEAB83', '#C7AFCE', '#EE7BAE']];
  const MOTIF = { 'ilha-de-deus': 'agua', 'praca-de-eventos-da-lagoa-do-araca': 'agua', 'parque-da-tamarineira': 'arvores', 'parque-de-apipucos': 'arvores', 'praca-do-hipodromo': 'praca', 'praca-da-varzea': 'praca' };
  function coverSVG(v, cls) {
    const i = VIDX[v.slug];
    const [bg, a, b, c] = PALS[i % PALS.length];
    const m = MOTIF[v.slug] || 'tela';
    const pid = `dots-${v.slug}-${cls}`;
    let art = '';
    if (m === 'agua') {
      art += `<circle cx="300" cy="78" r="44" fill="${b}"/><circle cx="300" cy="78" r="26" fill="${c}"/>`;
      [150, 176, 202, 228].forEach((y, k) => { art += `<path d="M-20 ${y} q25 -14 50 0${' t50 0'.repeat(9)}" fill="none" stroke="${k % 2 ? c : a}" stroke-width="9" stroke-linecap="round"/>`; });
      art += `<path d="M96 132 h60 l-10 14 h-40z" fill="${c}"/><path d="M124 132 V82 l26 44z" fill="${b}"/>`;
    } else if (m === 'arvores') {
      art += `<circle cx="320" cy="66" r="34" fill="${c}"/>`;
      art += `<path d="M0 196 Q110 168 210 194 T400 186 V250 H0z" fill="${a}" opacity=".9"/>`;
      [[54, 30, b], [124, 38, c], [206, 32, b], [286, 40, a], [356, 30, c]].forEach(([x, r, col]) => {
        art += `<rect x="${x - 4}" y="${176 - r * 0.2}" width="8" height="${30 + r * 0.4}" rx="3" fill="${bg}" opacity=".85"/><circle cx="${x}" cy="${160 - r * 0.6}" r="${r}" fill="${col}"/>`;
      });
    } else if (m === 'praca') {
      art += `<rect x="0" y="198" width="400" height="52" fill="${a}"/>`;
      art += `<path d="M0 40 Q200 120 400 40" fill="none" stroke="${c}" stroke-width="3"/>`;
      for (let k = 1; k < 10; k++) {
        const t = k / 10, x = 400 * t, y = (1 - t) * (1 - t) * 40 + 2 * (1 - t) * t * 120 + t * t * 40;
        art += `<path d="M${x - 11} ${y} h22 l-11 22z" fill="${[a, b, c][k % 3]}"/>`;
      }
      art += `<rect x="318" y="112" width="7" height="88" rx="3" fill="${c}"/><circle cx="321.5" cy="106" r="12" fill="${b}"/>`;
      art += `<rect x="60" y="172" width="120" height="10" rx="4" fill="${c}"/><rect x="70" y="182" width="8" height="18" fill="${c}"/><rect x="162" y="182" width="8" height="18" fill="${c}"/>`;
      art += `<circle cx="250" cy="150" r="22" fill="${b}" opacity=".9"/>`;
    } else {
      art += `<rect x="70" y="40" width="260" height="130" rx="14" fill="${c}"/><path d="M186 82 v46 l38 -23z" fill="${bg}"/>`;
      for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) art += `<rect x="${52 + k * 34}" y="${188 + r * 20}" width="24" height="12" rx="5" fill="${[a, b][(r + k) % 2]}"/>`;
    }
    return `<svg class="${cls}" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs><pattern id="${pid}" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#fff" opacity=".18"/></pattern></defs>
      <rect width="400" height="250" fill="${bg}"/><rect width="400" height="250" fill="url(#${pid})"/>${art}</svg>`;
  }
  function heroArt() {
    return `<svg class="hero-art" viewBox="0 0 800 500" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hero-fade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#2e1652" stop-opacity=".96"/><stop offset=".5" stop-color="#2e1652" stop-opacity=".55"/><stop offset="1" stop-color="#2e1652" stop-opacity="0"/></linearGradient>
        <pattern id="hero-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.2" fill="#F7BFD9" opacity=".4"/></pattern>
      </defs>
      <circle cx="650" cy="150" r="170" fill="#745B9E"/>
      <circle cx="650" cy="150" r="128" fill="#EE7BAE"/>
      <circle cx="650" cy="150" r="84" fill="#EB5C37"/>
      <circle cx="650" cy="150" r="42" fill="#F7BFD9"/>
      <rect x="430" y="320" width="370" height="180" fill="url(#hero-dots)"/>
      <g transform="rotate(-10 600 330)">
        <rect x="380" y="292" width="480" height="78" rx="12" fill="#1b0f2e"/>
        ${Array.from({ length: 12 }, (_, k) => `<rect x="${396 + k * 38}" y="300" width="18" height="12" rx="3" fill="#F7BFD9"/><rect x="${396 + k * 38}" y="350" width="18" height="12" rx="3" fill="#F7BFD9"/>`).join('')}
        <rect x="430" y="318" width="96" height="28" rx="5" fill="#A9C6A9"/><rect x="540" y="318" width="96" height="28" rx="5" fill="#EEAB83"/><rect x="650" y="318" width="96" height="28" rx="5" fill="#C7AFCE"/>
      </g>
      <path d="M360 440 C430 400 500 480 570 440 S710 400 800 440" stroke="#A9C6A9" stroke-width="14" fill="none" stroke-linecap="round"/>
      <path d="M360 474 C430 434 500 514 570 474 S710 434 800 474" stroke="#EEAB83" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M470 70 l7 20 20 7 -20 7 -7 20 -7 -20 -20 -7 20 -7z" fill="#F7BFD9"/>
      <path d="M770 300 l5 14 14 5 -14 5 -5 14 -5 -14 -14 -5 14 -5z" fill="#A9C6A9"/>
      <rect width="800" height="500" fill="url(#hero-fade)"/>
    </svg>`;
  }
  const tipoLabel = v => (v.tipo === 'Conecta' ? 'ANIMAGE Conecta' : v.tipo === 'Ao ar livre' ? 'Sessões ao ar livre' : 'Cinema');

  /* ------------------------------------------------------------ imagens dos filmes */
  /* miniaturas locais (assets/thumbs.js); sem elas, usa a imagem do filme */
  function filmThumb(f, slug) {
    const local = slug && THUMBS[slug];
    const src = local || f.thumb || f.img;
    if (!src) return `<span class="film-thumb ph">${icon('film')}</span>`;
    return `<img class="film-thumb" src="${esc(src)}"${!local && f.thumb ? ` data-full="${esc(f.img)}"` : ''} alt="" loading="lazy" decoding="async" width="72" height="44">`;
  }
  document.addEventListener('error', e => {
    const t = e.target;
    if (!(t instanceof HTMLImageElement)) return;
    if (t.dataset.full && t.src !== t.dataset.full) { t.src = t.dataset.full; return; }
    if (t.classList.contains('film-thumb') || t.classList.contains('r-thumb')) {
      const ph = document.createElement('span'); ph.className = t.className + ' ph'; ph.innerHTML = icon('film'); t.replaceWith(ph);
    } else if (t.closest('.m-media')) t.closest('.m-media').classList.add('none');
  }, true);

  /* ------------------------------------------------------------ roteiro (sessões salvas) */
  const RKEY = 'guia-roteiro';
  let saved = new Set((store.get(RKEY, []) || []).filter(id => SBY[id]));
  function updateCounts() {
    $$('[data-roteiro-count]').forEach(b => {
      b.hidden = !saved.size;
      b.innerHTML = `${saved.size}<span class="sr-only"> ${saved.size === 1 ? 'sessão salva' : 'sessões salvas'}</span>`;
    });
  }
  function saveBtn(s) {
    const on = saved.has(s.id);
    const ctx = `${sTitle(s)}, ${dinfo(s.date).long}, ${s.time}, ${VBY[s.venue].name}`;
    return `<button type="button" class="btn-save" data-save="${esc(s.id)}" aria-pressed="${on}">${icon('bookmark')}<span>Salvar no roteiro</span><span class="sr-only">: ${esc(ctx)}</span></button>`;
  }
  function toggleSave(id) {
    const on = !saved.has(id);
    if (on) saved.add(id); else saved.delete(id);
    store.set(RKEY, [...saved]);
    updateCounts();
    $$(`[data-save="${CSS.escape(id)}"]`).forEach(b => b.setAttribute('aria-pressed', String(on)));
    toast(on ? 'Sessão salva no seu roteiro' : 'Sessão removida do roteiro');
    if (PAGE === 'roteiro' && !on) renderRoteiro(id);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-save]'); if (b) toggleSave(b.dataset.save); });

  let toastT;
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ------------------------------------------------------------ agenda */
  function addDays(iso, n) { const [y, m, d] = iso.split('-').map(Number); return localISO(new Date(y, m - 1, d + n)); }
  const stamp = (iso, min) => { const extra = Math.floor(min / 1440); const day = addDays(iso, extra).replace(/-/g, ''); const mm = min % 1440; return `${day}T${String(Math.floor(mm / 60)).padStart(2, '0')}${String(mm % 60).padStart(2, '0')}00`; };
  function sDetails(s) {
    const lines = [];
    if (s.kind === 'mostra' || s.kind === 'filme') s.films.forEach(f => D.films[f] && lines.push('• ' + D.films[f].t));
    lines.push('', 'Guia não oficial. Confira horários em animagefestival.com');
    return lines.join('\n');
  }
  function gcalURL(s) {
    const v = VBY[s.venue];
    const p = new URLSearchParams({ action: 'TEMPLATE', text: `${sTitle(s)} · ANIMAGE 2026`, dates: `${stamp(s.date, s.start)}/${stamp(s.date, sEnd(s))}`, ctz: 'America/Recife', location: `${v.name}, ${v.bairro}, Recife`, details: sDetails(s) });
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }
  function calLink(s) { return `<a class="btn-link" href="${esc(gcalURL(s))}" target="_blank" rel="noopener">${icon('calPlus')}<span>Google Agenda</span>${NEWTAB}</a>`; }
  function downloadICS(list) {
    const icsEsc = t => String(t).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
    const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Guia nao oficial ANIMAGE 2026//PT-BR', 'CALSCALE:GREGORIAN'];
    list.forEach(s => {
      const v = VBY[s.venue];
      out.push('BEGIN:VEVENT', `UID:${s.id}@guia-animage`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
        `DTSTART;TZID=America/Recife:${stamp(s.date, s.start)}`, `DTEND;TZID=America/Recife:${stamp(s.date, sEnd(s))}`,
        `SUMMARY:${icsEsc(sTitle(s) + ' · ANIMAGE 2026')}`, `LOCATION:${icsEsc(v.name + ', ' + v.bairro + ', Recife')}`, `DESCRIPTION:${icsEsc(sDetails(s))}`, 'END:VEVENT');
    });
    out.push('END:VCALENDAR');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out.join('\r\n')], { type: 'text/calendar' }));
    a.download = 'meu-roteiro-animage-2026.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ------------------------------------------------------------ tema */
  const themeBtn = $('[data-theme-toggle]');
  const curTheme = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  function syncThemeBtn() { if (themeBtn) themeBtn.setAttribute('aria-label', curTheme() === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'); }
  themeBtn && themeBtn.addEventListener('click', () => {
    const next = curTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('guia-tema', next); } catch (e) { /* ok */ }
    syncThemeBtn();
  });
  syncThemeBtn();

  /* ------------------------------------------------------------ seletor acessível
     Padrão WAI-ARIA "select-only combobox": foco fica no campo e as setas
     percorrem as opções; Enter/Espaço escolhe, Esc fecha sem mudar. */
  let selSeq = 0;
  function Select({ label, options, value, onChange, align }) {
    const id = 'sel' + (++selSeq);
    const wrap = document.createElement('div');
    wrap.className = 'sel';
    wrap.innerHTML = `<span class="sel-label" id="${id}-l">${esc(label)}</span>
      <div class="sel-btn" id="${id}-c" role="combobox" tabindex="0" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-lb" aria-labelledby="${id}-l"><span class="sel-v"></span>${icon('chevD', 'ic chev')}</div>
      <ul class="sel-pop${align === 'right' ? ' right' : ''}" id="${id}-lb" role="listbox" aria-labelledby="${id}-l" tabindex="-1" hidden>
        ${options.map((o, i) => `<li class="sel-opt" role="option" id="${id}-o${i}" data-i="${i}" aria-selected="false">${icon('check', 'ic ck')}<span>${esc(o.label)}</span>${o.sub ? `<span class="opt-sub">${esc(o.sub)}</span>` : ''}</li>`).join('')}
      </ul>`;
    const combo = $('.sel-btn', wrap), list = $('.sel-pop', wrap), opts = $$('.sel-opt', wrap), val = $('.sel-v', wrap);
    let sel = Math.max(0, options.findIndex(o => o.value === value)), act = sel, open = false, typed = '', typedT;
    function paint() {
      val.textContent = options[sel].label;
      opts.forEach((o, i) => { o.setAttribute('aria-selected', String(i === sel)); o.classList.toggle('active', i === act && open); });
      if (open) { combo.setAttribute('aria-activedescendant', opts[act].id); opts[act].scrollIntoView({ block: 'nearest' }); } else combo.removeAttribute('aria-activedescendant');
    }
    function setOpen(o) {
      if (o === open) return;
      open = o; list.hidden = !o; combo.setAttribute('aria-expanded', String(o));
      if (o) {
        act = sel; list.classList.remove('up');
        const r = combo.getBoundingClientRect();
        if (window.innerHeight - r.bottom < Math.min(list.scrollHeight, 420) + 16 && r.top > window.innerHeight - r.bottom) list.classList.add('up');
        document.addEventListener('pointerdown', outside, true);
      } else document.removeEventListener('pointerdown', outside, true);
      paint();
    }
    function choose(i, close = true) {
      const changed = i !== sel; sel = i; act = i;
      if (close) setOpen(false); else paint();
      if (changed && onChange) onChange(options[i].value);
    }
    function outside(e) { if (!wrap.contains(e.target)) setOpen(false); }
    function move(i) { act = Math.max(0, Math.min(opts.length - 1, i)); paint(); }
    combo.addEventListener('click', () => setOpen(!open));
    combo.addEventListener('blur', () => setTimeout(() => { if (!wrap.contains(document.activeElement)) setOpen(false); }, 0));
    combo.addEventListener('keydown', e => {
      const k = e.key;
      if (!open) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(k)) {
          e.preventDefault(); setOpen(true);
          if (k === 'Home') move(0); if (k === 'End') move(opts.length - 1);
          return;
        }
      } else {
        if (k === 'ArrowDown') { e.preventDefault(); if (e.altKey) return choose(act); move(act + 1); return; }
        if (k === 'ArrowUp') { e.preventDefault(); if (e.altKey) return choose(act); move(act - 1); return; }
        if (k === 'Home') { e.preventDefault(); move(0); return; }
        if (k === 'End') { e.preventDefault(); move(opts.length - 1); return; }
        if (k === 'PageDown') { e.preventDefault(); move(act + 10); return; }
        if (k === 'PageUp') { e.preventDefault(); move(act - 10); return; }
        if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(act); return; }
        if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); return; }
        if (k === 'Tab') { choose(act); return; }
      }
      if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        clearTimeout(typedT); typed += norm(k); typedT = setTimeout(() => { typed = ''; }, 600);
        const start = open ? act : sel;
        const order = opts.map((_, i) => (start + 1 + i) % opts.length);
        const hit = order.find(i => norm(options[i].label).startsWith(typed)) ?? order.find(i => norm(options[i].label).includes(typed));
        if (hit != null) { if (!open) setOpen(true); move(hit); }
      }
    });
    list.addEventListener('pointerdown', e => e.preventDefault());
    list.addEventListener('click', e => { const o = e.target.closest('.sel-opt'); if (o) { choose(+o.dataset.i); combo.focus(); } });
    list.addEventListener('pointermove', e => { const o = e.target.closest('.sel-opt'); if (o && +o.dataset.i !== act) move(+o.dataset.i); });
    paint();
    return { el: wrap, set(v) { const i = options.findIndex(o => o.value === v); if (i >= 0) { sel = act = i; paint(); } } };
  }

  /* ------------------------------------------------------------ busca */
  const SEARCH = (() => {
    const items = [];
    D.venues.forEach(v => items.push({ type: 'local', key: v.slug, t: v.name, m: `${v.bairro} · ${v.sessions} ${v.tipo === 'Conecta' ? 'atividades' : 'sessões'}`, n: norm(v.name + ' ' + v.bairro) }));
    const mostras = new Map();
    D.sessions.forEach(s => { if (s.kind === 'mostra' || s.kind === 'filme') { const k = norm(s.mostra); if (!mostras.has(k)) mostras.set(k, { name: s.mostra, cat: s.cat }); } });
    mostras.forEach((m, k) => items.push({ type: 'mostra', key: m.name, t: pretty(m.name), m: D.cats[m.cat] || 'Mostra', n: k }));
    Object.entries(D.films).forEach(([slug, f]) => items.push({ type: 'filme', key: slug, t: f.t, m: [f.dir, f.pais, f.ano].filter(Boolean).join(' · '), n: norm(f.t), n2: norm([f.dir, f.pais, f.mostra].join(' ')), thumb: THUMBS[slug] || f.thumb || f.img, r: f.r }));
    return items;
  })();
  function hl(text, q) {
    const n = norm(text), i = n.indexOf(q);
    if (!q || i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function initSearch() {
    const box = $('[data-search]'); if (!box) return;
    const input = $('#q', box), pop = $('#q-pop', box), list = $('#q-list', box), empty = $('#q-empty', box);
    let results = [], act = -1;
    function close() { pop.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); act = -1; }
    function render() {
      const q = norm(input.value.trim());
      if (q.length < 2) { close(); return; }
      const score = it => { if (it.n.startsWith(q)) return 3; if (it.n.includes(' ' + q)) return 2; if (it.n.includes(q)) return 1.5; if (it.n2 && it.n2.includes(q)) return 1; return 0; };
      const scored = SEARCH.map(it => [score(it), it]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]);
      const pick = (type, n) => scored.filter(x => x[1].type === type).slice(0, n).map(x => x[1]);
      const groups = [['Locais', pick('local', 4)], ['Mostras', pick('mostra', 4)], ['Filmes', pick('filme', 8)]].filter(g => g[1].length);
      results = groups.flatMap(g => g[1]);
      let i = 0;
      list.innerHTML = groups.map(([name, arr]) => `<li class="grp" role="presentation" aria-hidden="true">${name}</li>` + arr.map(it => {
        const lead = it.type === 'filme'
          ? (it.thumb ? `<img class="r-thumb" src="${esc(it.thumb)}" alt="" loading="lazy">` : `<span class="r-ic">${icon('film')}</span>`)
          : `<span class="r-ic">${icon(it.type === 'local' ? 'pin' : 'layers')}</span>`;
        const kind = it.type === 'filme' ? 'Filme' : it.type === 'local' ? 'Local' : 'Mostra';
        return `<li role="option" id="q-o${i++}" aria-selected="false">${lead}<span><span class="sr-only">${kind}: </span><span class="r-t">${hl(it.t, q)}</span><br><span class="r-m">${esc(it.m)}</span></span>${it.r ? rb(it.r, true) : ''}</li>`;
      }).join('')).join('');
      empty.hidden = results.length > 0;
      pop.hidden = false; input.setAttribute('aria-expanded', 'true');
      act = -1; input.removeAttribute('aria-activedescendant');
    }
    function setAct(i) {
      const opts = $$('[role="option"]', list); if (!opts.length) return;
      act = (i + opts.length) % opts.length;
      opts.forEach((o, k) => o.setAttribute('aria-selected', String(k === act)));
      input.setAttribute('aria-activedescendant', opts[act].id);
      opts[act].scrollIntoView({ block: 'nearest' });
    }
    function activate(i) {
      const it = results[i]; if (!it) return;
      close(); input.blur();
      if (it.type === 'local') location.href = VBY[it.key].file;
      else if (it.type === 'filme') openFilm(it.key, {});
      else openMostra(it.key);
    }
    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 70); });
    input.addEventListener('focus', () => { if (input.value.trim().length >= 2) render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (pop.hidden) render(); setAct(act + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(act - 1); }
      else if (e.key === 'Enter') { if (!pop.hidden && results.length) { e.preventDefault(); activate(act < 0 ? 0 : act); } }
      else if (e.key === 'Escape') { if (!pop.hidden) { e.preventDefault(); close(); } else input.value = ''; }
    });
    input.addEventListener('blur', () => setTimeout(() => { if (!box.contains(document.activeElement)) close(); }, 120));
    list.addEventListener('pointerdown', e => e.preventDefault());
    list.addEventListener('click', e => { const o = e.target.closest('[role="option"]'); if (o) activate(+o.id.slice(3)); });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName) && !document.activeElement.isContentEditable && !$('#dlg').open) { e.preventDefault(); input.focus(); }
    });
  }

  /* ------------------------------------------------------------ janela (filme / mostra) */
  const dlg = $('#dlg'), mBox = $('#m');
  let viewStack = [], pushed = false, lastFocus = null, handled = true;
  function showModal() {
    if (dlg.open) return;
    lastFocus = document.activeElement;
    handled = false;
    dlg.showModal();
    /* só conta com o "voltar" fechando a janela se o histórico aceitou a entrada */
    try { history.pushState({ guiaModal: 1 }, ''); pushed = !!(history.state && history.state.guiaModal); } catch (e) { pushed = false; }
  }
  /* fecha e limpa uma vez só, sem depender do evento "close" */
  function onClosed() {
    if (handled) return;
    handled = true;
    viewStack = [];
    if (pushed) { pushed = false; history.back(); }
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  function closeModal() { if (dlg.open) dlg.close(); onClosed(); }
  dlg.addEventListener('cancel', e => { e.preventDefault(); closeModal(); });
  dlg.addEventListener('close', onClosed);
  window.addEventListener('popstate', () => { if (dlg.open) { pushed = false; closeModal(); } });
  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-close]')) closeModal();
    else if (e.target.closest('[data-mback]')) { viewStack.pop(); const prev = viewStack.pop(); if (prev) prev.fn(...prev.args); }
    else { const f = e.target.closest('[data-mfilm]'); if (f) openFilm(f.dataset.mfilm, JSON.parse(f.dataset.ctx || '{}')); }
  });
  function sessListHTML(list, hereSlug) {
    return `<ul class="m-list">${list.map(s => {
      const v = VBY[s.venue], here = s.venue === hereSlug;
      const where = here ? `<span class="where">${esc(v.name)}</span>` : `<a class="where" href="${venueLink(s)}">${esc(v.name)}</a>`;
      return `<li class="${here ? 'here' : ''}">${where}<span class="when">${esc(dinfo(s.date).long)} · ${esc(s.time)}${isPast(s) ? ' · encerrada' : ''}</span>${s.libras ? '<span class="pill lib">Libras</span>' : ''}${saveBtn(s)}</li>`;
    }).join('')}</ul>`;
  }
  function openFilm(slug, ctx) {
    const f = D.films[slug]; if (!f) return;
    ctx = ctx || {};
    viewStack.push({ fn: openFilm, args: [slug, ctx] });
    const list = ctx.list || null, idx = list ? list.indexOf(slug) : -1;
    const sessions = (FILM_SESS[slug] || []).slice().sort((a, b) => (a.date + String(a.start).padStart(4, '0')).localeCompare(b.date + String(b.start).padStart(4, '0')));
    const cat = sessions[0] ? sessions[0].cat : '';
    const meta = [['Direção', f.dir], ['País', f.pais], ['Ano', f.ano], ['Duração', f.dur]].filter(x => x[1]);
    const back = viewStack.length > 1 ? `<button type="button" class="m-back" data-mback>${icon('arrowL')}<span>Voltar para a mostra</span></button>` : '';
    mBox.innerHTML = `<button type="button" class="m-x" data-close aria-label="Fechar">${icon('x')}</button>${back}
      <div class="m-scroll">
        <div class="m-media${f.img ? '' : ' none'}">${f.img ? `<img src="${esc(f.img)}" alt="Imagem de divulgação do filme ${esc(f.t)}">` : ''}</div>
        <div class="m-body${f.img ? '' : ' pad-top'}">
          <p class="cat cat-${cat}">${esc(pretty(f.mostra || ''))}</p>
          <h2 class="m-title" id="m-title">${esc(f.t)}</h2>
          <p class="m-rating">${rb(f.r)}<span aria-hidden="true">${esc(rlong(f.r))}</span></p>
          <dl class="m-grid">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          <h3>Sinopse</h3><p class="m-syn">${esc(f.syn || 'Sinopse não informada no site oficial.')}</p>
          <h3>Onde e quando passa</h3>${sessListHTML(sessions, VSLUG)}
        </div>
      </div>
      <div class="m-foot">
        <div class="m-nav">${list && list.length > 1 ? `<button type="button" data-step="-1" aria-label="Filme anterior" ${idx <= 0 ? 'disabled' : ''}>${icon('chevL')}<span aria-hidden="true">Anterior</span></button><span>${idx + 1} de ${list.length}</span><button type="button" data-step="1" aria-label="Próximo filme" ${idx >= list.length - 1 ? 'disabled' : ''}><span aria-hidden="true">Próximo</span>${icon('chevR')}</button>` : ''}</div>
        <a class="btn-link" href="${esc(f.url)}" target="_blank" rel="noopener">Ver no site oficial${icon('ext')}${NEWTAB}</a>
      </div>`;
    $$('[data-step]', mBox).forEach(b => b.addEventListener('click', () => {
      const ni = idx + +b.dataset.step; if (ni < 0 || ni >= list.length) return;
      viewStack.pop(); openFilm(list[ni], ctx);
      const nb = $(`[data-step="${b.dataset.step}"]`, mBox); (nb && !nb.disabled ? nb : $('.m-x', mBox)).focus();
    }));
    showModal();
    $('.m-scroll', mBox).scrollTop = 0;
    if (!document.activeElement || !mBox.contains(document.activeElement)) $('.m-x', mBox).focus();
  }
  function openMostra(name) {
    const fkey = s => s.films.slice().sort().join(',');
    const byName = D.sessions.filter(s => norm(s.mostra) === norm(name) && (s.kind === 'mostra' || s.kind === 'filme'));
    if (!byName.length) return;
    /* a mesma mostra às vezes aparece com outro nome na grade: junta pelas mesmas obras */
    const keys = new Set(byName.filter(s => s.kind === 'mostra').map(fkey));
    const sessions = D.sessions.filter(s => byName.includes(s) || (s.kind === 'mostra' && keys.has(fkey(s))));
    viewStack.push({ fn: openMostra, args: [name] });
    const films = [...new Set(sessions.flatMap(s => s.films))];
    const s0 = sessions.find(s => s.kind === 'mostra') || sessions[0];
    const total = s0.totalFmt;
    mBox.innerHTML = `<button type="button" class="m-x" data-close aria-label="Fechar">${icon('x')}</button>
      <div class="m-scroll"><div class="m-body pad-top">
        <p class="cat cat-${s0.cat}">${esc(D.cats[s0.cat] || 'Mostra')}</p>
        <h2 class="m-title" id="m-title">${esc(pretty(name))}</h2>
        <p class="m-rating">${rb(s0.rating)}<span aria-hidden="true">${esc(s0.rating ? 'Classificação da sessão: ' + rlabel(s0.rating) : 'Classificação não informada')}</span></p>
        <p>${films.length} ${films.length === 1 ? 'filme' : 'filmes'}${total && s0.kind === 'mostra' ? ` · cerca de ${total} no total` : ''}.</p>
        <h3>Filmes</h3>
        <ul class="films">${films.map(fs => { const f = D.films[fs]; if (!f) return ''; return `<li><button type="button" class="film" data-mfilm="${esc(fs)}" data-ctx='${esc(JSON.stringify({ list: films }))}'>${filmThumb(f, fs)}<span class="film-t">${esc(f.t)}</span><span class="film-m">${esc([f.pais, f.ano, f.dur].filter(Boolean).join(' · '))}</span>${rb(f.r, true)}</button></li>`; }).join('')}</ul>
        <h3>Onde e quando passa</h3>${sessListHTML(sessions, VSLUG)}
      </div></div>`;
    showModal();
    $('.m-scroll', mBox).scrollTop = 0;
    $('.m-x', mBox).focus();
  }

  /* ------------------------------------------------------------ peças comuns */
  function slotHTML(s, ctxDate) {
    const end = s.total ? hm(sEnd(s)) : null;
    const title = sTitle(s), sub = sSub(s);
    const tags = [`<span class="cat">${esc(D.cats[s.cat] || '')}</span>`];
    if (s.films.length) tags.push(rb(s.rating, true));
    if (s.libras) tags.push('<span class="pill lib">Libras</span>');
    tags.push('<span class="over-msg">acima da idade escolhida</span>');
    const meta = [];
    if (s.kind === 'mostra') { if (s.films.length) meta.push(`${s.films.length} filmes`); if (s.totalFmt) meta.push(`cerca de ${s.totalFmt}`); }
    const list = s.films;
    const films = list.length ? `<ul class="films">${list.map(fs => {
      const f = D.films[fs]; if (!f) return '';
      const label = s.kind === 'filme' ? 'Sinopse e detalhes' : f.t;
      return `<li><button type="button" class="film${overAge(f.r) ? ' over' : ''}" data-film="${esc(fs)}" data-sid="${esc(s.id)}" data-r="${f.r || ''}">${filmThumb(f, fs)}<span class="film-t">${esc(label)}</span><span class="film-m">${esc([f.pais, f.ano, f.dur].filter(Boolean).join(' · '))}</span>${rb(f.r, true)}</button></li>`;
    }).join('')}</ul>` : '';
    const ext = s.kind === 'atividade' && s.href ? `<a class="btn-link" href="${esc(s.href)}" target="_blank" rel="noopener">Detalhes no site oficial${icon('ext')}${NEWTAB}</a>` : '';
    const cls = ['slot', 'cat-' + s.cat]; if (overAge(s.rating)) cls.push('over'); if (isPast(s)) cls.push('past');
    return `<li class="${cls.join(' ')}" id="s-${esc(s.id)}" data-r="${s.rating || ''}">
      <div class="tm"><b>${esc(s.time)}</b>${end ? `<small>≈ até ${end}</small>` : ''}${isPast(s) ? '<small>encerrada</small>' : ''}</div>
      <div class="sb"><div class="tags">${tags.join('')}</div><h3>${esc(title)}</h3>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
        ${(s.notes || []).map(n => `<p class="note">${esc(n)}</p>`).join('')}${meta.length ? `<p class="meta">${meta.map(esc).join(' · ')}</p>` : ''}
        ${films}<div class="slot-actions">${saveBtn(s)}${calLink(s)}${ext}</div></div></li>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('button.film[data-film]'); if (!b) return;
    const s = SBY[b.dataset.sid];
    openFilm(b.dataset.film, { list: s ? s.films : null });
  });
  function upcoming(filterFn, n) {
    let list = D.sessions.filter(s => s.kind !== 'atividade' && s.kind !== 'outro' && filterFn(s));
    if (IN_FEST) list = list.filter(s => !isPast(s));
    return list.slice(0, n);
  }
  function ticketList(list) {
    return `<ul class="tk-list">${list.map(s => {
      const di = dinfo(s.date), v = VBY[s.venue];
      return `<li><a class="tk" href="${venueLink(s)}"><span class="tk-date"><span>${di.wds}</span><b>${di.d}</b></span>
        <span class="tk-t">${esc(sTitle(s))}</span><span class="tk-m">${esc(s.time)} · ${esc(v.name)}</span>
        <span class="tk-m">${s.films.length ? rb(s.rating, true) + ' ' : ''}${s.kind === 'mostra' ? `${s.films.length} filmes` : esc(pretty(s.mostra))}</span></a></li>`;
    }).join('')}</ul>`;
  }

  /* ------------------------------------------------------------ início */
  /* estado compartilhado da lista de locais e da grade (vale entre páginas) */
  const gst = () => sess.get('grade-state', {}) || {};
  const saveG = patch => sess.set('grade-state', Object.assign(gst(), patch));
  const leadLocais = 'Escolha um lugar para ver a semana inteira dele em carrossel, com cada filme clicável.';
  const leadGrade = 'Tudo o que acontece no dia escolhido, por horário, em todos os locais. Escolha uma sessão para abrir o local já naquele dia.';

  function renderHome() {
    const totalFilms = Object.keys(D.films).length;
    const next = upcoming(() => true, 4);
    const nSaved = saved.size;
    app.innerHTML = `
      <div class="home-top">
        <section class="hero" aria-labelledby="hero-t">${heroArt()}
          <p class="eyebrow">20 a 29 de novembro · Recife · Gratuito</p>
          <h1 id="hero-t">A programação do ANIMAGE <em>por local</em></h1>
          <p class="hero-lead">Um guia independente para planejar suas sessões: o que passa em cada cinema, praça e parque, dia a dia, com sinopse e classificação indicativa de cada filme.</p>
          <p class="hero-notice">${icon('info')}<span><strong>Este não é o site oficial do festival.</strong> É um guia feito por um fã, sem vínculo com a organização. Confirme sempre em <a href="https://animagefestival.com/" target="_blank" rel="noopener">animagefestival.com${NEWTAB}</a>.</span></p>
          <div class="hero-cta"><a class="btn btn-pink" href="grade.html">${icon('cal')}${IN_FEST ? 'O que tem hoje' : 'Ver a grade do dia'}</a><a class="btn btn-glass" href="locais.html">${icon('pin')}Escolher um local</a></div>
          <div class="hero-stats"><div><b>${D.venues.length}</b><span>locais</span></div><div><b>${D.days.length}</b><span>dias</span></div><div><b>${D.sessions.length}</b><span>sessões e atividades</span></div><div><b>${totalFilms}</b><span>filmes</span></div></div>
        </section>
        <nav class="quick" aria-label="Atalhos">
          <a class="quick-i" href="locais.html">${icon('pin')}<span><b>Locais</b><small>${D.venues.length} cinemas, praças e parques</small></span>${icon('chevR', 'ic go')}</a>
          <a class="quick-i" href="grade.html">${icon('cal')}<span><b>${IN_FEST ? 'O que tem hoje' : 'Grade do dia'}</b><small>Tudo o que passa, por horário</small></span>${icon('chevR', 'ic go')}</a>
          <a class="quick-i" href="roteiro.html">${icon('bookmark')}<span><b>Meu roteiro</b><small>${nSaved ? `${nSaved} ${nSaved === 1 ? 'sessão salva' : 'sessões salvas'}` : 'Salve sessões e veja conflitos'}</small></span>${icon('chevR', 'ic go')}</a>
        </nav>
        <aside class="ticket" aria-labelledby="tk-t">
          <div class="ticket-h"><h2 id="tk-t">${AFTER_FEST ? 'Festival encerrado' : IN_FEST ? 'Próximas sessões' : 'Primeiras sessões'}</h2>${icon('film')}</div>
          <p class="ticket-sub">${AFTER_FEST ? 'A edição de 2026 terminou. Obrigado por usar o guia!' : IN_FEST ? 'O que começa daqui a pouco, em qualquer local.' : 'O festival começa na sexta, 20 de novembro.'}</p>
          <div class="tk-perf" aria-hidden="true"></div>
          ${next.length ? ticketList(next) : '<p class="ticket-sub">Sem mais sessões.</p>'}
          <a class="btn btn-primary" href="grade.html">Ver todas as sessões</a>
        </aside>
      </div>
      <div class="home-more">
        <section class="section" id="locais" aria-labelledby="locais-t">
          <div class="section-head"><div><h2 class="h2" id="locais-t">Locais</h2><p>${leadLocais}</p></div>
            <div class="toggles" role="group" aria-label="Mostrar locais do tipo" id="tipo-f"></div></div>
          <div class="vcards" id="vcards"></div>
        </section>
        <section class="section" id="grade" aria-labelledby="grade-t">
          <div class="section-head"><div><h2 class="h2" id="grade-t">Grade do dia</h2><p>${leadGrade}</p></div></div>
          ${gradeShell()}
        </section>
      </div>`;
    mountLocais();
    mountGrade();
  }
  const gradeShell = () => `<div class="tabs" role="tablist" aria-label="Dias do festival" id="gtabs"></div>
    <div class="grade-tools" id="gtools"></div>
    <div role="tabpanel" id="gpanel" tabindex="0"><div class="grade" id="gbody"></div></div>`;
  function renderLocais() {
    app.innerHTML = `<div class="page-head"><p class="eyebrow">Onde assistir</p><h1 class="h1">Locais</h1><p class="lead">${leadLocais}</p></div>
      <div class="toggles" role="group" aria-label="Mostrar locais do tipo" id="tipo-f"></div>
      <div class="vcards page-cards" id="vcards"></div>`;
    mountLocais();
  }
  function renderGrade() {
    app.innerHTML = `<div class="page-head"><p class="eyebrow">Dia a dia</p><h1 class="h1">Grade do dia</h1><p class="lead">${leadGrade}</p></div>${gradeShell()}`;
    mountGrade();
  }

  /* lista de locais */
  function mountLocais() {
    let tipo = gst().tipo || 'todos';
    const TIPOS = [['todos', 'Todos'], ['Cinema', 'Cinemas'], ['Ao ar livre', 'Ao ar livre'], ['Conecta', 'ANIMAGE Conecta']];
    const tf = $('#tipo-f');
    tf.innerHTML = TIPOS.map(([k, l]) => `<button type="button" class="tgl" data-tipo="${k}" aria-pressed="${k === tipo}">${icon('check', 'ic ck')}${l}</button>`).join('');
    tf.addEventListener('click', e => { const b = e.target.closest('[data-tipo]'); if (!b) return; tipo = b.dataset.tipo; $$('[data-tipo]', tf).forEach(x => x.setAttribute('aria-pressed', String(x === b))); drawCards(); saveG({ tipo }); });
    function drawCards() {
      const vs = D.venues.filter(v => tipo === 'todos' || v.tipo === tipo);
      $('#vcards').innerHTML = vs.map(v => `
        <article class="vcard">
          <div class="vcard-media">${v.photo ? `<img src="${esc(v.photo.src)}" alt="" loading="lazy" decoding="async">` : coverSVG(v, 'cover')}<span class="vcard-tipo">${esc(tipoLabel(v))}</span></div>
          <div class="vcard-body">
            <a class="vcard-map" href="${esc(v.maps)}" target="_blank" rel="noopener">${icon('pin')}Mapa<span class="sr-only"> de ${esc(v.name)} no Google Maps (abre em nova aba)</span></a>
            <h3><a href="${esc(v.file)}">${esc(v.name)}</a></h3>
            <p class="b">${esc(v.bairro)}</p>
            <p class="n">${v.sessions} ${v.tipo === 'Conecta' ? 'atividades' : 'sessões'}${v.films ? ` · ${v.films} filmes` : ''}</p>
            <div class="vcard-foot">
              <div class="strip" role="img" aria-label="Dias com programação: ${v.days.map(d => dinfo(d).d).join(', ')} de novembro">${D.days.map(d => `<span class="${v.days.includes(d) ? 'on' : ''}">${dinfo(d).d}</span>`).join('')}</div>
            </div>
          </div>
        </article>`).join('');
    }
    drawCards();
  }

  /* grade do dia */
  function mountGrade() {
    const st = gst();
    let gday = st.gday || (IN_FEST ? NOW.iso : FIRST);
    let gplace = st.gplace || 'todos';
    const tabs = $('#gtabs');
    tabs.innerHTML = D.days.map(d => { const i = dinfo(d); return `<button type="button" class="dtab" role="tab" id="gtab-${d}" data-d="${d}" aria-controls="gpanel" aria-selected="false" tabindex="-1" aria-label="${i.long}${d === NOW.iso ? ', hoje' : ''}"><small>${i.wds}</small><b>${i.d}</b>${d === NOW.iso ? '<span class="today-dot"></span>' : ''}</button>`; }).join('');
    function selectDay(d, focus) {
      gday = d;
      $$('.dtab', tabs).forEach(b => { const on = b.dataset.d === d; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on) { revealX(tabs, b, !!focus); if (focus) b.focus({ preventScroll: true }); } });
      $('#gpanel').setAttribute('aria-labelledby', 'gtab-' + d);
      drawGrade(); saveG({ gday });
    }
    tabs.addEventListener('click', e => { const b = e.target.closest('.dtab'); if (b) selectDay(b.dataset.d); });
    tabs.addEventListener('keydown', e => {
      const all = $$('.dtab', tabs), i = all.findIndex(b => b.dataset.d === gday);
      const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 };
      if (e.key in map) { e.preventDefault(); const n = (map[e.key] + all.length) % all.length; selectDay(all[n].dataset.d, true); }
    });

    /* grade do dia: filtros */
    const PLACE_OPTS = [{ value: 'todos', label: 'Todos os locais' }, { value: 't:Cinema', label: 'Só cinemas' }, { value: 't:Ao ar livre', label: 'Só ao ar livre' }, { value: 't:Conecta', label: 'Só ANIMAGE Conecta' }]
      .concat(D.venues.map(v => ({ value: v.slug, label: v.name })));
    const placeSel = Select({ label: 'Local', options: PLACE_OPTS, value: gplace, onChange: v => { gplace = v; drawGrade(); saveG({ gplace }); } });
    const ageSel = Select({ label: 'Classificação', options: AGE_OPTS, value: ageLimit, onChange: v => { ageLimit = v; store.set('guia-idade', v); drawGrade(); } });
    $('#gtools').append(placeSel.el, ageSel.el);

    function drawGrade() {
      const inPlace = s => gplace === 'todos' || (gplace.startsWith('t:') ? VBY[s.venue].tipo === gplace.slice(2) : s.venue === gplace);
      const daySess = D.sessions.filter(s => s.date === gday && inPlace(s));
      const shown = daySess.filter(s => !overAge(s.rating));
      const hidden = daySess.length - shown.length;
      const groups = new Map();
      shown.forEach(s => { if (!groups.has(s.start)) groups.set(s.start, { label: s.time.split('–')[0], list: [] }); groups.get(s.start).list.push(s); });
      const rows = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => `
        <div class="grow"><p class="gtime">${esc(g.label)}</p><div class="gitems">${g.list.map(s => {
          const v = VBY[s.venue], sub = [];
          if (s.kind === 'filme') sub.push(esc(pretty(s.mostra)));
          if (s.kind === 'mostra' && s.films.length) sub.push(`${s.films.length} filmes`);
          if (s.totalFmt) sub.push(esc(s.totalFmt));
          return `<a class="gitem cat-${s.cat}${isPast(s) ? ' past' : ''}" href="${venueLink(s)}"><span class="v">${esc(v.name)}</span><span class="h">${esc(sTitle(s))}</span>
            <span class="s">${s.films.length ? rb(s.rating, true) : `<span class="cat">${esc(D.cats[s.cat])}</span>`}${sub.join(' · ')}${s.libras ? ' <span class="pill lib">Libras</span>' : ''}${isPast(s) ? ' · encerrada' : ''}</span></a>`;
        }).join('')}</div></div>`).join('');
      const info = dinfo(gday);
      $('#gbody').innerHTML = (rows || `<p class="empty">Nada programado em ${esc(info.long)} para o filtro escolhido.</p>`)
        + (hidden ? `<p class="empty">${hidden} ${hidden === 1 ? 'sessão escondida' : 'sessões escondidas'} pela classificação escolhida.</p>` : '');
    }
    selectDay(gday);
  }

  /* ------------------------------------------------------------ página do local */
  function renderVenue() {
    const v = VBY[VSLUG]; if (!v) return;
    const items = D.sessions.filter(s => s.venue === v.slug);
    const active = D.days.filter(d => items.some(s => s.date === d));
    const next = upcoming(s => s.venue === v.slug, 3);
    const cats = [...new Set(items.map(s => s.cat))];
    const photo = v.photo;
    app.innerHTML = `
      <nav class="crumbs" aria-label="Você está em">
        <a class="back" href="locais.html" data-back>${icon('arrowL')}Voltar</a>
        <ol><li><a href="index.html">Início</a></li><li><a href="locais.html">Locais</a></li><li aria-current="page">${esc(v.name)}</li></ol>
      </nav>
      <div class="vtop">
        <section class="vhero" aria-labelledby="v-t">
          ${photo ? `<img class="vhero-bg" src="${esc(photo.src)}" alt="${esc(photo.alt)}">` : coverSVG(v, 'vhero-bg')}
          ${photo ? `<p class="credit">Foto: ${esc(photo.credit)} · ${esc(photo.license)} · <a href="${esc(photo.page)}" target="_blank" rel="noopener">Wikimedia Commons${NEWTAB}</a></p>` : ''}
          <div class="vhero-in">
            <p class="eyebrow">${esc(tipoLabel(v))}</p>
            <h1 id="v-t">${esc(v.name)}</h1>
            <p class="place">${esc(v.bairro)} · Recife</p>
            <div class="vhero-cta">
              <a class="btn btn-pink" href="${esc(v.maps)}" target="_blank" rel="noopener">${icon('pin')}Abrir no Google Maps${NEWTAB}</a>
              <a class="btn btn-glass" href="${esc(v.route)}" target="_blank" rel="noopener">${icon('route')}Como chegar${NEWTAB}</a>
            </div>
            <div class="vhero-stats"><span>${active.length} ${active.length === 1 ? 'dia' : 'dias'}</span><span>${items.length} ${v.tipo === 'Conecta' ? 'atividades' : 'sessões'}</span>${v.films ? `<span>${v.films} filmes</span>` : ''}</div>
          </div>
        </section>
        <aside class="ticket" aria-labelledby="tk-t">
          <div class="ticket-h"><h2 id="tk-t">${AFTER_FEST ? 'Encerrado' : IN_FEST ? 'Próximas aqui' : 'Primeiras aqui'}</h2>${icon('film')}</div>
          <p class="ticket-sub">${v.tipo === 'Conecta' ? 'O Cais do Sertão recebe o ANIMAGE Conecta: masterclasses, debates, pitching e rodadas de negócio.' : AFTER_FEST ? 'A programação deste local terminou.' : 'Toque numa sessão para ir direto a ela.'}</p>
          <div class="tk-perf" aria-hidden="true"></div>
          ${next.length ? ticketList(next) : `<p class="ticket-sub">${v.tipo === 'Conecta' ? 'Veja as atividades na programação abaixo.' : 'Sem mais sessões aqui.'}</p>`}
        </aside>
      </div>
      <div class="schedbar" id="schedbar">
        <div class="tabs" id="dchips" role="group" aria-label="Ir para o dia"></div>
        <div class="tools" id="vtools">
          <button type="button" class="arrow" id="prev" aria-label="Dia anterior">${icon('chevL')}</button>
          <button type="button" class="arrow" id="next" aria-label="Próximo dia">${icon('chevR')}</button>
        </div>
      </div>
      <div class="vfilters" id="vfilters">
        <div class="legend" aria-label="Legenda das cores">${cats.map(c => `<span class="cat-${c}"><i aria-hidden="true"></i>${esc(D.cats[c])}</span>`).join('')}</div>
      </div>
      <div class="track-wrap">
        <div class="track" id="track" role="region" aria-roledescription="carrossel" aria-label="Programação por dia em ${esc(v.name)}">
          ${active.map(d => {
            const di = dinfo(d), ss = items.filter(s => s.date === d), n = ss.length;
            const unit = v.tipo === 'Conecta' ? (n > 1 ? 'atividades' : 'atividade') : (n > 1 ? 'sessões' : 'sessão');
            return `<section class="day" id="d-${d}" data-date="${d}" aria-labelledby="h-${d}">
              <header class="day-h"><span class="dn" aria-hidden="true">${di.d}</span><h2 class="wd" id="h-${d}" tabindex="-1"><b>${di.wdl.replace(/^./, c => c.toUpperCase())}</b><span>${di.d} de novembro</span></h2>
              ${d === NOW.iso ? '<span class="tag-today">hoje</span>' : ''}<span class="cnt">${n} ${unit}</span></header>
              <ol class="slots">${ss.map(s => slotHTML(s, d)).join('')}</ol></section>`;
          }).join('') || '<p class="empty">Nenhuma programação encontrada para este local.</p>'}
        </div>
      </div>`;

    /* filtro de idade */
    if (v.films) {
      const ageSel = Select({ label: 'Classificação', options: AGE_OPTS, value: ageLimit, align: 'right', onChange: val => {
        ageLimit = val; store.set('guia-idade', val);
        $$('.slot', app).forEach(el => el.classList.toggle('over', overAge(el.dataset.r)));
        $$('button.film', app).forEach(el => el.classList.toggle('over', overAge(el.dataset.r)));
        toast(val === '99' ? 'Mostrando todas as idades' : 'Sessões acima da idade escolhida ficaram apagadas');
      } });
      $('#vfilters').prepend(ageSel.el);
    }

    /* chips de dia */
    const chips = $('#dchips'), track = $('#track');
    chips.innerHTML = D.days.map(d => {
      const di = dinfo(d), has = active.includes(d);
      return `<button type="button" class="dchip" data-d="${d}" ${has ? '' : 'disabled'} aria-label="${di.long}${d === NOW.iso ? ', hoje' : ''}${has ? '' : ', sem programação aqui'}"><small>${di.wds}</small><b>${di.d}</b>${d === NOW.iso ? '<span class="today-dot"></span>' : ''}</button>`;
    }).join('');
    const cards = () => $$('.day', track);
    function goTo(date, { instant = false, focus = false } = {}) {
      const el = document.getElementById('d-' + date); if (!el) return;
      track.scrollTo({ left: el.offsetLeft - track.offsetLeft - 4, behavior: instant ? 'instant' : 'smooth' });
      if (focus) $('h2', el).focus({ preventScroll: true });
    }
    function currentIndex() {
      const x = track.scrollLeft + 10; let idx = 0;
      cards().forEach((c, i) => { if (c.offsetLeft - track.offsetLeft <= x) idx = i; });
      return idx;
    }
    function step(dir) { const cs = cards(); const i = Math.max(0, Math.min(cs.length - 1, currentIndex() + dir)); if (cs[i]) goTo(cs[i].dataset.date); }
    chips.addEventListener('click', e => { const b = e.target.closest('.dchip'); if (b && !b.disabled) goTo(b.dataset.d, { focus: true }); });
    $('#prev').addEventListener('click', () => step(-1));
    $('#next').addEventListener('click', () => step(1));
    function syncChips() {
      const cs = cards(); if (!cs.length) return;
      const tw = track.clientWidth;
      const vis = new Set(cs.filter(c => { const l = c.offsetLeft - track.offsetLeft - track.scrollLeft; return l > -c.clientWidth / 2 && l < tw - c.clientWidth / 2; }).map(c => c.dataset.date));
      $$('.dchip', chips).forEach(b => b.setAttribute('aria-current', vis.has(b.dataset.d) ? 'true' : 'false'));
      const first = $('.dchip[aria-current="true"]', chips);
      if (first) revealX(chips, first, true);
      $('#prev').disabled = track.scrollLeft < 6;
      $('#next').disabled = track.scrollLeft + tw >= track.scrollWidth - 6;
    }
    let raf; track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(syncChips); }, { passive: true });
    window.addEventListener('resize', throttle(syncChips, 150));
    document.addEventListener('keydown', e => {
      if (dlg.open || e.altKey || e.ctrlKey || e.metaKey) return;
      const a = document.activeElement;
      if (a && (/input|textarea/i.test(a.tagName) || a.getAttribute('role') === 'combobox')) return;
      if (!(a === document.body || track.contains(a) || $('#schedbar').contains(a))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    /* posição inicial: link com dia/sessão, volta pelo histórico, hoje */
    return () => {
      const h = parseHash();
      if (h.d && active.includes(h.d)) {
        goTo(h.d, { instant: true });
        const el = h.s && document.getElementById('s-' + h.s);
        if (el) {
          requestAnimationFrame(() => {
            el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
            el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2200);
          });
        } else $('#schedbar').scrollIntoView({ block: 'start', behavior: 'instant' });
        syncChips();
        return true;
      }
      if (!restored && IN_FEST) { const t = active.find(d => d >= NOW.iso); if (t) goTo(t, { instant: true }); }
      syncChips();
      return false;
    };
  }
  function parseHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (/^\d{4}-\d{2}-\d{2}$/.test(h)) return { d: h };
    const p = new URLSearchParams(h);
    return { d: p.get('d'), s: p.get('s') };
  }

  /* ------------------------------------------------------------ meu roteiro */
  function renderRoteiro(removedId) {
    const list = D.sessions.filter(s => saved.has(s.id));
    const days = [...new Set(list.map(s => s.date))];
    const conflictsOf = s => list.filter(o => o !== s && o.date === s.date && o.start < sEnd(s) && s.start < sEnd(o));
    app.innerHTML = `
      <div class="page-head"><p class="eyebrow">Planejamento</p><h1 class="h1" id="rot-t" tabindex="-1">Meu roteiro</h1>
        <p class="section-head"><span>Sessões que você salvou, em ordem de dia e horário. Ficam guardadas só neste navegador.</span></p></div>
      ${list.length ? `<div class="rot-tools">
          ${D.noDownload ? '' : `<button type="button" class="btn btn-primary" id="ics">${icon('download')}Baixar para o calendário (.ics)</button>`}
          <button type="button" class="btn btn-ghost" id="clear">${icon('trash')}<span>Limpar roteiro</span></button>
        </div>
        ${days.map(d => `<section class="rot-day" aria-labelledby="rd-${d}"><h2 id="rd-${d}">${esc(dinfo(d).long)}</h2><ul class="rot-list">${list.filter(s => s.date === d).map(s => {
          const v = VBY[s.venue], cf = conflictsOf(s);
          return `<li class="rot-item cat-${s.cat}" data-id="${esc(s.id)}"><div class="tm"><b>${esc(s.time)}</b>${s.total ? `<small>≈ até ${hm(sEnd(s))}</small>` : ''}</div>
            <div class="sb"><p class="v">${esc(v.name)}</p><h3>${esc(sTitle(s))}</h3>${sSub(s) ? `<p class="sub">${esc(sSub(s))}</p>` : ''}
              <div class="tags" style="margin-top:6px">${s.films.length ? rb(s.rating, true) : ''}<span class="cat">${esc(D.cats[s.cat])}</span>${s.libras ? '<span class="pill lib">Libras</span>' : ''}${isPast(s) ? '<span class="pill">encerrada</span>' : ''}</div>
              ${cf.length ? `<p class="conflict">${icon('alert')}<span>Conflito de horário com ${cf.map(o => `${esc(sTitle(o))} (${esc(o.time)}, ${esc(VBY[o.venue].name)})`).join(' e ')}.</span></p>` : ''}
              <div class="slot-actions"><a class="btn-link" href="${venueLink(s)}">${icon('pin')}Ver no local</a>${calLink(s)}${saveBtn(s)}</div></div></li>`;
        }).join('')}</ul></section>`).join('')}`
        : `<div class="empty"><p>Nenhuma sessão salva ainda.</p><p style="margin-top:8px">Abra um local ou a grade do dia e use <strong>Salvar no roteiro</strong>. Se duas sessões salvas baterem de horário, o guia avisa aqui.</p>
           <p style="margin-top:16px"><a class="btn btn-primary" href="grade.html">${icon('cal')}Ver a grade do dia</a></p></div>`}`;
    const ics = $('#ics'); if (ics) ics.addEventListener('click', () => { downloadICS(list); toast('Arquivo do calendário baixado'); });
    const clear = $('#clear');
    if (clear) {
      let armed = false, t;
      clear.addEventListener('click', () => {
        if (!armed) { armed = true; $('span', clear).textContent = 'Toque de novo para confirmar'; t = setTimeout(() => { armed = false; $('span', clear).textContent = 'Limpar roteiro'; }, 4000); return; }
        clearTimeout(t); saved.clear(); store.set(RKEY, []); updateCounts(); toast('Roteiro limpo'); renderRoteiro(); $('#rot-t').focus();
      });
    }
    if (removedId) { const h = $('#rot-t'); if (h) h.focus(); }
  }

  /* ------------------------------------------------------------ rolagem e navegação */
  const POSKEY = 'pos:' + location.pathname;
  try { history.scrollRestoration = 'manual'; } catch (e) { /* ok */ }
  const navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const isReturn = navEntry ? (navEntry.type === 'back_forward' || navEntry.type === 'reload') : false;
  let restored = false;
  function savePos() {
    const tr = $('#track');
    sess.set(POSKEY, { y: Math.round(scrollY), tl: tr ? Math.round(tr.scrollLeft) : 0 });
  }
  function restorePos() {
    const p = sess.get(POSKEY); if (!p) return false;
    const tr = $('#track'); if (tr) tr.scrollTo({ left: p.tl, behavior: 'instant' });
    window.scrollTo({ top: p.y, behavior: 'instant' });
    return true;
  }
  addEventListener('pagehide', savePos);
  addEventListener('scroll', throttle(savePos, 250), { passive: true });
  document.addEventListener('scroll', e => { if (e.target && e.target.id === 'track') savePos(); }, { capture: true, passive: true });
  /* trilha dentro do site, para o botão Voltar usar o histórico quando faz sentido */
  const trail = sess.get('trail', []) || [];
  if (trail[trail.length - 1] !== location.pathname) trail.push(location.pathname);
  sess.set('trail', trail.slice(-30));
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-back]'); if (!a) return;
    const tr = sess.get('trail', []) || [];
    if (tr.length > 1 && tr[tr.length - 2] !== location.pathname && history.length > 1) { e.preventDefault(); history.back(); }
  });

  /* ------------------------------------------------------------ início da página */
  initSearch();
  updateCounts();
  let afterRender = null;
  if (app) {
    if (PAGE === 'home') renderHome();
    else if (PAGE === 'venue') afterRender = renderVenue();
    else if (PAGE === 'roteiro') renderRoteiro();
    else if (PAGE === 'locais') renderLocais();
    else if (PAGE === 'grade') renderGrade();
  }
  if (isReturn) restored = restorePos();
  if (afterRender) {
    const usedHash = !restored && afterRender();
    if (restored) { const sc = $('#schedbar'); if (sc) requestAnimationFrame(() => { const tr = $('#track'); if (tr) tr.dispatchEvent(new Event('scroll')); }); }
    if (usedHash) restored = true;
  } else if (!restored && location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
  /* links internos do tipo index.html#grade na própria página inicial */
  window.addEventListener('hashchange', () => {
    if (PAGE === 'venue') { const h = parseHash(); if (h.d) { const el = document.getElementById('d-' + h.d); if (el) el.scrollIntoView({ block: 'nearest', inline: 'start' }); } }
  });
  const q = new URLSearchParams(location.search);
  if (q.get('filme') && D.films[q.get('filme')]) openFilm(q.get('filme'), {});
})();
