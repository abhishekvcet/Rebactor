"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Hero story for the AI-Powered DevOps Failure Assistant.
 * A commit ships, a test fails, a webhook raises the alarm, the AI reads the
 * logs and recalls similar incidents (RAG), ranks root causes, notifies the
 * team, and the pipeline goes green. Loops every 18s; chapters are clickable.
 */

const VW = 900;
const VH = 480;
const CYCLE = 18;

const BG = "#04060A";
const INK = [230, 234, 242];
const MUTED = [107, 117, 134];
const ICE = [139, 200, 255];
const EMBER = [255, 122, 89];
const WHITE = [255, 255, 255];

const SANS = '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

const CHAPTERS = [
  { at: 0, title: "Code ships", body: "A commit enters the pipeline: build, test, deploy." },
  { at: 3.4, title: "A stage fails", body: "The answer is buried in thousands of log lines, and the clock is running." },
  { at: 5.2, title: "A webhook raises the alarm", body: "GitHub Actions sends the failure to Rebactor instantly via webhook." },
  { at: 6.6, title: "AI reads, then remembers", body: "An LLM summarizes the logs and retrieves similar past incidents with RAG." },
  { at: 9.0, title: "Root causes, ranked", body: "Each cause gets a confidence score and a concrete fix." },
  { at: 12.5, title: "The team hears first", body: "Slack and email alerts go out with the diagnosis attached." },
  { at: 14.6, title: "Back to green", body: "The fix lands and the pipeline recovers in minutes, not hours." },
];

const NOISE = [
  "ERR! code ELIFECYCLE", "Error: ECONNRESET", "at auth.js:88", "exit code 1",
  "WARN deprecated", "TypeError: undefined", "FAIL auth.spec.ts", "ERR! 500 Server Error",
];

