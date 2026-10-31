const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const ptr = {x: innerWidth / 2, y: innerHeight / 2};
addEventListener("pointermove", e => { ptr.x = e.clientX; ptr.y = e.clientY; });
addEventListener("pointerdown", e => { ptr.x = e.clientX; ptr.y = e.clientY; });

/* Quality tiers: 2 full, 1 balanced, 0 lite. Auto mode steps down if the frame rate stays low. */
const QP = {
  2: {dots: 150, dpr: 2, cols: 20, rows: 16, iter: 4, grain: true, glow: true, stroke: true, lines: true},
  1: {dots: 90, dpr: 1.5, cols: 14, rows: 12, iter: 3, grain: false, glow: true, stroke: true, lines: true},
  0: {dots: 50, dpr: 1, cols: 10, rows: 9, iter: 2, grain: false, glow: false, stroke: false, lines: false}
};
const coarse = matchMedia("(pointer: coarse)").matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const baseQ = reduce ? 0 : (coarse || innerWidth < 700 || weak) ? 1 : 2;
let pmode = "auto"; try { const m = localStorage.getItem("pm"); if (["auto", "full", "lite"].includes(m)) pmode = m; } catch {}
let quality = reduce || pmode === "lite" ? 0 : pmode === "full" ? 2 : baseQ, Q = QP[quality], ready = false, lowCount = 0, lastChange = 0;
root.dataset.q = quality;
function applyQuality(q) { if (q === quality) return; quality = q; Q = QP[q]; root.dataset.q = q; if (ready) { size(); buildCloth(); } }
function perfCheck(fps, now) {
  if (pmode !== "auto" || reduce || document.hidden || now < 4000 || now - lastChange < 3000) return;
  if (fps < 40 && quality > 0) { if (++lowCount >= 4) { lowCount = 0; lastChange = now; applyQuality(quality - 1); toast("PERFORMANCE", quality === 1 ? "Switched to balanced mode" : "Switched to lite mode"); } } else lowCount = 0;
}

/* Gamer HUD: achievements, XP and level */
const TOTAL = 10, got = new Set(); let level = 1;
function toast(head, text) {
  const t = document.createElement("div"); t.className = "toast";
  const b = document.createElement("b"); b.textContent = head; const s = document.createElement("span"); s.textContent = text;
  t.append(b, s); $("#toasts").appendChild(t); setTimeout(() => t.remove(), 4300);
}
function unlock(id, title, desc) { if (got.has(id)) return; got.add(id); $("#ach").textContent = got.size; toast("ACHIEVEMENT UNLOCKED", title + ": " + desc); }
function flash() { const f = $("#flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
function updateXP(p) {
  const lv = Math.min(5, Math.floor(p * 5) + 1); root.style.setProperty("--lp", (p >= 1 ? 1 : (p * 5) % 1).toFixed(3));
  if (lv !== level) { if (lv > level) toast("LEVEL UP", "You reached level " + lv); level = lv; $("#lvl").textContent = lv; }
}

/* Themes */
const themes = ["steel", "cyber", "arcade", "xylex", "ember", "aurora", "daylight"];
let c1 = "#00e5ff", c2 = "#ff2e93";
function setTheme(t, user) {
  root.dataset.theme = t;
  if (user) { flash(); unlock("theme", "Style swap", "Changed the theme"); }
  $$("#dock button[data-t]").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === t));
  const cs = getComputedStyle(root); c1 = cs.getPropertyValue("--a1").trim(); c2 = cs.getPropertyValue("--a2").trim();
  const tc = $('meta[name="theme-color"]'); if (tc) tc.content = cs.getPropertyValue("--bg").trim();
  try { localStorage.setItem("theme", t); } catch {}
}
let saved = null; try { saved = localStorage.getItem("theme"); } catch {}
setTheme(themes.includes(saved) ? saved : matchMedia("(prefers-color-scheme: light)").matches ? "daylight" : "steel");
$$("#dock button[data-t]").forEach(b => b.addEventListener("click", () => setTheme(b.dataset.t, true)));
addEventListener("keydown", e => {
  if ((e.key === "t" || e.key === "T") && !e.target.closest("input") && !e.metaKey && !e.ctrlKey) setTheme(themes[(themes.indexOf(root.dataset.theme) + 1) % themes.length], true);
});

/* Photos: placeholders until the image file exists */
const okImgs = new Set();
function loadPhotos(scope = document) {
  $$("[data-img]", scope).forEach(el => {
    const im = new Image(), u = el.dataset.img;
    im.onload = () => { okImgs.add(u); if (el.classList.contains("ph")) { el.style.backgroundImage = `url("${u}")`; el.classList.add("has"); } };
    im.src = u;
  });
}
loadPhotos();

