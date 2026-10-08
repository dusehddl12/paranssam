/* 홈트레이닝 강의 — 슬라이드 엔진
   → Space 다음 · ← 이전 · R 다시 · T/N 대본 · O 전체 보기 · F 전체 화면 · B/W 검은/흰 화면 · 숫자+Enter 이동 · ? 도움말 */
(function () {
  'use strict';
  const root = document.documentElement;
  const stage = document.querySelector('.stage');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;
  const lectureTitle = document.body.dataset.title || document.title;
  let cur = 0;
  const enterHandlers = [];
  const leaveHandlers = [];

  /* ---------- 빈칸 준비 ---------- */
  slides.forEach(s => {
    let n = 0;
    s.querySelectorAll('.blank').forEach(b => {
      n += 1;
      const num = b.dataset.n || n;
      b.innerHTML = '<i class="bn">' + num + '</i><span class="bt">' + b.innerHTML + '</span>';
      b.setAttribute('role', 'button');
      b.setAttribute('tabindex', '0');
      b.setAttribute('aria-label', '빈칸 ' + num + ' — 눌러서 답 보기');
      const show = e => { e.stopPropagation(); b.classList.add('on'); b.removeAttribute('aria-label'); };
      b.addEventListener('click', show);
      b.addEventListener('keydown', e => { if (e.key === 'Enter') show(e); });
    });
  });

  const stepsOf = s => Array.from(s.querySelectorAll('.step, .blank'));
  const resetSteps = s => stepsOf(s).forEach(e => e.classList.remove('on'));
  const revealAll = s => stepsOf(s).forEach(e => e.classList.add('on'));

  /* ---------- HUD ---------- */
  const hud = document.createElement('nav');
  hud.className = 'hud';
  hud.setAttribute('aria-label', '슬라이드 조작');
  hud.innerHTML =
    '<a class="home" href="index.html" title="강의 목록">← 목록</a>' +
    '<span class="ttl"></span>' +
    '<span class="prog" aria-hidden="true"><i></i></span>' +
    '<span class="cnt" aria-live="polite"></span>' +
    '<button class="hb" data-a="prev" aria-label="이전">←</button>' +
    '<button class="hb" data-a="next" aria-label="다음">→</button>' +
    '<button class="hb" data-a="notes">대본<kbd>T</kbd></button>' +
    '<button class="hb hide-s" data-a="over">전체<kbd>O</kbd></button>' +
    '<button class="hb hide-s" data-a="fs">전체 화면<kbd>F</kbd></button>' +
    '<button class="hb" data-a="help" aria-label="조작 방법">?</button>';
  document.body.appendChild(hud);
  hud.querySelector('.ttl').textContent = lectureTitle;
  const cnt = hud.querySelector('.cnt');
  const prog = hud.querySelector('.prog i');

  const drawer = document.createElement('section');
  drawer.className = 'drawer';
  drawer.hidden = true;
  drawer.setAttribute('aria-label', '대본');
  document.body.appendChild(drawer);

  const over = document.createElement('section');
  over.className = 'overview';
  over.hidden = true;
  document.body.appendChild(over);

  const help = document.createElement('div');
  help.className = 'help';
  help.hidden = true;
  help.innerHTML = '<div class="box" role="dialog" aria-label="조작 방법"><h5>강의 조작</h5><table>' +
    '<tr><td><kbd>→</kbd> <kbd>Space</kbd> 화면 클릭</td><td>다음 (빈칸 하나 → 다음 장)</td></tr>' +
    '<tr><td><kbd>←</kbd> 오른쪽 클릭</td><td>이전 장</td></tr>' +
    '<tr><td><kbd>R</kbd></td><td>이 장 처음부터 다시</td></tr>' +
    '<tr><td><kbd>T</kbd> <kbd>N</kbd></td><td>대본 보기</td></tr>' +
    '<tr><td><kbd>O</kbd></td><td>전체 보기</td></tr>' +
    '<tr><td><kbd>F</kbd></td><td>전체 화면</td></tr>' +
    '<tr><td><kbd>B</kbd> / <kbd>W</kbd></td><td>검은 화면 / 흰 화면</td></tr>' +
    '<tr><td>숫자 + <kbd>Enter</kbd></td><td>그 장으로 이동</td></tr>' +
    '<tr><td>좌우로 밀기</td><td>전자칠판·폰에서 넘기기</td></tr>' +
    '</table><p class="tiny" style="margin-top:12px">빈칸은 직접 눌러도 열립니다. 폰은 가로로 돌리면 더 크게 보입니다.</p>' +
    '<p style="margin-top:14px"><button class="btn" data-a="close">닫기</button></p></div>';
  document.body.appendChild(help);

  /* ---------- 크기 맞추기 ---------- */
  function fit() {
    const hudH = hud.getBoundingClientRect().height;
    const W = window.innerWidth;
    const H = window.innerHeight - hudH;
    const portrait = W / H < 0.95;
    root.classList.toggle('portrait', portrait);
    let sw, sh, s;
    if (!portrait) { sw = 1280; sh = 720; s = Math.min(W / sw, H / sh); }
    else { sw = 760; s = W / sw; sh = H / s; }
    stage.style.width = sw + 'px';
    stage.style.height = sh + 'px';
    stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);

  /* ---------- 이동 ---------- */
  function slideLabel(s, i) {
    const h = s.querySelector('h1, h2');
    return (s.dataset.label || (h ? h.textContent : '장 ' + (i + 1))).replace(/\s+/g, ' ').trim();
  }
  function go(i, opts) {
    opts = opts || {};
    if (i < 0 || i >= total) return;
    const prev = slides[cur];
    if (prev && prev !== slides[i]) { prev.classList.remove('active'); leaveHandlers.forEach(f => f(cur, prev)); }
    cur = i;
    const s = slides[cur];
    if (opts.all) revealAll(s); else resetSteps(s);
    s.classList.remove('active'); void s.offsetWidth; s.classList.add('active');
    s.scrollTop = 0;
    cnt.textContent = (cur + 1) + ' / ' + total;
    prog.style.width = ((cur + 1) / total * 100) + '%';
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) { /* 미리보기 등 */ }
    renderNotes();
    if (!over.hidden) renderOverview();
    enterHandlers.forEach(f => f(cur, s));
  }
  function next() {
    const pend = stepsOf(slides[cur]).filter(e => !e.classList.contains('on'));
    if (pend.length) { pend[0].classList.add('on'); return; }
    if (cur < total - 1) go(cur + 1);
  }
  function prev() { if (cur > 0) go(cur - 1, { all: true }); }
  function replay() { go(cur); }

  function renderNotes() {
    const n = slides[cur].querySelector('.notes');
    drawer.innerHTML = '<h5>대본 · ' + (cur + 1) + '장</h5>' + (n ? n.innerHTML : '<p class="muted">이 장에는 대본이 없습니다.</p>');
  }
  function toggleNotes(force) {
    drawer.hidden = force === undefined ? !drawer.hidden : !force;
    hud.querySelector('[data-a=notes]').classList.toggle('on', !drawer.hidden);
  }
  function renderOverview() {
    let sec = '';
    over.innerHTML = '<h5>' + lectureTitle + ' · 전체 ' + total + '장</h5><ol>' + slides.map((s, i) => {
      const se = s.dataset.sec || '';
      const showSec = se && se !== sec; sec = se || sec;
      return '<li><button data-go="' + i + '" class="' + (i === cur ? 'cur' : '') + '"><span class="n">' + (i + 1) + '</span>' +
        (showSec ? '<span class="s">' + se + '</span>' : '') + '<span class="t"></span></button></li>';
    }).join('') + '</ol>';
    over.querySelectorAll('button[data-go]').forEach(b => { b.querySelector('.t').textContent = slideLabel(slides[+b.dataset.go], +b.dataset.go); });
  }
  function toggleOverview(force) {
    over.hidden = force === undefined ? !over.hidden : !force;
    if (!over.hidden) { renderOverview(); const c = over.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'center' }); }
    hud.querySelector('[data-a=over]').classList.toggle('on', !over.hidden);
  }
  function toggleFS() {
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (root.requestFullscreen) root.requestFullscreen().catch(() => toast('이 화면에서는 전체 화면을 쓸 수 없어요'));
      else toast('이 화면에서는 전체 화면을 쓸 수 없어요');
    } catch (e) { toast('이 화면에서는 전체 화면을 쓸 수 없어요'); }
  }
  let blk = null;
  function blackout(kind) {
    if (blk) { blk.remove(); blk = null; return; }
    blk = document.createElement('div'); blk.className = 'blackout ' + kind;
    blk.addEventListener('click', () => { blk.remove(); blk = null; });
    document.body.appendChild(blk);
  }
  let toastT = null, toastEl = null;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 1600);
  }

  hud.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'prev') prev(); else if (a === 'next') next();
    else if (a === 'notes') toggleNotes(); else if (a === 'over') toggleOverview();
    else if (a === 'fs') toggleFS(); else if (a === 'help') help.hidden = false;
  });
  over.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { toggleOverview(false); go(+b.dataset.go, { all: true }); } });
  help.addEventListener('click', e => { if (e.target === help || e.target.closest('[data-a=close]')) help.hidden = true; });

  /* ---------- 입력 ---------- */
  const INTERACTIVE = 'a, button, input, select, textarea, label, summary, details, .interactive, .blank, .quiz, .ox, .match, .panel, svg.int';
  stage.addEventListener('click', e => {
    if (e.target.closest(INTERACTIVE)) return;
    if (window.getSelection && String(window.getSelection())) return;
    next();
  });
  stage.addEventListener('contextmenu', e => { if (e.target.closest('input, textarea')) return; e.preventDefault(); prev(); });

  let numBuf = '';
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
      if (e.key === 'Escape') t.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (blk) { blk.remove(); blk = null; e.preventDefault(); return; }
    const k = e.key;
    if (/^[0-9]$/.test(k)) { numBuf += k; toast(numBuf + ' → Enter'); return; }
    if (k === 'Enter' && numBuf) { const n = parseInt(numBuf, 10); numBuf = ''; go(Math.min(Math.max(n, 1), total) - 1, { all: true }); e.preventDefault(); return; }
    if (t && t.tagName === 'BUTTON' && (k === ' ' || k === 'Enter')) return;
    if (t && t.tagName === 'SUMMARY' && (k === ' ' || k === 'Enter')) return;
    numBuf = '';
    switch (k) {
      case 'ArrowRight': case 'PageDown': case ' ': case 'ArrowDown': if (k === 'ArrowDown' && root.classList.contains('portrait')) return; e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'PageUp': case 'ArrowUp': if (k === 'ArrowUp' && root.classList.contains('portrait')) return; e.preventDefault(); prev(); break;
      case 'Home': go(0); break;
      case 'End': go(total - 1, { all: true }); break;
      case 'r': case 'R': replay(); break;
      case 't': case 'T': case 'n': case 'N': toggleNotes(); break;
      case 'o': case 'O': toggleOverview(); break;
      case 'f': case 'F': toggleFS(); break;
      case 'b': case 'B': blackout('b'); break;
      case 'w': case 'W': blackout('w'); break;
      case '?': help.hidden = !help.hidden; break;
      case 'Escape': help.hidden = true; toggleOverview(false); toggleNotes(false); break;
    }
  });

  let tx = 0, ty = 0, tt = 0;
  stage.addEventListener('touchstart', e => { const p = e.changedTouches[0]; tx = p.clientX; ty = p.clientY; tt = Date.now(); }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (e.target.closest('input[type=range], .no-swipe')) return;
    const p = e.changedTouches[0]; const dx = p.clientX - tx; const dy = p.clientY - ty;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - tt < 800) { if (dx < 0) next(); else prev(); }
  }, { passive: true });

  /* ---------- 문항 위젯 ---------- */
  // 객관식: <div class="quiz mcq" data-answer="b"> <p class="q">…</p> <div class="opts"><button class="opt" data-k="a">…</button>…</div> <p class="fb">정답 해설</p></div>
  document.querySelectorAll('.mcq').forEach(q => {
    const ans = q.dataset.answer;
    const fb = q.querySelector('.fb'); const fbHTML = fb ? fb.innerHTML : '';
    if (fb) fb.hidden = true;
    q.querySelectorAll('.opt').forEach(o => {
      if (!o.querySelector('.k')) o.insertAdjacentHTML('afterbegin', '<span class="k">' + o.dataset.k + '</span>');
      o.addEventListener('click', () => {
        const ok = o.dataset.k === ans;
        q.querySelectorAll('.opt').forEach(x => { x.disabled = true; if (x.dataset.k === ans) x.classList.add('right'); });
        if (!ok) o.classList.add('wrong');
        if (fb) { fb.hidden = false; fb.classList.toggle('no', !ok); fb.innerHTML = '<b>' + (ok ? '맞았어요. ' : '정답은 ' + ans + '. ') + '</b>' + fbHTML; }
      });
    });
  });
  // O/X: <ol class="ox" data-labels="O|X"><li data-a="O"><span class="t">…</span><span class="why">…</span></li></ol>
  document.querySelectorAll('.ox').forEach(list => {
    const labels = (list.dataset.labels || 'O|X').split('|');
    const items = Array.from(list.children);
    const scoreEl = list.parentElement.querySelector('.score');
    let done = 0, right = 0;
    items.forEach((li, i) => {
      const why = li.querySelector('.why'); if (why) why.hidden = true;
      li.insertAdjacentHTML('afterbegin', '<span class="n">' + (i + 1) + '</span>');
      const btns = document.createElement('span'); btns.className = 'btns' + (labels.some(l => l.length > 2) ? ' wide' : '');
      labels.forEach(l => { const b = document.createElement('button'); b.type = 'button'; b.textContent = l; btns.appendChild(b); });
      li.querySelector('.t').after(btns);
      btns.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || li.dataset.done) return;
        li.dataset.done = '1'; done += 1;
        const ok = b.textContent === li.dataset.a; if (ok) right += 1;
        btns.querySelectorAll('button').forEach(x => { x.disabled = true; if (x.textContent === li.dataset.a) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        if (why) why.hidden = false;
        if (scoreEl) scoreEl.textContent = right + ' / ' + items.length + (done === items.length ? ' 맞음' : '');
      });
    });
  });
  // 연결형: <div class="match"><ul class="left"><li data-a="㉯">아동기</li></ul><ul class="right"><li data-k="㉮">…</li></ul></div>
  document.querySelectorAll('.match').forEach(m => {
    const keys = Array.from(m.querySelectorAll('.right li')).map(li => li.dataset.k);
    m.querySelectorAll('.right li').forEach(li => li.insertAdjacentHTML('afterbegin', '<b>' + li.dataset.k + '</b>'));
    const scoreEl = m.parentElement.querySelector('.score');
    const lefts = Array.from(m.querySelectorAll('.left li'));
    let right = 0, done = 0;
    lefts.forEach(li => {
      const name = li.innerHTML;
      li.innerHTML = '<span class="nm"><span>' + name + '</span><span class="res"></span></span><span class="keys"></span>';
      const box = li.querySelector('.keys');
      keys.forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.textContent = k; b.setAttribute('aria-label', name.replace(/<[^>]+>/g, '') + ' — ' + k); box.appendChild(b); });
      box.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || li.dataset.done) return;
        li.dataset.done = '1'; done += 1;
        const ok = b.textContent === li.dataset.a; if (ok) right += 1;
        box.querySelectorAll('button').forEach(x => { x.disabled = true; if (x.textContent === li.dataset.a) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        li.querySelector('.res').textContent = ok ? '맞음' : '정답 ' + li.dataset.a;
        li.querySelector('.res').style.color = ok ? 'var(--good)' : 'var(--bad)';
        if (scoreEl) scoreEl.textContent = right + ' / ' + lefts.length + (done === lefts.length ? ' 맞음' : '');
      });
    });
  });
  // 타이머: <div class="timer" data-secs="30"> 또는 data-secs="30|45|60"
  document.querySelectorAll('.timer').forEach(tm => {
    const opts = (tm.dataset.secs || '30').split('|').map(Number);
    let dur = opts[0], left = dur, iv = null;
    tm.innerHTML = '<span class="tv">' + dur + '</span><span class="bar"><i></i></span>' +
      (opts.length > 1 ? '<span class="seg">' + opts.map((o, i) => '<button type="button" class="btn' + (i ? '' : ' on') + '" data-d="' + o + '">' + o + '초</button>').join('') + '</span>' : '') +
      '<button type="button" class="btn primary" data-go="1">시작</button>';
    const tv = tm.querySelector('.tv'), bar = tm.querySelector('.bar i'), gob = tm.querySelector('[data-go]');
    const paint = () => { tv.textContent = Math.ceil(left); bar.style.transform = 'scaleX(' + Math.max(0, left / dur) + ')'; };
    const stop = () => { clearInterval(iv); iv = null; gob.textContent = left <= 0 ? '다시' : '시작'; };
    tm.addEventListener('click', e => {
      const d = e.target.closest('[data-d]');
      if (d) { stop(); dur = left = +d.dataset.d; tm.classList.remove('done'); tm.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('on', x === d)); paint(); return; }
      if (e.target.closest('[data-go]')) {
        if (iv) { stop(); return; }
        if (left <= 0) { left = dur; tm.classList.remove('done'); }
        const t0 = Date.now(), l0 = left; gob.textContent = '멈춤';
        iv = setInterval(() => { left = l0 - (Date.now() - t0) / 1000; if (left <= 0) { left = 0; tm.classList.add('done'); stop(); } paint(); }, 100);
      }
    });
    paint();
  });

  /* ---------- 공개 API ---------- */
  window.Deck = {
    go, next, prev, toast,
    onEnter: f => enterHandlers.push(f),
    onLeave: f => leaveHandlers.push(f),
    index: () => cur,
    slideOf: el => slides.indexOf(el.closest('.slide'))
  };

  fit();
  const h = parseInt((location.hash || '').slice(1), 10);
  go(h >= 1 && h <= total ? h - 1 : 0);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();

