"use client";

import React, { useEffect, useRef } from "react";

export function TowerAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    // Handle high DPI
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Tower configuration: multiple stacked glowing cybernetic rings & server nodes
    const levels = 8;
    const levelHeight = 36;
    const baseRadius = 140;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 + 50;

      angle += 0.012;

      // Draw isometric grid floor
      ctx.save();
      ctx.lineWidth = 0.8;
      const gridCount = 9;
      const gridSpan = 220;
      for (let i = -gridCount; i <= gridCount; i++) {
        const xOffset = (i * gridSpan) / gridCount;
        const alpha = Math.max(0.02, 0.15 - Math.abs(i) / (gridCount * 1.5));
        ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;

        // Isometric projection of floor lines
        const isoX1 = centerX + (xOffset - gridSpan) * 0.866;
        const isoY1 = centerY + 90 + (xOffset + gridSpan) * 0.5 * 0.45;
        const isoX2 = centerX + (xOffset + gridSpan) * 0.866;
        const isoY2 = centerY + 90 + (xOffset - gridSpan) * 0.5 * 0.45;

        ctx.beginPath();
        ctx.moveTo(isoX1, isoY1);
        ctx.lineTo(isoX2, isoY2);
        ctx.stroke();

        const isoX3 = centerX + (-gridSpan + xOffset) * 0.866;
        const isoY3 = centerY + 90 + (gridSpan + xOffset) * 0.5 * 0.45;
        const isoX4 = centerX + (gridSpan + xOffset) * 0.866;
        const isoY4 = centerY + 90 + (-gridSpan + xOffset) * 0.5 * 0.45;

        ctx.beginPath();
        ctx.moveTo(isoX3, isoY3);
        ctx.lineTo(isoX4, isoY4);
        ctx.stroke();
      }
      ctx.restore();

      // Draw 3D Tower from bottom to top
      for (let l = 0; l < levels; l++) {
        const y = centerY - l * levelHeight;
        // Radius tapers slightly towards top
        const radius = baseRadius * (1 - l * 0.05);
        const ySquash = 0.42; // isometric 3D tilt

        // Rotating ring pulse phase
        const currentRot = angle * (l % 2 === 0 ? 1 : -1) + l * 0.4;

        // Pillar supports between levels
        if (l < levels - 1) {
          const nextY = y - levelHeight;
          const nextRadius = baseRadius * (1 - (l + 1) * 0.05);
          const pillarCount = 6;

          for (let p = 0; p < pillarCount; p++) {
            const pAngle = currentRot + (p * Math.PI * 2) / pillarCount;
            const px1 = centerX + Math.cos(pAngle) * radius;
            const py1 = y + Math.sin(pAngle) * radius * ySquash;
            const px2 = centerX + Math.cos(pAngle) * nextRadius;
            const py2 = nextY + Math.sin(pAngle) * nextRadius * ySquash;

            // Gradient line for vertical pillars
            ctx.save();
            const pillarGrad = ctx.createLinearGradient(px1, py1, px2, py2);
            pillarGrad.addColorStop(0, "rgba(99, 102, 241, 0.4)");
            pillarGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.8)");
            pillarGrad.addColorStop(1, "rgba(6, 182, 212, 0.4)");

            ctx.strokeStyle = pillarGrad;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(px1, py1);
            ctx.lineTo(px2, py2);
            ctx.stroke();
            ctx.restore();

            // Glowing data packet travelling vertically up pillars
            const packetPhase = (angle * 1.5 + l * 0.6 + p * 0.3) % 1;
            const packetX = px1 + (px2 - px1) * packetPhase;
            const packetY = py1 + (py2 - py1) * packetPhase;

            ctx.save();
            ctx.fillStyle = "#38bdf8";
            ctx.shadowColor = "#38bdf8";
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(packetX, packetY, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // Draw ring tier
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(centerX, y, radius, radius * ySquash, 0, 0, Math.PI * 2);

        // Tower ring glow
        const isCoreLevel = l === 3 || l === 4;
        ctx.strokeStyle = isCoreLevel
          ? "rgba(6, 182, 212, 0.85)"
          : l % 2 === 0
          ? "rgba(168, 85, 247, 0.65)"
          : "rgba(99, 102, 241, 0.6)";
        ctx.lineWidth = isCoreLevel ? 2.5 : 1.5;
        ctx.shadowColor = isCoreLevel ? "#06b6d4" : "#a855f7";
        ctx.shadowBlur = isCoreLevel ? 16 : 8;
        ctx.stroke();
        ctx.restore();

        // Inner glowing core ring
        ctx.save();
        ctx.beginPath();
        const innerRad = radius * 0.38;
        ctx.ellipse(centerX, y, innerRad, innerRad * ySquash, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fill();
        ctx.strokeStyle = "rgba(168, 85, 247, 0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Glowing server nodes on ring perimeter
        const nodeCount = 8;
        for (let n = 0; n < nodeCount; n++) {
          const nodeAngle = currentRot + (n * Math.PI * 2) / nodeCount;
          const nx = centerX + Math.cos(nodeAngle) * radius;
          const ny = y + Math.sin(nodeAngle) * radius * ySquash;

          const depth = Math.sin(nodeAngle); // front/back depth
          const nodeSize = 2.5 + depth * 0.8;
          const nodeAlpha = 0.4 + (depth + 1) * 0.3;

          ctx.save();
          const nodeColor = (n + l) % 3 === 0 ? "#06b6d4" : (n + l) % 3 === 1 ? "#a855f7" : "#ec4899";
          ctx.fillStyle = nodeColor;
          ctx.shadowColor = nodeColor;
          ctx.shadowBlur = 10;
          ctx.globalAlpha = nodeAlpha;
          ctx.beginPath();
          ctx.arc(nx, ny, nodeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Draw Top Beacon / Antenna Sphere with pulsating waves
      const topY = centerY - levels * levelHeight;
      const beaconRadius = 14;
      const pulse = Math.sin(angle * 3) * 4;

      ctx.save();
      // Outer pulse rings
      for (let w = 1; w <= 3; w++) {
        const waveRad = (beaconRadius + 10 * w + (angle * 25) % 30);
        const waveAlpha = Math.max(0, 0.4 - waveRad / 70);
        ctx.beginPath();
        ctx.ellipse(centerX, topY - 10, waveRad, waveRad * 0.42, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${waveAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Center Spire Core
      const spireGrad = ctx.createRadialGradient(
        centerX - 3,
        topY - 13,
        2,
        centerX,
        topY - 10,
        beaconRadius + pulse
      );
      spireGrad.addColorStop(0, "#ffffff");
      spireGrad.addColorStop(0.3, "#38bdf8");
      spireGrad.addColorStop(0.7, "#a855f7");
      spireGrad.addColorStop(1, "rgba(15, 23, 42, 0)");

      ctx.fillStyle = spireGrad;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(centerX, topY - 10, beaconRadius + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] bg-gradient-to-tr from-[#6366f1]/15 via-[#a855f7]/15 to-[#06b6d4]/10 rounded-full blur-[120px]" />
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-[520px] max-w-[560px] z-10 select-none pointer-events-none"
      />

      {/* Floating Telemetry Stats around the 3D Tower */}
      <div className="absolute top-12 right-12 z-20 hidden lg:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0b0e14]/90 border border-[#1f283d] backdrop-blur-md shadow-2xl">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] font-mono text-gray-300">Cluster Status:</span>
        <span className="text-[11px] font-mono font-bold text-emerald-400">99.98% Uptime</span>
      </div>

      <div className="absolute bottom-12 left-12 z-20 hidden lg:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0b0e14]/90 border border-[#1f283d] backdrop-blur-md shadow-2xl">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-[11px] font-mono text-gray-300">RAG Vector Node:</span>
        <span className="text-[11px] font-mono font-bold text-cyan-300">Synchronized</span>
      </div>

      <div className="text-center z-20 mt-[-10px]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse" />
          Rebactor Distributed AI Mesh
        </div>
        <p className="text-xs text-gray-400 font-mono mt-1.5">
          Real-time CI/CD telemetry ingest & predictive healing engine
        </p>
      </div>
    </div>
  );
}
