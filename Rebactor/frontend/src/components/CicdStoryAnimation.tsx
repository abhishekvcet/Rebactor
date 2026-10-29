"use client";

import React, { useEffect, useRef, useState } from "react";

export function CicdStoryAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentStepName, setCurrentStepName] = useState<string>("BUILDING ARTIFACTS");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0; // continuous time in frames

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // 3D projection utilities (wireframe, strictly grey strokes on black)
    const project = (
      x: number,
      y: number,
      z: number,
      rotX: number,
      rotY: number,
      centerX: number,
      centerY: number,
      scale: number = 1
    ) => {
      // Rotate around Y
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;

      // Rotate around X
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const fov = 350;
      const factor = (fov / (fov + z2 + 200)) * scale;
      return {
        x: centerX + x1 * factor,
        y: centerY + y2 * factor,
        scale: factor,
      };
    };

    // Draw a 3D wireframe cube with pure grey strokes
    const draw3dCube = (
      cx: number,
      cy: number,
      size: number,
      rotX: number,
      rotY: number,
      strokeColor: string,
      lineWidth: number = 1.2,
      jitter: number = 0
    ) => {
      const h = size / 2;
      const vertices = [
        [-h, -h, -h],
        [h, -h, -h],
        [h, h, -h],
        [-h, h, -h],
        [-h, -h, h],
        [h, -h, h],
        [h, h, h],
        [-h, h, h],
      ];

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // front face
        [4, 5], [5, 6], [6, 7], [7, 4], // back face
        [0, 4], [1, 5], [2, 6], [3, 7], // connecting edges
      ];

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;

      edges.forEach(([i, j]) => {
        const jx1 = jitter ? (Math.random() - 0.5) * jitter : 0;
        const jy1 = jitter ? (Math.random() - 0.5) * jitter : 0;
        const jx2 = jitter ? (Math.random() - 0.5) * jitter : 0;
        const jy2 = jitter ? (Math.random() - 0.5) * jitter : 0;

        const p1 = project(vertices[i][0] + jx1, vertices[i][1] + jy1, vertices[i][2], rotX, rotY, cx, cy);
        const p2 = project(vertices[j][0] + jx2, vertices[j][1] + jy2, vertices[j][2], rotX, rotY, cx, cy);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw vertices dots
      vertices.forEach((v) => {
        const p = project(v[0], v[1], v[2], rotX, rotY, cx, cy);
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    // Draw an Octahedron (mathematical 3D diamond)
    const drawOctahedron = (
      cx: number,
      cy: number,
      radius: number,
      rotX: number,
      rotY: number,
      strokeColor: string,
      lineWidth: number = 1.2
    ) => {
      const vertices = [
        [0, -radius, 0], // top
        [radius, 0, 0],
        [0, 0, radius],
        [-radius, 0, 0],
        [0, 0, -radius],
        [0, radius, 0], // bottom
      ];

      const edges = [
        [0, 1], [0, 2], [0, 3], [0, 4], // top pyramid
        [5, 1], [5, 2], [5, 3], [5, 4], // bottom pyramid
        [1, 2], [2, 3], [3, 4], [4, 1], // equatorial ring
      ];

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;

      edges.forEach(([i, j]) => {
        const p1 = project(vertices[i][0], vertices[i][1], vertices[i][2], rotX, rotY, cx, cy);
        const p2 = project(vertices[j][0], vertices[j][1], vertices[j][2], rotX, rotY, cx, cy);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      ctx.restore();
    };

    // Draw a 3D Icosahedron / Geodesic Sphere wireframe
    const drawIcosahedron = (
      cx: number,
      cy: number,
      radius: number,
      rotX: number,
      rotY: number,
      strokeColor: string
    ) => {
      const phi = (1 + Math.sqrt(5)) / 2;
      const a = radius / Math.sqrt(1 + phi * phi);
      const b = a * phi;

      const vertices = [
        [-a, b, 0], [a, b, 0], [-a, -b, 0], [a, -b, 0],
        [0, -a, b], [0, a, b], [0, -a, -b], [0, a, -b],
        [b, 0, -a], [b, 0, a], [-b, 0, -a], [-b, 0, a],
      ];

      const edges = [
        [0, 1], [0, 5], [0, 7], [0, 10], [0, 11],
        [1, 5], [1, 7], [1, 8], [1, 9],
        [2, 3], [2, 4], [2, 6], [2, 10], [2, 11],
        [3, 4], [3, 6], [3, 8], [3, 9],
        [4, 5], [4, 9], [4, 11],
        [5, 9], [5, 11],
        [6, 7], [6, 8], [6, 10],
        [7, 8], [7, 10],
        [8, 9],
        [10, 11],
      ];

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;

      edges.forEach(([i, j]) => {
        const p1 = project(vertices[i][0], vertices[i][1], vertices[i][2], rotX, rotY, cx, cy);
        const p2 = project(vertices[j][0], vertices[j][1], vertices[j][2], rotX, rotY, cx, cy);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      ctx.restore();
    };

    // Total story cycle: 400 frames (~6.6 seconds)
    // 0 -> 100: Phase 1: CI/CD Pipeline flowing normally (Build -> Test -> Pack)
    // 100 -> 210: Phase 2: Pipeline error triggered (Fractured vibrating mesh, test fails)
    // 210 -> 320: Phase 3: Developer / AI solver inspects, calculates geometric fix
    // 320 -> 400: Phase 4: Restored harmonized pipeline, healed deployment
    const TOTAL_CYCLE = 420;

    let stepCheck = "";

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      t = (t + 1) % TOTAL_CYCLE;

      const phase =
        t < 110
          ? 1 // CI/CD Running
          : t < 220
          ? 2 // Error Triggered
          : t < 330
          ? 3 // Developer / AI Solver Analyzing & Patching
          : 4; // Resolved & Passed

      // Sync step label
      let label = "PIPELINE STAGE: BUILD & TEST";
      if (phase === 2) label = "FAIL: ASSERTION ERROR DETECTED (EXIT 1)";
      if (phase === 3) label = "DEV REASONING & AUTO-REMEDIATION";
      if (phase === 4) label = "PATCH VERIFIED: WORKFLOW PASSING";
      if (label !== stepCheck) {
        stepCheck = label;
        setCurrentStepName(label);
      }

      const centerY = height / 2 - 15;
      const rotAngle = t * 0.015;

      // Draw subtle isometric background mathematical grid (grey only)
      ctx.save();
      ctx.lineWidth = 0.6;
      const gridSpan = 240;
      const gridSteps = 12;
      for (let i = -gridSteps; i <= gridSteps; i++) {
        const xOffset = (i * gridSpan) / gridSteps;
        ctx.strokeStyle = "rgba(100, 116, 139, 0.12)";
        // horizontal isometric lines
        ctx.beginPath();
        ctx.moveTo(width / 2 + (xOffset - gridSpan) * 0.866, centerY + 140 + (xOffset + gridSpan) * 0.25);
        ctx.lineTo(width / 2 + (xOffset + gridSpan) * 0.866, centerY + 140 + (xOffset - gridSpan) * 0.25);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(width / 2 + (-gridSpan + xOffset) * 0.866, centerY + 140 + (gridSpan + xOffset) * 0.25);
        ctx.lineTo(width / 2 + (gridSpan + xOffset) * 0.866, centerY + 140 + (-gridSpan + xOffset) * 0.25);
        ctx.stroke();
      }
      ctx.restore();

      // 3 Pipeline Stages along the horizontal axis
      const stages = [
        { name: "BUILD", x: width * 0.22 },
        { name: "TEST", x: width * 0.50 },
        { name: "DEPLOY", x: width * 0.78 },
      ];

      // Draw Connecting Pipeline Bus (Grey Line + Pulses)
      ctx.save();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(stages[0].x, centerY);
      ctx.lineTo(stages[2].x, centerY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Pipeline Data Packets (Grey dots moving left to right)
      if (phase !== 2) {
        const packetOffset = (t * 2.2) % (stages[2].x - stages[0].x);
        ctx.save();
        ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
        ctx.beginPath();
        ctx.arc(stages[0].x + packetOffset, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // STAGE 1: BUILD (Rotating 3D Cube)
      const buildColor = "rgba(203, 213, 225, 0.75)";
      draw3dCube(stages[0].x, centerY, 42, rotAngle * 0.8, rotAngle, buildColor, 1.2);

      // Label below Build
      ctx.save();
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("[01: BUILD]", stages[0].x, centerY + 54);
      ctx.restore();

      // STAGE 2: TEST (The central focal stage where Error & Fix happen)
      const testX = stages[1].x;

      if (phase === 1) {
        // Normal Test: smooth spinning Octahedron
        drawOctahedron(testX, centerY, 32, rotAngle, rotAngle * 1.2, "rgba(203, 213, 225, 0.85)", 1.2);
        ctx.save();
        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("[02: TEST RUNNING]", testX, centerY + 54);
        ctx.restore();
      } else if (phase === 2) {
        // ERROR TRIGGERED: Vibrating, broken wireframe with error shards
        const jitterIntensity = 6 + Math.sin(t * 0.5) * 3;
        draw3dCube(
          testX,
          centerY,
          46,
          rotAngle * 2.5,
          rotAngle * 2.5,
          "rgba(241, 245, 249, 0.95)",
          1.8,
          jitterIntensity
        );

        // Fractured error shards exploding outward
        ctx.save();
        ctx.strokeStyle = "rgba(148, 163, 184, 0.7)";
        ctx.lineWidth = 1;
        for (let s = 0; s < 6; s++) {
          const sAngle = (s * Math.PI) / 3 + t * 0.05;
          const sDist = 38 + Math.sin(t * 0.4 + s) * 10;
          const sx = testX + Math.cos(sAngle) * sDist;
          const sy = centerY + Math.sin(sAngle) * sDist * 0.6;
          ctx.beginPath();
          ctx.moveTo(sx - 4, sy - 4);
          ctx.lineTo(sx + 4, sy + 4);
          ctx.moveTo(sx + 4, sy - 4);
          ctx.lineTo(sx - 4, sy + 4);
          ctx.stroke();
        }
        ctx.restore();

        // Error message text
        ctx.save();
        ctx.fillStyle = "rgba(248, 250, 252, 0.95)";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("! TEST FAILED (EXIT 1) !", testX, centerY + 54);
        ctx.restore();
      } else if (phase === 3) {
        // DEVELOPER / AI SOLVER REASONING:
        // Surrounding geometric scanning bracket & mathematical calipers analyzing node
        const scanProgress = (t - 220) / 110; // 0 to 1

        // Central reforming diamond
        drawOctahedron(testX, centerY, 30, rotAngle * 0.8, rotAngle * 0.8, "rgba(203, 213, 225, 0.75)", 1.2);

        // Rotating mathematical reasoning calipers / rings around it
        ctx.save();
        ctx.strokeStyle = "rgba(148, 163, 184, 0.85)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 3]);

        const scanRad = 48 + Math.sin(t * 0.15) * 4;
        ctx.beginPath();
        ctx.ellipse(testX, centerY, scanRad, scanRad * 0.45, rotAngle * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(testX, centerY, scanRad, scanRad * 0.45, -rotAngle * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Developer Patching Laser / Mathematical vector line from above
        const devX = testX;
        const devY = centerY - 75;

        ctx.save();
        ctx.strokeStyle = "rgba(226, 232, 240, 0.9)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(devX, devY);
        ctx.lineTo(testX, centerY);
        ctx.stroke();

        // Mathematical coordinate labels
        ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`Δx=0.${Math.floor(scanProgress * 999)} | PATCHING...`, testX, devY - 6);
        ctx.fillText("[DEV: ROOT CAUSE FIXED]", testX, centerY + 54);
        ctx.restore();
      } else {
        // PHASE 4: RESTORED & HEALED
        // Harmonious resonant wireframe Icosahedron (perfect mathematical symmetry)
        drawIcosahedron(testX, centerY, 28, rotAngle * 0.6, rotAngle * 0.6, "rgba(241, 245, 249, 0.95)");

        ctx.save();
        ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("✓ ALL CHECKS PASSED", testX, centerY + 54);
        ctx.restore();
      }

      // STAGE 3: DEPLOY (Wireframe Cube/Diamond Node)
      const deployColor = phase === 2 ? "rgba(100, 116, 139, 0.35)" : "rgba(203, 213, 225, 0.85)";
      draw3dCube(stages[2].x, centerY, 38, -rotAngle * 0.7, rotAngle * 0.9, deployColor, 1.2);

      ctx.save();
      ctx.fillStyle = phase === 2 ? "rgba(100, 116, 139, 0.5)" : "rgba(148, 163, 184, 0.8)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("[03: DEPLOY]", stages[2].x, centerY + 54);
      ctx.restore();

      // Top Diagnostic HUD in pure monochrome grey
      ctx.save();
      ctx.strokeStyle = "rgba(71, 85, 105, 0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(width / 2 - 130, 20, 260, 28);

      ctx.fillStyle = "rgba(203, 213, 225, 0.9)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`FLOW: T+${Math.floor(t * 10)}ms | SIMULATION`, width / 2, 38);
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
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-black select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-[480px] max-w-[620px] z-10 pointer-events-none"
      />

      {/* Narrative Telemetry Bar in pure monochrome grey */}
      <div className="text-center z-20 mt-2 px-4 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0f141c] border border-[#263244] text-[#cbd5e1] text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] animate-pulse" />
          <span>{currentStepName}</span>
        </div>
        <p className="text-[11px] text-gray-500 font-mono">
          CI/CD Pipeline Flow → Error Generation → Autonomous Dev Remediation
        </p>
      </div>
    </div>
  );
}