/* 선 그래프 도우미: Chart.line(svg, {labels, values, min, max, ...}) */
window.Chart = {
  line(svg, o) {
    const W = o.w || 640, H = o.h || 320, P = o.pad || { l: 56, r: 24, t: 24, b: 48 };
    const NS = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = '';
    const n = o.values.length;
    const x = i => P.l + (W - P.l - P.r) * (n === 1 ? .5 : i / (n - 1));
    const y = v => P.t + (H - P.t - P.b) * (1 - (v - o.min) / (o.max - o.min));
    const el = (tag, attrs, txt) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; };
    (o.ticks || []).forEach(t => { el('line', { x1: P.l, x2: W - P.r, y1: y(t), y2: y(t), class: 'grid' }); el('text', { x: P.l - 10, y: y(t) + 5, 'text-anchor': 'end' }, t); });
    if (o.ref != null) el('line', { x1: P.l, x2: W - P.r, y1: y(o.ref), y2: y(o.ref), class: 'ref' });
    const pts = o.values.map((v, i) => x(i) + ',' + y(v));
    el('polygon', { points: x(0) + ',' + y(o.min) + ' ' + pts.join(' ') + ' ' + x(n - 1) + ',' + y(o.min), class: 'area' });
    const line = el('polyline', { points: pts.join(' '), class: 'ln' });
    o.values.forEach((v, i) => {
      el('circle', { cx: x(i), cy: y(v), r: 8, class: 'pt' + ((o.hot || []).includes(i) ? ' hot' : '') });
      if (o.showVals) el('text', { x: x(i), y: y(v) - 16, 'text-anchor': 'middle', class: 'val' }, v);
      if (o.labels) {
        const lab = String(o.labels[i]).split('\n');
        lab.forEach((s, j) => el('text', { x: x(i), y: H - P.b + 24 + j * 18, 'text-anchor': 'middle' }, s));
      }
    });
    return { x, y, line };
  }
};
