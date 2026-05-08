// Bundesrat Visualization
(function() {
  'use strict';

  // ── Static data ──────────────────────────────────────
  const STATE_NAMES = {
    BW: "Baden-Württemberg",
    BY: "Bayern",
    BE: "Berlin",
    BB: "Brandenburg",
    HB: "Bremen",
    HH: "Hamburg",
    HE: "Hessen",
    MV: "Mecklenburg-Vorpommern",
    NI: "Niedersachsen",
    NW: "Nordrhein-Westfalen",
    RP: "Rheinland-Pfalz",
    SL: "Saarland",
    SN: "Sachsen",
    ST: "Sachsen-Anhalt",
    SH: "Schleswig-Holstein",
    TH: "Thüringen",
    BA: "Baden",
    WB: "Württemberg-Baden",
    WH: "Württemberg-Hohenzollern",
  };
  // Display order: alphabetical by full German name. Matches screenshot.
  const ORDER = ["BW","BY","BE","BB","HB","HH","HE","MV","NI","NW","RP","SL","SN","ST","SH","TH"];
  // For the early period the three pre-1952 states fit in (alphabetical):
  // Baden, ..., Württemberg-Baden, Württemberg-Hohenzollern. We'll insert dynamically.
  const ORDER_HISTORICAL = ["BW","BA","BY","BE","BB","HB","HH","HE","MV","NI","NW","RP","SL","SN","ST","SH","TH","WB","WH"];

  // Party color & display config
  const PARTY = {
    "CDU":               { color: "#111111", label: "CDU",    bloc: "Union" },
    "CSU":               { color: "#111111", label: "CSU",    bloc: "Union" },
    "SPD":               { color: "#d72027", label: "SPD",    bloc: "SPD" },
    "Bündnis 90/Die Grünen": { color: "#1c8a3a", label: "Grüne", bloc: "Grüne" },
    "Bündnis 90":        { color: "#1c8a3a", label: "Bündnis 90", bloc: "Grüne" },
    "Die Grünen":        { color: "#1c8a3a", label: "Grüne",  bloc: "Grüne" },
    "GAL":               { color: "#1c8a3a", label: "GAL",    bloc: "Grüne" },
    "AL":                { color: "#1c8a3a", label: "AL",     bloc: "Grüne" },
    "FDP":               { color: "#f0d300", label: "FDP",    bloc: "FDP" },
    "FDP/DVP":           { color: "#f0d300", label: "FDP/DVP",bloc: "FDP" },
    "FDP/DPS":           { color: "#f0d300", label: "FDP/DPS",bloc: "FDP" },
    "DVP":               { color: "#f0d300", label: "DVP",    bloc: "FDP" },
    "DPS":               { color: "#f0d300", label: "DPS",    bloc: "FDP" },
    "Die Linke":         { color: "#b73491", label: "Linke",  bloc: "Linke" },
    "PDS":               { color: "#b73491", label: "PDS",    bloc: "Linke" },
    "AfD":               { color: "#009ee0", label: "AfD",    bloc: "AfD" },
    "BSW":               { color: "#6b2c91", label: "BSW",    bloc: "BSW" },
    "Freie Wähler":      { color: "#ff7f00", label: "Freie Wähler", bloc: "Freie Wähler" },
    "Zentrum":           { color: "#2b3a67", label: "Zentrum",bloc: "Andere" },
    "KPD":               { color: "#8b0000", label: "KPD",    bloc: "Andere" },
    "BP":                { color: "#1e6091", label: "BP",     bloc: "Andere" },
    "BHE":               { color: "#6a4a2a", label: "BHE",    bloc: "Andere" },
    "GB/BHE":            { color: "#6a4a2a", label: "GB/BHE", bloc: "Andere" },
    "DP":                { color: "#5a4a2a", label: "DP",     bloc: "Andere" },
    "BDV":               { color: "#7a8d5a", label: "BDV",    bloc: "Andere" },
    "CVP":               { color: "#444b8c", label: "CVP",    bloc: "Andere" },
    "SSW":               { color: "#005bbb", label: "SSW",    bloc: "Andere" },
    "STATT Partei":      { color: "#7d5a8a", label: "STATT Partei", bloc: "Andere" },
    "Partei Rechtsstaatlicher Offensive": { color: "#a85d2a", label: "Schill-Partei", bloc: "Andere" },
  };
  const BLOC_ORDER = ["Union","SPD","Grüne","FDP","Linke","AfD","BSW","Freie Wähler","Andere"];
  const BLOC_COLOR = {
    "Union":"#111111","SPD":"#d72027","Grüne":"#1c8a3a","FDP":"#f0d300",
    "Linke":"#b73491","AfD":"#009ee0","BSW":"#6b2c91","Freie Wähler":"#ff7f00","Andere":"#8a8a8a"
  };

  function partyMeta(p) {
    return PARTY[p] || { color: "#8a8a8a", label: p, bloc: "Andere" };
  }

  // ── Data load ────────────────────────────────────────
  const DATA = window.HISTORY_DATA;
  // Resolve "/unchanged" notes by carrying forward
  let prev = null;
  for (const snap of DATA) {
    if (prev) {
      for (const code of Object.keys(snap.states)) {
        const cur = snap.states[code];
        if (cur.note === "/unchanged" || (!cur.note && prev.states[code])) {
          // copy effective_since from prev
          const p = prev.states[code];
          if (p) {
            cur.effective_since = p.effective_since || prev.date;
            cur.effective_note = p.effective_note;
            cur.effective_source = p.effective_source;
          }
        } else if (cur.note && cur.note !== "/unchanged") {
          cur.effective_since = snap.date;
          cur.effective_note = cur.note;
          cur.effective_source = cur.source;
        }
      }
    } else {
      for (const code of Object.keys(snap.states)) {
        const cur = snap.states[code];
        cur.effective_since = snap.date;
        cur.effective_note = cur.note;
        cur.effective_source = cur.source;
      }
    }
    prev = snap;
  }

  // ── Date helpers ─────────────────────────────────────
  const MS_DAY = 86400000;
  function parseDate(s) { return new Date(s + "T00:00:00Z").getTime(); }
  function fmtDate(ms) {
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth()+1).padStart(2,"0");
    const day = String(d.getUTCDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }
  function fmtPretty(ms) {
    const d = new Date(ms);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  }

  const SNAPS = DATA.map(s => ({ ...s, t: parseDate(s.date) }));
  const T_MIN = SNAPS[0].t;
  const T_MAX = SNAPS[SNAPS.length-1].t;

  function snapshotAt(t) {
    // binary search: last snap whose t <= t
    let lo = 0, hi = SNAPS.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo+hi) >> 1;
      if (SNAPS[mid].t <= t) { ans = mid; lo = mid+1; }
      else hi = mid - 1;
    }
    return SNAPS[ans];
  }

  // ── Render half-donut ───────────────────────────────
  const SVG_NS = "http://www.w3.org/2000/svg";
  const VB_W = 1080, VB_H = 620;
  const CX = VB_W/2, CY = 80;
  const R_INNER = 130;
  const R_OUTER = 460;
  const R_LABEL = R_OUTER + 46;
  const R_TICK = R_OUTER + 14;
  const LABEL_PX = 13;

  function updateLabelSizes() {
    const host = document.getElementById("svg-host");
    const w = host.clientWidth;
    if (w <= 0) return;
    const sz = LABEL_PX * VB_W / w;
    for (const lbl of document.querySelectorAll(".state-label")) {
      lbl.style.fontSize = sz + "px";
    }
  }

  function polar(r, ang) {
    return [CX + r * Math.cos(ang), CY + r * Math.sin(ang)];
  }
  function arcPath(r0, r1, a0, a1) {
    const [x0a, y0a] = polar(r1, a0);
    const [x1a, y1a] = polar(r1, a1);
    const [x0b, y0b] = polar(r0, a1);
    const [x1b, y1b] = polar(r0, a0);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return `M ${x0a} ${y0a} A ${r1} ${r1} 0 ${large} 1 ${x1a} ${y1a} L ${x0b} ${y0b} A ${r0} ${r0} 0 ${large} 0 ${x1b} ${y1b} Z`;
  }

  function buildSvg() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB_W} ${VB_H}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "seg-group");
    g.setAttribute("id", "seg-root");
    svg.appendChild(g);
    return svg;
  }

  function render(t) {
    const snap = snapshotAt(t);
    // Determine which states are active (have parties)
    const active = [];
    const orderToUse = (snap.t < parseDate("1952-04-25")) ? ORDER_HISTORICAL : ORDER;
    for (const code of orderToUse) {
      const s = snap.states[code];
      if (!s || !s.p) continue;
      if (s.n <= 0) continue;
      active.push({ code, ...s });
    }
    const totalSeats = active.reduce((sum, s) => sum + s.n, 0);

    // Allocate angles. Half-circle from π (left) to 2π (right) — we rotate to put labels along the bottom.
    // Using angles from π (180°) to 0 (360°), going clockwise via the TOP would be wrong.
    // We want the open end at the top so the screenshot matches: arc spans bottom half.
    // In SVG coords, angle 0 = +x axis, π/2 = +y axis (down). We want angles from π (left) through π/2 (bottom) to 0 (right).
    // That's angles decreasing from π to 0 — but we want segments laid out left-to-right.
    // Use a0 = π - (cumulative/total)*π, going from π to 0.
    const segs = [];
    let cum = 0;
    for (const s of active) {
      const a0 = Math.PI - (cum/totalSeats)*Math.PI;
      cum += s.n;
      const a1 = Math.PI - (cum/totalSeats)*Math.PI;
      segs.push({ ...s, a0, a1 });
    }

    const root = document.getElementById("seg-root");
    while (root.firstChild) root.removeChild(root.firstChild);

    // Outer tick ring — one tick per seat in each state
    const ringR = R_OUTER + 6;
    for (const s of segs) {
      const aLo = Math.min(s.a0, s.a1), aHi = Math.max(s.a0, s.a1);
      const span = aHi - aLo;
      // n ticks centered within the wedge, with small gap between
      for (let i = 0; i < s.n; i++) {
        const tickFrac = 0.65; // tick takes 65% of its slot, gap = 35%
        const slot = span / s.n;
        const ta = aLo + i * slot + slot * (1 - tickFrac) / 2;
        const tb = aLo + i * slot + slot * (1 + tickFrac) / 2;
        const [x0, y0] = polar(ringR, ta);
        const [x1, y1] = polar(ringR, tb);
        const tk = document.createElementNS(SVG_NS, "path");
        tk.setAttribute("d", `M ${x0} ${y0} A ${ringR} ${ringR} 0 0 1 ${x1} ${y1}`);
        tk.setAttribute("fill", "none");
        tk.setAttribute("stroke", "#bdbdbd");
        tk.setAttribute("stroke-width", "5");
        tk.setAttribute("stroke-linecap", "butt");
        tk.setAttribute("class", "seat-tick");
        tk.setAttribute("data-code", s.code);
        root.appendChild(tk);
      }
    }

    for (const s of segs) {
      const stateG = document.createElementNS(SVG_NS, "g");
      stateG.setAttribute("class", "state");
      stateG.setAttribute("data-code", s.code);

      // Equal bands per coalition partner — stacked RADIALLY.
      // First party in list = outermost ring; last party = innermost.
      const k = s.p.length;
      const aLo = Math.min(s.a0, s.a1), aHi = Math.max(s.a0, s.a1);
      for (let i = 0; i < k; i++) {
        // i=0 → outermost band
        const r1 = R_OUTER - (R_OUTER - R_INNER) * (i / k);
        const r0 = R_OUTER - (R_OUTER - R_INNER) * ((i+1) / k);
        const meta = partyMeta(s.p[i]);
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", arcPath(r0, r1, aLo, aHi));
        path.setAttribute("fill", meta.color);
        path.setAttribute("class", "seg");
        stateG.appendChild(path);
      }

      // Thin white concentric dividers between bands
      for (let i = 1; i < k; i++) {
        const r = R_OUTER - (R_OUTER - R_INNER) * (i / k);
        const [x0,y0] = polar(r, aLo);
        const [x1,y1] = polar(r, aHi);
        const arc = document.createElementNS(SVG_NS, "path");
        arc.setAttribute("d", `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`);
        arc.setAttribute("class", "party-divider");
        stateG.appendChild(arc);
      }

      // State divider (between this state and next) — drawn at a1
      const [dx0, dy0] = polar(R_INNER, s.a1);
      const [dx1, dy1] = polar(R_OUTER + 12, s.a1);
      const sd = document.createElementNS(SVG_NS, "line");
      sd.setAttribute("x1", dx0); sd.setAttribute("y1", dy0);
      sd.setAttribute("x2", dx1); sd.setAttribute("y2", dy1);
      sd.setAttribute("class", "state-divider");
      stateG.appendChild(sd);

      // Tick mark at state boundary handled separately below (after this loop)
      // so it can carry both adjacent state codes for hover-highlighting.

      const aMid = (s.a0 + s.a1) / 2;

      // Label
      const [lx, ly] = polar(R_LABEL + 6, aMid);
      const lbl = document.createElementNS(SVG_NS, "text");
      lbl.setAttribute("class", "state-label");
      lbl.setAttribute("x", lx);
      lbl.setAttribute("y", ly);
      lbl.setAttribute("text-anchor", "middle");
      lbl.setAttribute("dominant-baseline", "central");
      lbl.textContent = s.code;
      stateG.appendChild(lbl);

      // Make the whole group hoverable — overlay an invisible wide path
      const hov = document.createElementNS(SVG_NS, "path");
      hov.setAttribute("d", arcPath(R_INNER - 8, R_OUTER + 28, Math.min(s.a0,s.a1), Math.max(s.a0,s.a1)));
      hov.setAttribute("fill", "rgba(0,0,0,0)");
      hov.style.pointerEvents = "all";
      hov.style.cursor = "pointer";
      if (!matchMedia("(pointer: coarse)").matches) {
        hov.addEventListener("mouseenter", (e) => onHover(s, e));
        hov.addEventListener("mousemove", (e) => moveTooltip(e));
        hov.addEventListener("mouseleave", () => onHoverOut());
      }
      hov.addEventListener("click", (e) => { e.stopPropagation(); toggleSelection(s.code); });
      stateG.appendChild(hov);

      root.appendChild(stateG);
    }

    // Boundary ticks between adjacent states (skip the first and last outer edges).
    // Each tick carries both adjacent state codes so hovering either keeps it bright.
    const tickStart = R_OUTER + 14;
    const tickEnd = R_OUTER + 32;
    for (let i = 0; i < segs.length - 1; i++) {
      const aBoundary = segs[i].a1; // == segs[i+1].a0
      const [tx0, ty0] = polar(tickStart, aBoundary);
      const [tx1, ty1] = polar(tickEnd, aBoundary);
      const tk = document.createElementNS(SVG_NS, "line");
      tk.setAttribute("x1", tx0); tk.setAttribute("y1", ty0);
      tk.setAttribute("x2", tx1); tk.setAttribute("y2", ty1);
      tk.setAttribute("class", "state-tick");
      tk.setAttribute("data-left", segs[i].code);
      tk.setAttribute("data-right", segs[i+1].code);
      root.appendChild(tk);
    }

    // Center stack
    const centerDate = document.getElementById("center-date");
    const centerMeta = document.getElementById("center-meta");
    centerDate.textContent = fmtDate(t);
    centerMeta.textContent = `${active.length} Länder · ${totalSeats} seats`;

    // Update timeline fill
    const pct = (t - T_MIN) / (T_MAX - T_MIN) * 100;
    document.getElementById("tl-fill").style.width = pct + "%";
    document.getElementById("tl-thumb").style.left = pct + "%";

    // Update side panel
    renderTotals(active);
    renderSummary(active, totalSeats, snap);

    // Stash for reference
    state.currentSnap = snap;
    state.currentActive = active;

    // Re-apply sticky selection styling after re-render
    applySelectionDecorations();
    renderStateInfo();
    updateLabelSizes();
  }

  function renderTotals(active) {
    // aggregate seats by bloc, equal-share within state coalition (matches segment_meaning)
    const seatsByBloc = {};
    for (const s of active) {
      const k = s.p.length;
      const per = s.n / k; // equal split
      for (const p of s.p) {
        const bloc = partyMeta(p).bloc;
        seatsByBloc[bloc] = (seatsByBloc[bloc] || 0) + per;
      }
    }
    const totalSeats = Object.values(seatsByBloc).reduce((a,b)=>a+b,0);
    const list = document.getElementById("totals-list");
    list.innerHTML = "";
    const sortedBlocs = BLOC_ORDER.filter(b => seatsByBloc[b] !== undefined);
    for (const bloc of sortedBlocs) {
      const v = seatsByBloc[bloc];
      const row = document.createElement("div");
      row.className = "total-row";
      row.style.color = BLOC_COLOR[bloc];
      const sw = document.createElement("div"); sw.className="swatch"; sw.style.background = BLOC_COLOR[bloc];
      const nm = document.createElement("div"); nm.className="name"; nm.textContent = bloc; nm.style.color = "var(--color-fg)";
      const val = document.createElement("div"); val.className="value"; val.style.color = "var(--color-fg)";
      // show with up to 1 decimal (because of equal-split fractional seats)
      const vRound = Math.round(v*10)/10;
      val.textContent = (vRound === Math.floor(vRound) ? vRound.toFixed(0) : vRound.toFixed(1));
      const bar = document.createElement("div"); bar.className="bar";
      const fill = document.createElement("i");
      fill.style.width = (v/totalSeats*100).toFixed(1) + "%";
      bar.appendChild(fill);
      row.appendChild(sw); row.appendChild(nm); row.appendChild(val); row.appendChild(bar);
      list.appendChild(row);
    }
  }

  function renderSummary(active, totalSeats, snap) {
    const el = document.getElementById("summary");
    if (!el) return;
    const majority = Math.floor(totalSeats / 2) + 1;
    el.innerHTML = `
      <span class="big">${totalSeats}<sup>seats total</sup></span>
      <div>${active.length} Länder &middot; Majority from ${majority} seats</div>
    `;
  }

  // ── Tooltip ──────────────────────────────────────────
  const tooltip = document.getElementById("tooltip");
  function onHover(s, e) {
    const stateGroups = document.querySelectorAll(".state");
    const segRoot = document.getElementById("seg-root");
    segRoot.classList.add("dim");
    segRoot.setAttribute("data-hovered", s.code);
    stateGroups.forEach(g => g.classList.remove("hover"));
    const me = e.currentTarget.parentNode;
    me.classList.add("hover");
    // highlight matching seat ticks
    document.querySelectorAll(".seat-tick").forEach(t => {
      t.classList.toggle("hover", t.getAttribute("data-code") === s.code);
    });
    // highlight both boundary ticks adjacent to this state
    document.querySelectorAll(".state-tick").forEach(t => {
      const adj = t.getAttribute("data-left") === s.code || t.getAttribute("data-right") === s.code;
      t.classList.toggle("hover", adj);
    });

    const partiesHtml = s.p.map(p => {
      const m = partyMeta(p);
      return `<div class="tt-row"><span class="tt-swatch" style="background:${m.color}"></span><span class="tt-pname">${m.label}</span></div>`;
    }).join("");
    const since = s.effective_since ? fmtPretty(parseDate(s.effective_since)) : "";
    const noteRaw = s.effective_note;
    const noteHtml = (noteRaw && noteRaw !== "/unchanged") ? `<div class="tt-note">${escapeHtml(noteRaw)}</div>` : "";
    tooltip.innerHTML = `
      <div class="tt-name">${STATE_NAMES[s.code] || s.code}</div>
      <div class="tt-sub">${s.code} · ${s.n} seats${since ? " · since " + since : ""}</div>
      <div class="tt-parties">${partiesHtml}</div>
      ${noteHtml}
    `;
    tooltip.classList.add("show");
    moveTooltip(e);
  }
  function moveTooltip(e) {
    const wrap = document.getElementById("chart-wrap");
    const r = wrap.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    tooltip.style.left = x + "px";
    tooltip.style.top = (y - 14) + "px";
  }
  function onHoverOut() {
    const segRoot = document.getElementById("seg-root");
    segRoot.classList.remove("dim");
    segRoot.removeAttribute("data-hovered");
    document.querySelectorAll(".state").forEach(g => g.classList.remove("hover"));
    document.querySelectorAll(".seat-tick.hover").forEach(t => t.classList.remove("hover"));
    document.querySelectorAll(".state-tick.hover").forEach(t => t.classList.remove("hover"));
    tooltip.classList.remove("show");
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  // ── Timeline ─────────────────────────────────────────
  const state = {
    t: T_MIN,
    playing: false,
    speed: 0.5,           // years per second when playing
    rafId: null,
    lastTs: 0,
    currentSnap: null,
    currentActive: [],
    selectedCode: null,
  };

  function setT(t) {
    state.t = Math.max(T_MIN, Math.min(T_MAX, t));
    render(state.t);
  }

  // ── Selection (click-to-pin) ─────────────────────────
  function toggleSelection(code) {
    if (state.selectedCode === code) {
      clearSelection();
    } else {
      state.selectedCode = code;
      // If hovering, drop the hover state so styling derives from selection
      onHoverOut();
      applySelectionDecorations();
      renderStateInfo();
    }
  }
  function clearSelection() {
    state.selectedCode = null;
    applySelectionDecorations();
    renderStateInfo();
  }
  function applySelectionDecorations() {
    const segRoot = document.getElementById("seg-root");
    if (!segRoot) return;
    const sel = state.selectedCode;
    if (!sel) {
      segRoot.classList.remove("selected");
      segRoot.removeAttribute("data-selected");
      document.querySelectorAll(".state.selected").forEach(g => g.classList.remove("selected"));
      document.querySelectorAll(".seat-tick.selected").forEach(t => t.classList.remove("selected"));
      document.querySelectorAll(".state-tick.selected").forEach(t => t.classList.remove("selected"));
      return;
    }
    // Only show selection styling if that state is present in current snapshot
    const present = state.currentActive.some(s => s.code === sel);
    if (!present) {
      segRoot.classList.remove("selected");
      segRoot.removeAttribute("data-selected");
      return;
    }
    segRoot.classList.add("selected");
    segRoot.setAttribute("data-selected", sel);
    document.querySelectorAll(".state").forEach(g => {
      g.classList.toggle("selected", g.getAttribute("data-code") === sel);
    });
    document.querySelectorAll(".seat-tick").forEach(t => {
      t.classList.toggle("selected", t.getAttribute("data-code") === sel);
    });
    document.querySelectorAll(".state-tick").forEach(t => {
      const adj = t.getAttribute("data-left") === sel || t.getAttribute("data-right") === sel;
      t.classList.toggle("selected", adj);
    });
  }

  // Find indices of snapshots that record any change for the selected state —
  // i.e. the raw snapshot has a note for that state that isn't "/unchanged".
  // (Also include the first snapshot in which the state appears.)
  function changeSnapshotIndicesForState(code) {
    const out = [];
    let seenBefore = false;
    for (let i = 0; i < SNAPS.length; i++) {
      const raw = DATA[i].states[code];
      if (!raw) { continue; }
      const hasNote = raw.note && raw.note !== "/unchanged";
      if (!seenBefore || hasNote) out.push(i);
      seenBefore = true;
    }
    return out;
  }

  function jumpToStateChange(direction) {
    const code = state.selectedCode;
    if (!code) return;
    const idxs = changeSnapshotIndicesForState(code);
    if (!idxs.length) return;
    // current snapshot index
    let curIdx = 0;
    for (let i = 0; i < SNAPS.length; i++) {
      if (SNAPS[i].t <= state.t) curIdx = i; else break;
    }
    let target = null;
    if (direction > 0) {
      for (const i of idxs) { if (i > curIdx) { target = i; break; } }
    } else {
      // previous: largest index < curIdx (so we always *move*); if none, do nothing
      for (let k = idxs.length - 1; k >= 0; k--) {
        if (idxs[k] < curIdx) { target = idxs[k]; break; }
      }
    }
    if (target == null) return;
    setPlaying(false);
    setT(SNAPS[target].t);
  }

  function renderStateInfo() {
    const panel = document.getElementById("state-info-panel");
    const totalsPanel = document.getElementById("totals-panel");
    if (!panel) return;
    const code = state.selectedCode;
    if (!code) { panel.hidden = true; if (totalsPanel) totalsPanel.hidden = false; return; }
    const cur = state.currentActive.find(s => s.code === code);
    if (!cur) { panel.hidden = true; if (totalsPanel) totalsPanel.hidden = false; return; }
    panel.hidden = false;
    if (totalsPanel) totalsPanel.hidden = true;

    document.getElementById("si-name").textContent = STATE_NAMES[code] || code;
    const since = cur.effective_since ? fmtPretty(parseDate(cur.effective_since)) : "";
    document.getElementById("si-sub").textContent = `${code} · ${cur.n} seats${since ? " · since " + since : ""}`;

    const partiesEl = document.getElementById("si-parties");
    partiesEl.innerHTML = cur.p.map(p => {
      const m = partyMeta(p);
      return `<div class="si-row"><span class="si-swatch" style="background:${m.color}"></span><span>${m.label}</span></div>`;
    }).join("");

    const noteEl = document.getElementById("si-note");
    const noteRaw = cur.effective_note;
    const sourceUrl = cur.effective_source;
    if (noteRaw && noteRaw !== "/unchanged") {
      const safeNote = escapeHtml(noteRaw);
      const link = sourceUrl
        ? ` <a class="si-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">[source]</a>`
        : "";
      noteEl.innerHTML = safeNote + link;
      noteEl.hidden = false;
    } else if (sourceUrl) {
      noteEl.innerHTML = `<a class="si-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">[source]</a>`;
      noteEl.hidden = false;
    } else {
      noteEl.hidden = true;
    }

    // Prev / next change buttons
    const idxs = changeSnapshotIndicesForState(code);
    let curIdx = 0;
    for (let i = 0; i < SNAPS.length; i++) {
      if (SNAPS[i].t <= state.t) curIdx = i; else break;
    }
    let prev = null, next = null;
    for (const i of idxs) { if (i > curIdx) { next = i; break; } }
    for (let k = idxs.length - 1; k >= 0; k--) {
      if (idxs[k] < curIdx) { prev = idxs[k]; break; }
    }
    const prevBtn = document.getElementById("si-prev");
    const nextBtn = document.getElementById("si-next");
    const prevLbl = document.getElementById("si-prev-date");
    const nextLbl = document.getElementById("si-next-date");
    prevBtn.disabled = (prev == null);
    nextBtn.disabled = (next == null);
    prevLbl.textContent = (prev != null) ? fmtPretty(SNAPS[prev].t) : "—";
    nextLbl.textContent = (next != null) ? fmtPretty(SNAPS[next].t) : "—";
  }

  // play/pause loop
  function tick(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = (ts - state.lastTs) / 1000; // seconds
    state.lastTs = ts;
    // speed = years per second
    const dMs = state.speed * 365.25 * MS_DAY * dt;
    let nt = state.t + dMs;
    if (nt >= T_MAX) {
      nt = T_MAX;
      setPlaying(false);
    }
    setT(nt);
    if (state.playing) state.rafId = requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    state.playing = p;
    state.lastTs = 0;
    document.getElementById("btn-play").innerHTML = p ? ICON.pause : ICON.play;
    if (p) {
      if (state.t >= T_MAX - 1000) state.t = T_MIN;
      state.rafId = requestAnimationFrame(tick);
    } else if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }

  function jumpToChange(direction) {
    // find current snapshot index
    let idx = 0;
    for (let i = 0; i < SNAPS.length; i++) {
      if (SNAPS[i].t <= state.t) idx = i; else break;
    }
    if (direction > 0) {
      idx = Math.min(SNAPS.length - 1, idx + 1);
    } else {
      // if we're partway between snaps, jump to current; if we're at the snap, go back one
      if (SNAPS[idx].t === state.t || SNAPS[idx].t > state.t - MS_DAY*0.5) idx = Math.max(0, idx - 1);
    }
    setT(SNAPS[idx].t);
  }

  // SVG icons
  const ICON = {
    play:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
    prev:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
    next:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 6v12l8.5-6z"/></svg>',
    skipStart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 5h2v14H5zM19 5l-12 7 12 7z"/></svg>',
    skipEnd:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 5h2v14h-2zM5 5v14l12-7z"/></svg>',
  };

  // wire up
  function init() {
    const stage = document.getElementById("svg-host");
    const svg = buildSvg();
    stage.appendChild(svg);

    new ResizeObserver(updateLabelSizes).observe(stage);

    // controls icons
    document.getElementById("btn-skip-start").innerHTML = ICON.skipStart;
    document.getElementById("btn-prev").innerHTML = ICON.prev;
    document.getElementById("btn-play").innerHTML = ICON.play;
    document.getElementById("btn-next").innerHTML = ICON.next;
    document.getElementById("btn-skip-end").innerHTML = ICON.skipEnd;

    document.getElementById("btn-play").addEventListener("click", () => setPlaying(!state.playing));
    document.getElementById("btn-prev").addEventListener("click", () => { setPlaying(false); jumpToChange(-1); });
    document.getElementById("btn-next").addEventListener("click", () => { setPlaying(false); jumpToChange(+1); });
    document.getElementById("btn-skip-start").addEventListener("click", () => { setPlaying(false); setT(T_MIN); });
    document.getElementById("btn-skip-end").addEventListener("click", () => { setPlaying(false); setT(T_MAX); });

    // Selected-state info panel buttons
    document.getElementById("si-close").addEventListener("click", clearSelection);
    document.getElementById("si-prev").addEventListener("click", () => jumpToStateChange(-1));
    document.getElementById("si-next").addEventListener("click", () => jumpToStateChange(+1));

    // Click anywhere on the chart wrap that's NOT a state wedge → deselect
    document.getElementById("chart-wrap").addEventListener("click", (e) => {
      // The state hover overlay stops propagation when handled, so any click
      // that bubbles up here is on the background.
      clearSelection();
    });

    // scrub interactions
    const scrub = document.getElementById("tl-scrub");
    let dragging = false;
    function tFromEvt(e) {
      const r = scrub.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const f = Math.max(0, Math.min(1, x / r.width));
      return T_MIN + f * (T_MAX - T_MIN);
    }
    scrub.addEventListener("pointerdown", (e) => {
      dragging = true;
      scrub.classList.add("dragging");
      scrub.setPointerCapture(e.pointerId);
      setPlaying(false);
      setT(tFromEvt(e));
    });
    scrub.addEventListener("pointermove", (e) => {
      if (dragging) setT(tFromEvt(e));
      // hover label
      const r = scrub.getBoundingClientRect();
      const x = e.clientX - r.left;
      const f = Math.max(0, Math.min(1, x / r.width));
      const t = T_MIN + f * (T_MAX - T_MIN);
      const hov = document.getElementById("tl-hover");
      hov.textContent = fmtDate(t);
      hov.style.left = (f * 100) + "%";
      hov.classList.add("show");
    });
    scrub.addEventListener("pointerleave", () => {
      document.getElementById("tl-hover").classList.remove("show");
    });
    scrub.addEventListener("pointerup", (e) => {
      dragging = false;
      scrub.classList.remove("dragging");
    });
    scrub.addEventListener("pointercancel", () => {
      dragging = false;
      scrub.classList.remove("dragging");
    });

    // ticks for each change
    const ticks = document.getElementById("tl-ticks");
    for (const snap of SNAPS) {
      const f = (snap.t - T_MIN) / (T_MAX - T_MIN);
      const tk = document.createElement("div");
      tk.className = "tl-tick";
      tk.style.left = (f*100) + "%";
      ticks.appendChild(tk);
    }

    // year axis
    const axis = document.getElementById("tl-axis");
    const startYear = new Date(T_MIN).getUTCFullYear();
    const endYear = new Date(T_MAX).getUTCFullYear();
    const step = window.innerWidth <= 600 ? 10 : 5;
    for (let y = Math.ceil(startYear/step)*step; y <= endYear; y += step) {
      const t = parseDate(`${y}-01-01`);
      if (t < T_MIN || t > T_MAX) continue;
      const f = (t - T_MIN) / (T_MAX - T_MIN);
      const lbl = document.createElement("div");
      lbl.className = "yr" + (y % 10 === 0 ? " major" : "");
      lbl.style.left = (f*100) + "%";
      lbl.textContent = y;
      axis.appendChild(lbl);
    }

    // keyboard
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); setPlaying(!state.playing); }
      else if (e.code === "ArrowLeft") { setPlaying(false); jumpToChange(-1); }
      else if (e.code === "ArrowRight") { setPlaying(false); jumpToChange(+1); }
      else if (e.code === "Home") { setPlaying(false); setT(T_MIN); }
      else if (e.code === "End") { setPlaying(false); setT(T_MAX); }
    });

    setT(T_MAX);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