// helpers
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);
const rgba = (c: number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const chapterAt = (t: number) => {
  let idx = 0;
  CHAPTERS.forEach((c, i) => { if (t >= c.at) idx = i; });
  return idx;
};

type RowState = "idle" | "running" | "done" | "failed";

export function FailureStoryHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startRef = useRef(0);
  const drawRef = useRef<((t: number) => void) | null>(null);
  const reducedRef = useRef(false);
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = reduced;

    let W = 0, H = 0, dpr = 1, raf = 0, lastChapter = -1;
    startRef.current = performance.now();

    // Preload Rebactor Logo image for the central AI core
    const logoImg = new Image();
    logoImg.src = "/rebactor-logo.png";
    let logoLoaded = false;
    logoImg.onload = () => {
      logoLoaded = true;
    };

    const T = (s: string, x: number, y: number, font: string, col: string, align: CanvasTextAlign = "left") => {
      ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align; ctx.fillText(s, x, y);
    };
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    };
    const check = (sc: number, col: string, q = 1) => {
      const A = [-5 * sc, 0.5 * sc], B = [-1.5 * sc, 4 * sc], C = [5.5 * sc, -4 * sc];
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(A[0], A[1]);
      if (q < 0.4) { const k = q / 0.4; ctx.lineTo(lerp(A[0], B[0], k), lerp(A[1], B[1], k)); }
      else { const k = (q - 0.4) / 0.6; ctx.lineTo(B[0], B[1]); ctx.lineTo(lerp(B[0], C[0], k), lerp(B[1], C[1], k)); }
      ctx.stroke();
    };
    const icon = (cx: number, cy: number, s: RowState, since: number, t: number) => {
      ctx.save(); ctx.translate(cx, cy);
      const acc = s === "failed" ? EMBER : ICE;
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = s === "done" || s === "failed" ? rgba(acc, 0.12) : "#0A0F16"; ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = s === "idle" ? rgba(WHITE, 0.14) : s === "running" ? rgba(WHITE, 0.12) : rgba(acc, 0.9);
      ctx.stroke();
      if (s === "idle") { ctx.fillStyle = rgba(MUTED, 0.6); ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill(); }
      if (s === "running") {
        const a = t * 5; ctx.strokeStyle = rgba(ICE, 0.95); ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(0, 0, 10, a, a + 1.7); ctx.stroke();
      }
      if (s === "done") check(0.62, rgba(ICE, 1), clamp((t - since) / 0.3));
      if (s === "failed") {
        const d = 3.6 * easeOut(clamp((t - since) / 0.25));
        ctx.strokeStyle = rgba(EMBER, 1); ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-d, -d); ctx.lineTo(d, d); ctx.moveTo(d, -d); ctx.lineTo(-d, d); ctx.stroke();
      }
      ctx.restore();
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      const s = Math.min(W / VW, H / VH);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, (dpr * (W - VW * s)) / 2, (dpr * (H - VH * s)) / 2);

      const ga = seg(t, 0, 0.6) * (1 - seg(t, 17.2, 18));
      const awake = seg(t, 5.2, 6.2);
      const failF = seg(t, 3.4, 3.8) * (1 - seg(t, 14.0, 14.9));
      const CX = 470, CY = 250;

      // dot grid
      for (let gx = 14; gx < VW; gx += 28) for (let gy = 14; gy < VH; gy += 28) {
        const d = Math.hypot(gx - VW / 2, gy - VH / 2) / 520;
        const a = 0.08 * (1 - clamp(d)) * ga;
        if (a > 0.004) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(gx, gy, 1.2, 1.2); }
      }
      // ambient glows: ember at the failing stage, ice at the core
      let g = ctx.createRadialGradient(145, 226, 0, 145, 226, 200);
      g.addColorStop(0, rgba(EMBER, 0.14 * failF * ga)); g.addColorStop(1, rgba(EMBER, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      g = ctx.createRadialGradient(CX, CY, 0, CX, CY, 280);
      g.addColorStop(0, rgba(ICE, 0.14 * awake * ga)); g.addColorStop(1, rgba(ICE, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

      ctx.globalAlpha = ga;

      // ---------- pipeline column ----------
      T("Pipeline", 40, 110, `500 12px ${SANS}`, rgba(MUTED, 1));
      const rows: { name: string; y: number; s: RowState; since: number; meta: string }[] = [
        { name: "Build", y: 130, s: t < 0.8 ? "idle" : t < 2.0 ? "running" : "done", since: t < 2.0 ? 0.8 : 2.0, meta: "18s" },
        {
          name: "Test", y: 200,
          s: t < 2.0 ? "idle" : t < 3.4 ? "running" : t < 14.6 ? "failed" : t < 15.4 ? "running" : "done",
          since: t < 3.4 ? 2.0 : t < 14.6 ? 3.4 : t < 15.4 ? 14.6 : 15.4,
          meta: t < 14.6 ? "exit 1" : "42/42",
        },
        { name: "Deploy", y: 270, s: t < 15.4 ? "idle" : t < 16.4 ? "running" : "done", since: t < 16.4 ? 15.4 : 16.4, meta: "v2.14" },
      ];
      // connectors
      [0, 1].forEach((i) => {
        const done = rows[i].s === "done";
        ctx.strokeStyle = done ? rgba(ICE, 0.7) : rgba(WHITE, 0.08); ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(145, rows[i].y + 52); ctx.lineTo(145, rows[i + 1].y); ctx.stroke();
      });
      // git push dot
      if (t < 0.9) {
        const k = easeInOut(seg(t, 0, 0.8));
        ctx.save(); ctx.shadowColor = rgba(ICE, 0.9); ctx.shadowBlur = 12;
        ctx.fillStyle = rgba(mix(ICE, INK, 0.5), 1);
        ctx.beginPath(); ctx.arc(145, lerp(70, 128, k), 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        T("git push", 156, lerp(74, 132, k), `400 11px ${MONO}`, rgba(MUTED, 1 - k * 0.6));
      }
      rows.forEach((r) => {
        const failed = r.s === "failed";
        let dx = 0;
        if (r.name === "Test" && t >= 3.4 && t < 3.95) dx = Math.sin((t - 3.4) * 70) * 3 * (1 - (t - 3.4) / 0.55);
        const x = 40 + dx;
        ctx.save();
        if (failed) { ctx.shadowColor = rgba(EMBER, 0.35); ctx.shadowBlur = 24; }
        rr(x, r.y, 210, 52, 12);
        ctx.fillStyle = failed ? rgba(EMBER, 0.08) : rgba(WHITE, 0.03); ctx.fill();
        ctx.restore();
        rr(x + 0.5, r.y + 0.5, 209, 51, 12);
        ctx.lineWidth = 1;
        ctx.strokeStyle = failed ? rgba(EMBER, 0.55) : r.s === "done" ? rgba(ICE, 0.25) : r.s === "running" ? rgba(WHITE, 0.16) : rgba(WHITE, 0.07);
        ctx.stroke();
        icon(x + 26, r.y + 26, r.s, r.since, t);
        T(r.name, x + 48, r.y + 31, `500 13px ${SANS}`, r.s === "idle" ? rgba(MUTED, 1) : failed ? rgba(EMBER, 1) : rgba(INK, 0.92));
        if (r.s === "done" || failed) T(r.meta, x + 196, r.y + 30, `400 11px ${MONO}`, failed ? rgba(EMBER, 1) : rgba(MUTED, 1), "right");
      });

      // noisy log lines around the failure
      NOISE.forEach((line, k) => {
        const a0 = 3.4 + k * 0.08;
        const a = seg(t, a0, a0 + 0.25) * (1 - seg(t, 5.0, 5.6)) * (0.3 + 0.3 * (0.5 + 0.5 * Math.sin(t * 14 + k * 3)));
        if (a <= 0.01) return;
        T(line, 262 + rnd(k) * 14, 142 + k * 22 + Math.sin(t * 3 + k) * 2, `400 10px ${MONO}`, rgba(EMBER, a));
      });

      // ---------- manual triage vs assistant timer ----------
      const manA = seg(t, 3.4, 3.8) * (1 - seg(t, 14.5, 15.1));
      const aiA = seg(t, 14.6, 15.2);
      if (manA > 0) {
        ctx.globalAlpha = ga * manA;
        T("Manual triage", 40, 392, `500 12px ${SANS}`, rgba(MUTED, 1));
        T(`${Math.round(42 * easeOut(seg(t, 3.4, 5.4)))} min`, 40, 432, `600 36px ${SANS}`, rgba(EMBER, 1));
      }
      if (aiA > 0) {
        ctx.globalAlpha = ga * aiA;
        T("With the assistant", 40, 392, `500 12px ${SANS}`, rgba(MUTED, 1));
        T("2 min", 40, 432, `600 36px ${SANS}`, rgba(ICE, 1));
      }
      ctx.globalAlpha = ga;

      // ---------- webhook ----------
      const P0 = [252, 226], PC = [340, 226], P1 = [CX - 46, CY];
      const qb = (u: number) => [
        (1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * PC[0] + u * u * P1[0],
        (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * PC[1] + u * u * P1[1],
      ];
      ctx.strokeStyle = rgba(WHITE, 0.08); ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.quadraticCurveTo(PC[0], PC[1], P1[0], P1[1]); ctx.stroke();
      ctx.setLineDash([]);
      if (t >= 5.2) T("webhook", 336, 212, `400 10px ${MONO}`, rgba(MUTED, seg(t, 5.2, 5.7)), "center");
      const wk = seg(t, 5.2, 6.4);
      if (wk > 0 && wk < 1) {
        const col = mix(EMBER, ICE, wk);
        for (let i = 0; i < 6; i++) {
          const p = qb(clamp(easeInOut(wk) - i * 0.03));
          ctx.fillStyle = rgba(col, 0.5 * (1 - i / 6)); ctx.beginPath(); ctx.arc(p[0], p[1], 3 - i * 0.35, 0, Math.PI * 2); ctx.fill();
        }
        const h = qb(easeInOut(wk));
        ctx.save(); ctx.shadowColor = rgba(col, 0.9); ctx.shadowBlur = 14; ctx.fillStyle = rgba(mix(col, INK, 0.5), 1);
        ctx.beginPath(); ctx.arc(h[0], h[1], 3.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      // log tokens streaming into the core
      const stream = seg(t, 6.6, 6.9) * (1 - seg(t, 9.0, 9.4));
      if (stream > 0) {
        for (let i = 0; i < 14; i++) {
          const u = (((t - 6.6) * 0.9 + i / 14) % 1 + 1) % 1;
          const p = qb(u);
          const yo = (rnd(i + 20) - 0.5) * 36 * (1 - u);
          ctx.fillStyle = rgba(mix(EMBER, ICE, u), stream * Math.sin(u * Math.PI) * 0.9);
          ctx.fillRect(p[0] - 3, p[1] + yo, 6, 1.6);
        }
      }

      // ---------- AI core ----------
      ctx.beginPath(); ctx.arc(CX, CY, 46, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(ICE, 0.18 + 0.45 * awake); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.save(); ctx.setLineDash([2, 6]); ctx.lineDashOffset = -t * 8;
      ctx.beginPath(); ctx.arc(CX, CY, 58, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(ICE, 0.25 * awake); ctx.stroke(); ctx.restore();
      if (t > 6.6 && t < 9.4) {
        const k = ((t - 6.6) % 1.4) / 1.4;
        ctx.beginPath(); ctx.arc(CX, CY, 34 + k * 56, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(ICE, (1 - k) * 0.3 * stream); ctx.lineWidth = 1; ctx.stroke();
      }
      // Central node background with glow
      ctx.beginPath(); ctx.arc(CX, CY, 32, 0, Math.PI * 2); ctx.fillStyle = "#020408"; ctx.fill();
      const cg = ctx.createRadialGradient(CX - 8, CY - 10, 2, CX, CY, 32);
      cg.addColorStop(0, rgba(WHITE, 0.4 * awake)); cg.addColorStop(1, rgba(ICE, 0.3 * awake));
      ctx.save(); ctx.shadowColor = rgba(ICE, 0.6 * awake); ctx.shadowBlur = 24;
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(CX, CY, 32, 0, Math.PI * 2); ctx.fill(); ctx.restore();

      // Draw Rebactor Shield Logo inside the core
      ctx.save();
      ctx.translate(CX, CY);
      if (logoLoaded && logoImg.complete) {
        ctx.drawImage(logoImg, -20, -20, 40, 40);
      } else {
        // Fallback vector shield if image is still loading
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(13, -6);
        ctx.lineTo(10, 10);
        ctx.lineTo(0, 15);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-13, -6);
        ctx.closePath();
        ctx.fillStyle = awake > 0.05 ? rgba(ICE, 0.95 * awake) : rgba(MUTED, 0.6);
        ctx.fill();
      }
      ctx.restore();

      T("Rebactor AI Assistant", CX, 372, `600 13px ${SANS}`, rgba(INK, 0.45 + 0.55 * awake), "center");

      // RAG memory orbit
      if (awake > 0) {
        T("RAG memory, 128 past incidents", CX, 128, `400 11px ${MONO}`, rgba(MUTED, awake), "center");
        const matches: Record<number, number> = { 2: 0, 6: 1, 9: 2 };
        for (let k = 0; k < 12; k++) {
          const ang = (k / 12) * Math.PI * 2 + t * 0.12 - Math.PI / 2;
          const nx = CX + Math.cos(ang) * 92, ny = CY + Math.sin(ang) * 92;
          const order = matches[k];
          const hl = order === undefined ? 0 : seg(t, 7.0 + order * 0.5, 7.5 + order * 0.5) * (1 - 0.6 * seg(t, 12.5, 13.5));
          if (hl > 0) {
            ctx.strokeStyle = rgba(ICE, 0.4 * hl); ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(CX + Math.cos(ang) * 36, CY + Math.sin(ang) * 36); ctx.lineTo(nx, ny); ctx.stroke();
          }
          ctx.save();
          if (hl > 0) { ctx.shadowColor = rgba(ICE, 0.9 * hl); ctx.shadowBlur = 12; }
          ctx.fillStyle = rgba(mix(MUTED, ICE, hl), (0.35 + 0.1 * Math.sin(t + k)) * awake + 0.65 * hl);
          ctx.beginPath(); ctx.arc(nx, ny, 3 + 3 * hl, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
      }

      // ---------- link to result ----------
      ctx.strokeStyle = rgba(WHITE, 0.08); ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(CX + 48, CY); ctx.lineTo(640, CY); ctx.stroke(); ctx.setLineDash([]);
      const lk = seg(t, 9.0, 9.7);
      if (lk > 0 && lk < 1) {
        ctx.save(); ctx.shadowColor = rgba(ICE, 0.9); ctx.shadowBlur = 12; ctx.fillStyle = rgba(mix(ICE, INK, 0.5), 1);
        ctx.beginPath(); ctx.arc(lerp(CX + 48, 640, easeInOut(lk)), CY, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }

      // ---------- diagnosis card ----------
      const ck = easeOut(seg(t, 9.0, 9.7));
      if (ck > 0) {
        const x = 640 + (1 - ck) * 24, y = 88, w = 230, h = 306;
        ctx.save(); ctx.globalAlpha = ga * ck;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
        const bg = ctx.createLinearGradient(0, y, 0, y + h);
        bg.addColorStop(0, "rgba(17,23,33,0.97)"); bg.addColorStop(1, "rgba(8,11,16,0.98)");
        ctx.fillStyle = bg; rr(x, y, w, h, 16); ctx.fill(); ctx.restore();
        rr(x + 0.5, y + 0.5, w - 1, h - 1, 16); ctx.strokeStyle = rgba(WHITE, 0.08); ctx.lineWidth = 1; ctx.stroke();
        const eg = ctx.createLinearGradient(x, 0, x + w, 0);
        eg.addColorStop(0, rgba(WHITE, 0)); eg.addColorStop(0.5, rgba(ICE, 0.5)); eg.addColorStop(1, rgba(WHITE, 0));
        ctx.strokeStyle = eg; ctx.beginPath(); ctx.moveTo(x + 20, y + 0.5); ctx.lineTo(x + w - 20, y + 0.5); ctx.stroke();

        T("Diagnosis", x + 20, y + 30, `500 11px ${SANS}`, rgba(MUTED, 1));
        // classification chip
        ctx.globalAlpha = ga * ck * seg(t, 9.2, 9.6);
        ctx.font = `500 12px ${SANS}`;
        const cw = ctx.measureText("Dependency failure").width + 30;
        rr(x + 20, y + 42, cw, 24, 12); ctx.fillStyle = rgba(EMBER, 0.12); ctx.fill(); ctx.strokeStyle = rgba(EMBER, 0.4); ctx.stroke();
        ctx.fillStyle = rgba(EMBER, 1); ctx.beginPath(); ctx.arc(x + 32, y + 54, 3, 0, Math.PI * 2); ctx.fill();
        T("Dependency failure", x + 42, y + 58, `500 12px ${SANS}`, rgba(INK, 0.95));
        ctx.globalAlpha = ga * ck;

        // typed summary
        const L1 = "npm install pulled axios 1.7.0,";
        const L2 = "which breaks the token refresh call.";
        const n = Math.floor((L1.length + L2.length) * seg(t, 9.5, 10.7));
        T(L1.slice(0, n), x + 20, y + 92, `400 12px ${SANS}`, rgba(INK, 0.82));
        if (n > L1.length) T(L2.slice(0, n - L1.length), x + 20, y + 110, `400 12px ${SANS}`, rgba(INK, 0.82));

        T("Probable causes", x + 20, y + 140, `500 11px ${SANS}`, rgba(MUTED, 1));
        const causes = [["Axios version drift", 87], ["Expired API secret", 9], ["Flaky network call", 4]] as const;
        causes.forEach(([label, pct], i) => {
          const f = easeOut(seg(t, 10.1 + i * 0.25, 11.2 + i * 0.25));
          const ry = y + 164 + i * 30;
          const col = i === 0 ? ICE : MUTED;
          T(label, x + 20, ry, `400 12px ${SANS}`, rgba(INK, i === 0 ? 0.95 : 0.6));
          T(`${Math.round(pct * f)}%`, x + w - 20, ry, `500 11px ${MONO}`, rgba(col, 1), "right");
          rr(x + 20, ry + 7, w - 40, 3, 1.5); ctx.fillStyle = rgba(WHITE, 0.07); ctx.fill();
          if (f > 0) {
            ctx.save();
            if (i === 0) { ctx.shadowColor = rgba(ICE, 0.7); ctx.shadowBlur = 8; }
            rr(x + 20, ry + 7, Math.max(2, ((w - 40) * pct * f) / 100), 3, 1.5); ctx.fillStyle = rgba(col, i === 0 ? 1 : 0.6); ctx.fill();
            ctx.restore();
          }
        });

        const fa = seg(t, 11.6, 12.2);
        if (fa > 0) {
          ctx.globalAlpha = ga * ck * fa;
          T("Suggested fix", x + 20, y + 262, `500 11px ${SANS}`, rgba(MUTED, 1));
          rr(x + 16, y + 270, w - 32, 28, 8); ctx.fillStyle = rgba(ICE, 0.08); ctx.fill();
          ctx.strokeStyle = rgba(ICE, t > 14.6 ? 0.6 : 0.28); ctx.stroke();
          T("$ npm i axios@1.6.2", x + 28, y + 288, `400 11.5px ${MONO}`, rgba(INK, 0.92));
          if (t > 14.6) { ctx.save(); ctx.translate(x + w - 32, y + 284); check(0.8, rgba(ICE, 1), seg(t, 14.6, 15.0)); ctx.restore(); }
        }
        ctx.restore();
      }

      // ---------- notifications ----------
      const targets = [{ x: 700, label: "Slack" }, { x: 790, label: "Email" }];
      targets.forEach((tg, j) => {
        const st = 12.6 + j * 0.3, arr = st + 0.8;
        const u = easeInOut(seg(t, st, arr));
        const hit = t >= arr;
        if (u > 0 && u < 1) {
          const px = lerp(755, tg.x, u), py = lerp(394, 440, u);
          ctx.save(); ctx.shadowColor = rgba(ICE, 0.9); ctx.shadowBlur = 12; ctx.fillStyle = rgba(mix(ICE, INK, 0.5), 1);
          ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        if (hit) {
          const rk = seg(t, arr, arr + 0.8);
          if (rk < 1) { ctx.strokeStyle = rgba(ICE, (1 - rk) * 0.5); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(tg.x, 440, 16 + rk * 18, 0, Math.PI * 2); ctx.stroke(); }
        }
        ctx.save(); ctx.translate(tg.x, 440);
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fillStyle = "#0A0F16"; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = hit ? rgba(ICE, 0.9) : rgba(WHITE, 0.12); ctx.stroke();
        const gc = hit ? rgba(ICE, 1) : rgba(MUTED, 0.9);
        if (j === 0) T("#", 0, 5.5, `600 16px ${SANS}`, gc, "center");
        else {
          ctx.strokeStyle = gc; ctx.lineWidth = 1.5; ctx.lineJoin = "round";
          rr(-7, -5, 14, 10, 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(0, 1); ctx.lineTo(7, -4); ctx.stroke();
        }
        ctx.restore();
        T(tg.label, tg.x, 474, `400 11px ${SANS}`, rgba(MUTED, 1), "center");
      });

      ctx.globalAlpha = 1;
      const ch = chapterAt(t);
      if (ch !== lastChapter) { lastChapter = ch; setChapter(ch); }
    };

    drawRef.current = draw;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      if (reduced) draw(12.0);
    };

    const loop = (now: number) => {
      draw((((now - startRef.current) / 1000) % CYCLE + CYCLE) % CYCLE);
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (!reduced) raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); drawRef.current = null; };
  }, []);

  const seek = (i: number) => {
    const at = CHAPTERS[i].at + 0.1;
    startRef.current = performance.now() - at * 1000;
    if (reducedRef.current) drawRef.current?.(at + 2);
  };

  const c = CHAPTERS[chapter];

  return (
    <div className="mx-auto w-full max-w-[1050px] h-full flex flex-col justify-center select-none" style={{ background: BG, fontFamily: SANS }}>
      <style>{`@keyframes sdFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion: reduce){.sd-fade{animation:none!important}}`}</style>

      <canvas
        ref={canvasRef}
        className="pointer-events-none block aspect-[900/480] w-full max-h-[68vh] object-contain"
        role="img"
        aria-label="Animated story: a pipeline test fails, a webhook alerts the AI assistant, it finds the root cause using past incidents, notifies the team, and the pipeline recovers"
      />

      <div className="px-4 pb-4 pt-2 sm:px-6">
        <div className="flex gap-1.5" role="group" aria-label="Story chapters">
          {CHAPTERS.map((ch, i) => (
            <button
              key={ch.title}
              type="button"
              onClick={() => seek(i)}
              aria-label={`Go to: ${ch.title}`}
              aria-current={i === chapter}
              className="flex-1 cursor-pointer py-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
            >
              <span
                className="block h-[3px] rounded-full transition-colors duration-500"
                style={{ background: i === chapter ? rgba(ICE, 1) : i < chapter ? rgba(ICE, 0.45) : "rgba(255,255,255,0.1)" }}
              />
            </button>
          ))}
        </div>

        <div key={chapter} className="sd-fade mt-3 min-h-[72px]" style={{ animation: "sdFade .6s ease both" }} aria-live="polite">
          <p className="text-lg font-semibold text-slate-100">{c.title}</p>
          <p className="mt-1 max-w-[56ch] text-sm leading-relaxed text-slate-400">{c.body}</p>
        </div>
      </div>
    </div>
  );
}

export const SystemFailureAnimation = FailureStoryHero;