/* Boot screen */
const boot = $("#boot");
function hideBoot() { if (boot.classList.contains("off")) return; boot.classList.add("off"); document.body.classList.remove("booting"); setTimeout(() => unlock("boot", "Boot complete", "Entered the portfolio"), 700); }
if (reduce) hideBoot(); else {
  const txt = "> booting fortune.portfolio\n> scanning environment... secure\n> 1 engineer found\n> access granted\n> PRESS START", out = $("#boot-text");
  let i = 0; const id = setInterval(() => { out.textContent = txt.slice(0, ++i) + "▍"; if (i >= txt.length) { clearInterval(id); setTimeout(hideBoot, 900); } }, 24);
  boot.addEventListener("click", () => { clearInterval(id); hideBoot(); });
}

/* Decode text effect on headings */
const glyphs = "!<>-_\\/[]{}=+*^?#01";
function scramble(el) {
  if (el._busy || reduce) return; el._busy = true;
  const t = el.dataset.final || (el.dataset.final = el.textContent); el.setAttribute("aria-label", t);
  let f = 0; const id = setInterval(() => {
    f++; el.textContent = [...t].map((c, i) => c === " " || i < t.length * f / 24 ? c : glyphs[Math.random() * glyphs.length | 0]).join("");
    if (f >= 24) { clearInterval(id); el.textContent = t; el._busy = false; }
  }, 35);
}
const sio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { scramble(e.target); sio.unobserve(e.target); } }), {threshold: .6});
$$("[data-scramble]").forEach(el => { sio.observe(el); el.addEventListener("pointerenter", () => scramble(el)); });

/* 1. Typography hero with live guidelines */
const brand = $("#brand"), stage = $("#stage"), bl = $("#bl"), sname = $("#style-name");
const styles = [{w: 300, i: 0, n: "Light 300"}, {w: 900, i: 1, n: "Black italic 900"}, {w: 500, i: 0, n: "Medium 500"}];
const gl = {cap: $("#g-cap"), x: $("#g-x"), base: $("#g-base"), desc: $("#g-desc")};
const mctx = document.createElement("canvas").getContext("2d");
let si = 0, timer;
function guides() {
  const fs = parseFloat(getComputedStyle(brand).fontSize), s = styles[si];
  mctx.font = `${s.i ? "italic " : ""}${s.w} ${fs}px Fraunces, serif`;
  const capH = mctx.measureText("H").actualBoundingBoxAscent, xH = mctx.measureText("x").actualBoundingBoxAscent, dH = mctx.measureText("y").actualBoundingBoxDescent;
  const base = bl.getBoundingClientRect().bottom - stage.getBoundingClientRect().top;
  gl.cap.style.setProperty("--y", (base - capH) + "px"); gl.x.style.setProperty("--y", (base - xH) + "px");
  gl.base.style.setProperty("--y", base + "px"); gl.desc.style.setProperty("--y", (base + dH) + "px");
}
function setStyle(i) { si = i; const s = styles[i]; brand.style.fontWeight = s.w; brand.style.fontStyle = s.i ? "italic" : "normal"; sname.textContent = s.n; guides(); }
function next() { setStyle((si + 1) % styles.length); }
function restart() { clearInterval(timer); if (!reduce) timer = setInterval(next, 2600); }
function glitch() { stage.classList.remove("glitch"); void stage.offsetWidth; stage.classList.add("glitch"); setTimeout(() => stage.classList.remove("glitch"), 700); }
stage.addEventListener("click", () => { next(); restart(); glitch(); });
stage.addEventListener("pointerenter", () => { if (!reduce) glitch(); });
setInterval(() => { if (!reduce && heroVisible) glitch(); }, 7000);
stage.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); restart(); } });
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { setStyle(0); restart(); });
addEventListener("resize", guides);

/* Particle field: reacts to cursor, bursts on click */
const cv = $("#field"), ctx = cv.getContext("2d");
let W, H, dots = [], heroVisible = true;
function size() {
  const dpr = Math.min(devicePixelRatio || 1, Q.dpr); W = cv.clientWidth; H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dots = Array.from({length: Math.min(Q.dots, Math.floor(W * H / 9000))}, () => ({x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5, r: 1.5 + Math.random() * 2.5}));
}
function drawField() {
  ctx.clearRect(0, 0, W, H);
  const rc = cv.getBoundingClientRect(), px = ptr.x - rc.left, py = ptr.y - rc.top;
  for (const d of dots) {
    const dx = d.x - px, dy = d.y - py, dist = Math.hypot(dx, dy);
    if (dist < 170 && dist > 0) { const f = (170 - dist) / 170 * .9; d.vx += dx / dist * f; d.vy += dy / dist * f; }
    d.vx *= .94; d.vy *= .94; d.x += d.vx + (Math.random() - .5) * .08; d.y += d.vy + (Math.random() - .5) * .08;
    if (d.x < 0) d.x = W; if (d.x > W) d.x = 0; if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
  }
  ctx.lineWidth = 1; ctx.strokeStyle = c1;
  if (Q.lines) for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
    const a = dots[i], b = dots[j], dd = Math.hypot(a.x - b.x, a.y - b.y);
    if (dd < 110) { ctx.globalAlpha = (1 - dd / 110) * .45; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  for (const d of dots) { ctx.fillStyle = Math.hypot(d.x - px, d.y - py) < 170 ? c2 : c1; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill(); }
}
addEventListener("pointerdown", e => {
  const rc = cv.getBoundingClientRect(); if (e.clientY < rc.top || e.clientY > rc.bottom) return;
  const px = e.clientX - rc.left, py = e.clientY - rc.top;
  for (const d of dots) { const dx = d.x - px, dy = d.y - py, dist = Math.hypot(dx, dy); if (dist < 320 && dist > 0) { const f = (320 - dist) / 320 * 14; d.vx += dx / dist * f; d.vy += dy / dist * f; } }
});
new IntersectionObserver(([e]) => heroVisible = e.isIntersecting).observe(cv);
size(); addEventListener("resize", size);

/* Cursor, ripples, magnets, skill-card tilt */
const ring = $("#ring"), dot = $("#dot"), spot = $("#spot");
let rx = ptr.x, ry = ptr.y, sx = ptr.x, sy = ptr.y;
if (fine && !reduce) {
  document.body.classList.add("cursor-on");
  $$("a,button,.pc,.stage,.sk,.win,.hand,#cloth,#game").forEach(el => { el.addEventListener("pointerenter", () => ring.classList.add("big")); el.addEventListener("pointerleave", () => ring.classList.remove("big")); });
  $$("[data-mag]").forEach(el => {
    el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .3}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
    el.addEventListener("pointerleave", () => el.style.transform = "");
  });
}
addEventListener("pointerdown", e => {
  if (reduce) return; const r = document.createElement("div"); r.className = "rip"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
  document.body.appendChild(r); setTimeout(() => r.remove(), 650);
});
$$(".sk").forEach(c => {
  c.addEventListener("pointermove", e => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty("--mx", x * 100 + "%"); c.style.setProperty("--my", y * 100 + "%");
    if (reduce || e.pointerType === "touch") return;
    c.style.setProperty("--rx", ((.5 - y) * 12).toFixed(2) + "deg"); c.style.setProperty("--ry", ((x - .5) * 14).toFixed(2) + "deg");
  });
  c.addEventListener("pointerleave", () => { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
});

/* 2. Curtain, scroll-linked with smoothing, plus count-up stats */
const cur = $("#curtain"), prof = $("#profile"), shint = $("#shint");
let cp = 0, tp = 0, counted = false;
function curTarget() { const r = cur.getBoundingClientRect(), max = cur.offsetHeight - innerHeight; tp = Math.min(1, Math.max(0, -r.top / max)); }
addEventListener("scroll", curTarget, {passive: true}); addEventListener("resize", curTarget); curTarget();
function countUp() {
  $$("[data-n]").forEach(el => { const n = +el.dataset.n, t0 = performance.now(); (function s(t) { const k = Math.min(1, (t - t0) / 900); el.textContent = Math.round(n * k); if (k < 1) requestAnimationFrame(s); })(t0); });
}

/* 3. Keyword photo popups */
const pol = $("#pol"); let active = null;
function showPol(k) {
  unlock("fact", "Curious mind", "Opened a hidden fact"); active = k; const r = k.getBoundingClientRect(), art = $(".art", pol), u = k.dataset.img;
  if (okImgs.has(u)) { art.style.backgroundImage = `url("${u}")`; art.className = "art ph has"; } else { art.style.backgroundImage = ""; art.className = "art ph " + k.dataset.art; }
  $(".cap", pol).textContent = k.dataset.cap; pol.classList.add("on");
  const w = pol.offsetWidth, h = pol.offsetHeight; let y = r.top - h - 14; if (y < 8) y = r.bottom + 14;
  pol.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px"; pol.style.top = y + "px";
}
function hidePol() { active = null; pol.classList.remove("on"); }
$$(".kw").forEach(k => {
  k.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") showPol(k); });
  k.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") hidePol(); });
  k.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") { e.stopPropagation(); active === k ? hidePol() : showPol(k); } });
  k.addEventListener("focus", () => showPol(k)); k.addEventListener("blur", hidePol);
});
addEventListener("pointerdown", hidePol); addEventListener("scroll", hidePol, {passive: true});

/* 4. Card pile: fans out in view, drag cards when spread */
const stack = $("#stack"), cards = $$(".pc", stack); let z = 10;
function layoutFan() {
  const R = Math.min(innerWidth * .3, 190);
  cards.forEach((c, i) => {
    const a = i / cards.length * Math.PI * 2 - Math.PI / 2;
    c.style.setProperty("--fx", (Math.cos(a) * R).toFixed(1) + "px"); c.style.setProperty("--fy", (Math.sin(a) * R).toFixed(1) + "px");
    c.style.setProperty("--fr", ((i * 37) % 16 - 8) + "deg"); c.style.setProperty("--sr", ((i * 53) % 12 - 6) + "deg"); c.style.zIndex = i;
  });
}
function resetDrag() { cards.forEach(c => { c._o = {x: 0, y: 0}; c.style.setProperty("--dx", "0px"); c.style.setProperty("--dy", "0px"); }); }
layoutFan(); resetDrag(); addEventListener("resize", layoutFan);
new IntersectionObserver(([e]) => { stack.classList.toggle("fan", e.isIntersecting); if (!e.isIntersecting) resetDrag(); }, {threshold: .6}).observe(stack);
stack.addEventListener("click", e => { if (e.target === stack) { stack.classList.toggle("fan"); if (!stack.classList.contains("fan")) resetDrag(); } });
cards.forEach(c => {
  let sx0, sy0, drag = false;
  c.addEventListener("pointerdown", e => {
    if (!stack.classList.contains("fan")) return; e.stopPropagation(); drag = true; sx0 = e.clientX - c._o.x; sy0 = e.clientY - c._o.y;
    c.setPointerCapture(e.pointerId); c.classList.add("drag"); c.style.zIndex = ++z; unlock("drag", "Card shuffler", "Dragged a card");
  });
  c.addEventListener("pointermove", e => { if (!drag) return; c._o = {x: e.clientX - sx0, y: e.clientY - sy0}; c.style.setProperty("--dx", c._o.x + "px"); c.style.setProperty("--dy", c._o.y + "px"); });
  c.addEventListener("pointerup", () => { drag = false; c.classList.remove("drag"); });
});

/* 5. Timeline reveal */
const tl = $("#tl");
new IntersectionObserver(([e]) => { if (e.isIntersecting) tl.classList.add("in"); }, {threshold: .15}).observe(tl);

/* Terminal */
const out = $("#out"), tin = $("#tin");
function print(t, cls) { const d = document.createElement("div"); d.textContent = t; if (cls) d.className = cls; out.appendChild(d); out.scrollTop = out.scrollHeight; }
const cmds = {
  help: "Commands: about, skills, experience, projects, awards, contact, xylex, play, achievements, clear\nTry: theme steel | cyber | arcade | xylex | ember | aurora | daylight",
  about: "Mechatronics engineering student and cybersecurity analyst in Port Harcourt, Nigeria.\nFounder of Xylex Gaming Incorporation.",
  skills: "- Cybersecurity and pen testing\n- Mechatronics and control systems\n- Game development\n- Leadership and project management\n- Security automation and scripting\n- Critical thinking and analysis",
  experience: "Jun 2025 to now   Founder and technical lead, Xylex Gaming Incorporation\nFeb 2024 to now   Cybersecurity analyst, independent\nOct to Dec 2025   Mechatronics intern, Poseidon Energy Services Ltd.",
  projects: "Xylex Gaming Incorporation: original game prototypes from concept to launch.\nSecurity Automation Toolkit: scripts for monitoring, threat detection and vulnerability analysis.\nControl systems and hardware integration at Poseidon Energy Services.",
  awards: "Inter-University Cybersecurity Hackathon: first place, 2024\nTech Innovation and Entrepreneurship Award, University of Port Harcourt, 2025\nIntern of the Month, Poseidon Energy Services, 2025\nHOR of the Month, Poseidon Energy Services, 2025",
  xylex: "Xylex Gaming Incorporation: independent game studio founded in 2025, based in Abuja, Nigeria.\nI handle system architecture, secure coding practices, branding, investor pitches and the technical roadmap.\nStudio site: xylexgaminginc.onrender.com",
  contact: "Phone: +234 808-677-6186\nGitHub: github.com/Xaavier-alt\nInstagram: @joeugwu_fortune"
};
function run(line) {
  line = line.trim(); if (!line) return; print("$ " + line, "cmd"); unlock("term", "Terminal user", "Ran your first command");
  const [c, ...a] = line.toLowerCase().split(/\s+/);
  if (c === "clear") { out.textContent = ""; return; }
  if (c === "theme") { if (themes.includes(a[0])) { setTheme(a[0], true); print("Theme set to " + a[0] + "."); } else print("Usage: theme steel | cyber | arcade | xylex | ember | aurora | daylight"); return; }
  if (c === "achievements" || c === "stats") { print(got.size + " of " + TOTAL + " achievements unlocked. Level " + level + ". Some are hidden."); return; }
  if (c === "play") { $("#studio").scrollIntoView({behavior: reduce ? "auto" : "smooth"}); setTimeout(() => selectCart("arcade"), 800); print("Launching Bug Hunt..."); return; }
  if (c === "konami") { godMode(); print("Cheat code accepted."); return; }
  if (c === "sudo") { print("Nice try. Permission denied."); return; }
  if (cmds[c]) cmds[c].split("\n").forEach(l => print(l)); else print("Unknown command: " + c + ". Type help.");
}
print("Welcome. Type a command or tap a button below. Try help."); print("");
$("#tform").addEventListener("submit", e => { e.preventDefault(); run(tin.value); tin.value = ""; });
$$("#chips button").forEach(b => b.addEventListener("click", () => run(b.dataset.cmd)));

/* Main loop */
let frames = 0, fpsT = performance.now(); const fpsEl = $("#fps");
const track = $("#track"); track.innerHTML += track.innerHTML;
let pos = 0, dir = 1, lastY = scrollY, vel = 0;
function frame() {
  frames++; const nw = performance.now(); if (nw - fpsT > 500) { const fps = Math.round(frames * 1000 / (nw - fpsT)); fpsEl.textContent = fps; frames = 0; fpsT = nw; perfCheck(fps, nw); }
  const dy = scrollY - lastY; lastY = scrollY; vel += (Math.abs(dy) - vel) * .15; if (dy) dir = dy > 0 ? 1 : -1;
  if (!reduce) {
    pos -= dir * (1 + Math.min(vel * .6, 22)); const half = track.scrollWidth / 2; if (pos <= -half) pos += half; if (pos > 0) pos -= half;
    track.style.transform = `translateX(${pos}px)`; if (heroVisible) drawField();
    if (quality > 0) { sx += (ptr.x - sx) * .06; sy += (ptr.y - sy) * .06; spot.style.transform = `translate(${sx}px,${sy}px)`; }
  }
  cp += (tp - cp) * (reduce ? 1 : .1);
  if (clothVisible) clothTick(performance.now() / 1000);
  prof.style.transform = `scale(${.9 + .1 * cp})`; shint.style.opacity = Math.max(0, 1 - cp * 4);
  if (!counted && cp > .6) { counted = true; countUp(); unlock("curtain", "Curtain opened", "Pulled back the drapes"); }
  rx += (ptr.x - rx) * .2; ry += (ptr.y - ry) * .2;
  ring.style.transform = `translate(${rx}px,${ry}px)`; dot.style.transform = `translate(${ptr.x}px,${ptr.y}px)`;
  const tr = tl.getBoundingClientRect(); tl.style.setProperty("--tp", Math.min(1, Math.max(0, (innerHeight * .6 - tr.top) / tr.height)).toFixed(3));
  const max = root.scrollHeight - innerHeight, prog = max > 0 ? Math.min(1, scrollY / max) : 0; root.style.setProperty("--p", prog.toFixed(3)); updateXP(prog);
  requestAnimationFrame(frame);
}
if (reduce) drawField();
requestAnimationFrame(frame);

/* Curtain cloth: verlet physics, live shading, grabbable, with gaming hands */
const cc = $("#cloth"), cx = cc.getContext("2d");
let COLS = Q.cols, ROWS = Q.rows, HAND_ROW = Math.round(Q.rows * .62);
const handEls = [$("#hand-l"), $("#hand-r")];
let panels = [], CW = 0, CH = 0, clothVisible = true, grab = null, lastCx = 0, lastCy = 0, lastTheme = "", lastCp = 0;
let col1 = [68, 75, 88], col2 = [16, 18, 26], hi = [92, 225, 255], noisePat = null;
const hex2rgb = h => { h = h.trim().replace("#", ""); if (h.length === 3) h = [...h].map(k => k + k).join(""); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
function clothColors() { const cs = getComputedStyle(root); col1 = hex2rgb(cs.getPropertyValue("--c1")); col2 = hex2rgb(cs.getPropertyValue("--c2")); hi = hex2rgb(cs.getPropertyValue("--a1")); }
const gwOf = () => Math.min(CW * .14, 140);
function pinX(side, i, e) { const u = i / (COLS - 1), sp = u * CW * .505, ga = u * gwOf(), x = sp + (ga - sp) * e; return side ? CW - x : x; }
function buildCloth() {
  COLS = Q.cols; ROWS = Q.rows; HAND_ROW = Math.round(ROWS * .62);
  const dpr = Math.min(devicePixelRatio || 1, Q.dpr); CW = cc.clientWidth; CH = cc.clientHeight; if (!CW) return;
  cc.width = CW * dpr; cc.height = CH * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  panels = [0, 1].map(side => { const pts = []; for (let jj = 0; jj < ROWS; jj++) for (let i = 0; i < COLS; i++) { const x = pinX(side, i, cp), y = jj * CH * 1.03 / (ROWS - 1); pts.push({x, y, px: x, py: y, i, j: jj, pin: jj === 0}); } return {side, pts}; });
  if (!noisePat) {
    const n = document.createElement("canvas"); n.width = n.height = 128; const g = n.getContext("2d"), id = g.createImageData(128, 128);
    for (let k = 0; k < id.data.length; k += 4) { const v = Math.random() * 255; id.data[k] = id.data[k + 1] = id.data[k + 2] = v; id.data[k + 3] = 255; }
    g.putImageData(id, 0, 0); noisePat = cx.createPattern(n, "repeat");
  }
}
function link(a, b, len) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = (d - len) / d, wa = a.pin ? 0 : 1, wb = b.pin ? 0 : 1, w = wa + wb;
  if (!w) return; a.x += dx * k * wa / w; a.y += dy * k * wa / w; b.x -= dx * k * wb / w; b.y -= dy * k * wb / w;
}
function clothTick(time) {
  if (root.dataset.theme !== lastTheme) { lastTheme = root.dataset.theme; clothColors(); }
  if (!panels.length) return;
  const e = cp, rc = cc.getBoundingClientRect(), mx = ptr.x - rc.left, my = ptr.y - rc.top, mvx = mx - lastCx, mvy = my - lastCy;
  lastCx = mx; lastCy = my;
  const calm = reduce, damp = calm ? .8 : .985, moving = Math.abs(mvx) + Math.abs(mvy) > 1.5 && mx > 0 && mx < CW && my > 0 && my < CH;
  for (const P of panels) for (const q of P.pts) {
    if (q.pin) { q.x = pinX(P.side, q.i, e); q.y = 0; q.px = q.x; q.py = q.y; continue; }
    if (grab && grab.q === q) continue;
    const vx = (q.x - q.px) * damp, vy = (q.y - q.py) * damp; q.px = q.x; q.py = q.y;
    q.x += vx + (calm ? 0 : Math.sin(time * .9 + q.j * .35 + q.i * .2 + P.side * 2) * .05 * q.j / ROWS); q.y += vy + .32;
    if (!calm && !grab && moving) { const d = Math.hypot(q.x - mx, q.y - my); if (d < 70) { const f = (1 - d / 70) * .14; q.x += mvx * f; q.y += mvy * f; } }
  }
  if (grab) { const q = grab.q; q.x += (mx - q.x) * .5; q.y += (my - q.y) * .5; q.px = q.x; q.py = q.y; }
  const rxS = CW * .505 / (COLS - 1), rxG = gwOf() / (COLS - 1), rx = rxS + (rxG - rxS) * e, ry = CH * 1.03 / (ROWS - 1);
  for (let k = 0; k < Q.iter; k++) for (const P of panels) {
    const pts = P.pts;
    for (let jj = 0; jj < ROWS; jj++) for (let i = 0; i < COLS; i++) { const a = pts[jj * COLS + i]; if (i < COLS - 1) link(a, pts[jj * COLS + i + 1], rx); if (jj < ROWS - 1) link(a, pts[(jj + 1) * COLS + i], ry); }
  }
  drawCloth(e, rx); placeHands(e);
}
function drawCloth(e, rest) {
  cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; cx.clearRect(0, 0, CW, CH);
  const amp = .25 + .55 * e;
  for (const P of panels) {
    const pts = P.pts, dir = P.side ? -1 : 1;
    for (let jj = 0; jj < ROWS - 1; jj++) for (let i = 0; i < COLS - 1; i++) {
      const a = pts[jj * COLS + i], b = pts[jj * COLS + i + 1], c = pts[(jj + 1) * COLS + i + 1], d = pts[(jj + 1) * COLS + i];
      const wdt = ((b.x - a.x) + (c.x - d.x)) / 2 * dir, sq = wdt / rest;
      const s = Math.sin(i * 1.35 + P.side * 1.3 + jj * .04) * amp + (1 - sq) * .9 + (a.x - a.px) * .06 * dir - jj / ROWS * .3;
      const L = Math.max(0, Math.min(1, .5 + .5 * s)), sh = Math.max(0, L - .72) * 2.6;
      cx.fillStyle = cx.strokeStyle = `rgb(${(col2[0] + (col1[0] - col2[0]) * L + hi[0] * sh * .5) | 0},${(col2[1] + (col1[1] - col2[1]) * L + hi[1] * sh * .5) | 0},${(col2[2] + (col1[2] - col2[2]) * L + hi[2] * sh * .5) | 0})`;
      cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.lineTo(c.x, c.y); cx.lineTo(d.x, d.y); cx.closePath(); cx.fill(); if (Q.stroke) { cx.lineWidth = .8; cx.stroke(); }
    }
  }
  /* live fabric grain */
  if (Q.grain) { cx.save(); cx.globalCompositeOperation = "source-atop"; cx.globalAlpha = .09; cx.fillStyle = noisePat;
  cx.translate((Math.random() * 128) | 0, (Math.random() * 128) | 0); cx.fillRect(-128, -128, CW + 256, CH + 256); cx.restore(); }
  /* glowing hem, rail and rings */
  const hc = `rgb(${hi[0]},${hi[1]},${hi[2]})`;
  for (const P of panels) { cx.beginPath(); for (let i = 0; i < COLS; i++) { const q = P.pts[(ROWS - 1) * COLS + i]; i ? cx.lineTo(q.x, q.y) : cx.moveTo(q.x, q.y); } cx.strokeStyle = hc; cx.lineWidth = 3; if (Q.glow) { cx.shadowColor = hc; cx.shadowBlur = 10; } cx.stroke(); cx.shadowBlur = 0; }
  cx.fillStyle = "#aab3c0"; cx.fillRect(0, 0, CW, 7); cx.fillStyle = "rgba(255,255,255,.5)"; cx.fillRect(0, 1, CW, 2);
  cx.strokeStyle = "#cfd6e0"; cx.lineWidth = 2;
  for (const P of panels) for (let i = 0; i < COLS; i += 2) { const q = P.pts[i]; cx.beginPath(); cx.arc(q.x, 9, 4, 0, 6.283); cx.stroke(); }
}
function placeHands(e) {
  const dcp = Math.abs(cp - lastCp); lastCp = cp; const op = Math.max(0, Math.min(1, (.97 - e) / .12));
  handEls.forEach((h, s) => {
    const q = panels[s].pts[HAND_ROW * COLS + COLS - 1], tilt = Math.max(-28, Math.min(28, (q.x - q.px) * 4));
    h.style.transform = `translate(${q.x}px,${q.y}px) rotate(${(s ? 14 : -14) + tilt}deg)`; h.style.opacity = op; h.style.pointerEvents = op > .2 ? "auto" : "none";
    h.classList.toggle("pull", dcp > .0006 || !!grab);
  });
}
cc.addEventListener("pointerdown", e => {
  const rc = cc.getBoundingClientRect(), mx = e.clientX - rc.left, my = e.clientY - rc.top; let best = null, bd = 150;
  for (const P of panels) for (const q of P.pts) { if (q.pin) continue; const d = Math.hypot(q.x - mx, q.y - my); if (d < bd) { bd = d; best = q; } }
  if (best) { grab = {q: best}; cc.setPointerCapture(e.pointerId); unlock("grab", "Curtain puller", "Grabbed the curtain"); }
});
cc.addEventListener("pointerup", () => { grab = null; }); cc.addEventListener("pointercancel", () => { grab = null; });
handEls.forEach(h => h.addEventListener("click", () => { h.classList.remove("wave"); void h.offsetWidth; h.classList.add("wave"); unlock("hand", "High five", "Poked the curtain hands"); setTimeout(() => h.classList.remove("wave"), 700); }));
new IntersectionObserver(([en]) => clothVisible = en.isIntersecting).observe(cur);
buildCloth(); addEventListener("resize", buildCloth);

/* Xylex console: cartridges, screens and the Bug Hunt mini-game */
const scr = $("#scr-in"), gc = $("#game"), gx = gc.getContext("2d");
const SCREENS = {
  studio: `XYLEX GAMING INC.
> Independent game studio, founded 2025
> Based in Abuja, Nigeria
> Founder and technical lead: Joe-Ugwu Fortune
> Focus: original game prototypes, system architecture,
  secure coding, branding, investor pitches, roadmap

[SCREENS.studio]`,
  games: `PROTOTYPES
Original games from concept to launch.
<div class="thumbs"><div class="ph thumb a1" data-img="images/xylex-1.webp" data-hint="Add images/xylex-1.webp"></div><div class="ph thumb a3" data-img="images/xylex-2.webp" data-hint="Add images/xylex-2.webp"></div><div class="ph thumb a5" data-img="images/xylex-3.webp" data-hint="Add images/xylex-3.webp"></div></div>`
};
let gOn = false, bugs = [], pops = [], score = 0, tLeft = 0, best = 0, gAnim = 0;
try { best = +localStorage.getItem("bh") || 0; } catch {}
function selectCart(id) {
  $$(".cart").forEach(b => b.classList.toggle("on", b.dataset.cart === id));
  const s = $("#screen"); s.classList.remove("boot"); void s.offsetWidth; s.classList.add("boot");
  gOn = false; cancelAnimationFrame(gAnim);
  if (id === "arcade") { scr.style.display = "none"; gc.style.display = "block"; startGame(); return; }
  gc.style.display = "none"; scr.style.display = "block";
  if (id === "games") { scr.innerHTML = SCREENS.games; loadPhotos(scr); } else scr.textContent = SCREENS.studio;
}
function startGame() {
  gOn = true; bugs = []; pops = []; score = 0; tLeft = 20; let last = performance.now(), spawn = 0;
  (function loop(now) {
    if (!gOn) return; const dt = Math.min(.05, (now - last) / 1000); last = now; tLeft -= dt; spawn -= dt;
    if (spawn <= 0 && tLeft > 0) { bugs.push({x: 30 + Math.random() * 420, y: 40 + Math.random() * 200, life: 1.4, max: 1.4}); spawn = Math.max(.3, .5 - score / 800); }
    bugs.forEach(b => b.life -= dt); bugs = bugs.filter(b => b.life > 0); pops.forEach(p => p.t += dt); pops = pops.filter(p => p.t < .35);
    gx.fillStyle = "#05070a"; gx.fillRect(0, 0, 480, 270); gx.strokeStyle = c1; gx.globalAlpha = .12; gx.lineWidth = 1;
    for (let x = 0; x < 480; x += 30) { gx.beginPath(); gx.moveTo(x, 0); gx.lineTo(x, 270); gx.stroke(); }
    for (let y = 0; y < 270; y += 30) { gx.beginPath(); gx.moveTo(0, y); gx.lineTo(480, y); gx.stroke(); } gx.globalAlpha = 1;
    for (const b of bugs) {
      const r = 8 + 14 * (b.life / b.max); gx.fillStyle = c2; gx.fillRect(b.x - r, b.y - r, r * 2, r * 2); gx.fillStyle = "#000";
      gx.fillRect(b.x - r * .55, b.y - r * .4, r * .3, r * .3); gx.fillRect(b.x + r * .25, b.y - r * .4, r * .3, r * .3);
      gx.strokeStyle = c2; gx.lineWidth = 2; for (const s of [-1, 1]) for (const o of [-.5, 0, .5]) { gx.beginPath(); gx.moveTo(b.x + s * r, b.y + o * r); gx.lineTo(b.x + s * (r + 7), b.y + o * r * 1.6); gx.stroke(); }
    }
    for (const p of pops) { gx.strokeStyle = c1; gx.globalAlpha = 1 - p.t / .35; gx.lineWidth = 3; gx.beginPath(); gx.arc(p.x, p.y, 8 + p.t * 120, 0, 6.283); gx.stroke(); gx.globalAlpha = 1; }
    gx.fillStyle = c1; gx.font = "14px JetBrains Mono, monospace"; gx.textAlign = "left"; gx.fillText("SCORE " + score + "   TIME " + Math.max(0, tLeft).toFixed(1) + "   BEST " + best, 12, 20);
    if (tLeft <= 0) {
      gOn = false; if (score > best) { best = score; try { localStorage.setItem("bh", best); } catch {} } unlock("arcade", "Bug squasher", "Finished a Bug Hunt round");
      gx.fillStyle = "rgba(0,0,0,.65)"; gx.fillRect(0, 0, 480, 270); gx.fillStyle = c1; gx.textAlign = "center"; gx.font = "22px JetBrains Mono, monospace";
      gx.fillText("ROUND OVER: " + score, 240, 125); gx.font = "14px JetBrains Mono, monospace"; gx.fillText("Click to play again", 240, 155); return;
    }
    gAnim = requestAnimationFrame(loop);
  })(performance.now());
}
gc.addEventListener("pointerdown", e => {
  const r = gc.getBoundingClientRect(), x = (e.clientX - r.left) * 480 / r.width, y = (e.clientY - r.top) * 270 / r.height;
  if (!gOn) { startGame(); return; }
  for (let i = bugs.length - 1; i >= 0; i--) { const b = bugs[i], rr = 14 + 14 * (b.life / b.max); if (Math.abs(b.x - x) < rr && Math.abs(b.y - y) < rr) { bugs.splice(i, 1); score += 10; pops.push({x, y, t: 0}); break; } }
});
$$(".cart").forEach(b => b.addEventListener("click", () => selectCart(b.dataset.cart)));
selectCart("studio");

/* Konami code: god mode */
const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]; let ki = 0;
function godMode() {
  root.classList.add("god"); unlock("konami", "Cheat code", "God mode on"); toast("GOD MODE", "Rainbow overdrive for 6 seconds"); flash();
  dots.forEach(d => { d.vx += (Math.random() - .5) * 20; d.vy += (Math.random() - .5) * 20; });
  setTimeout(() => root.classList.remove("god"), 6000);
}
addEventListener("keydown", e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; ki = k === seq[ki] ? ki + 1 : (k === seq[0] ? 1 : 0);
  if (ki === seq.length) { ki = 0; godMode(); }
});

/* Footer */
const note = $("#note"), em = $("#email");
em.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(em.dataset.email); note.textContent = "Email copied."; }
  catch { note.textContent = "Couldn’t copy. Select the email and copy it by hand."; }
  setTimeout(() => note.textContent = "Click to copy my email.", 2200);
});

/* Performance button and touch wording */
const perfBtn = $("#perf"), pmodes = ["auto", "full", "lite"];
function setPerf(m, user) {
  pmode = m; perfBtn.textContent = m.toUpperCase(); lowCount = 0; lastChange = performance.now();
  try { localStorage.setItem("pm", m); } catch {}
  applyQuality(reduce || m === "lite" ? 0 : m === "full" ? 2 : baseQ);
  if (user) toast("PERFORMANCE", m === "auto" ? "Auto quality on" : m === "full" ? "Full effects" : "Lite mode");
}
perfBtn.addEventListener("click", () => setPerf(pmodes[(pmodes.indexOf(pmode) + 1) % 3], true));
perfBtn.textContent = pmode.toUpperCase();
if (coarse) { const hn = $(".hero .hint"); if (hn) hn.textContent = "Touch and drag through the dots. Tap to burst them. Tap the name for a glitch."; }
ready = true;
