"use client";

import { useState, useEffect } from "react";

interface RadarChartProps {
  data: {
    energy: number;
    valence: number;
    tempo: number;
    danceability: number;
    acousticness: number;
    mode: number;
  };
  size?: number;
  color?: string;
  animated?: boolean;
}

export function RadarChart({
  data,
  size = 240,
  color = "#C9B96B",
  animated = true,
}: RadarChartProps) {
  const [progress, setProgress] = useState(animated ? 0 : 1);
  const labels = ["Energy", "Valence", "Tempo", "Dance", "Acoustic", "Mode"];
  const values = [
    data.energy,
    data.valence,
    data.tempo,
    data.danceability,
    data.acousticness,
    data.mode,
  ];
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const levels = 4;

  useEffect(() => {
    if (!animated) return;
    let start: number | null = null;
    const duration = 1500;
    let rafId: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p < 1) rafId = requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => {
      rafId = requestAnimationFrame(animate);
    }, 400);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [animated]);

  const getPoint = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const dist = val * r * progress;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  };

  const polygon = values
    .map((v, i) => {
      const p = getPoint(i, v);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid levels */}
      {Array.from({ length: levels }).map((_, l) => {
        const lr = (r * (l + 1)) / levels;
        const pts = Array.from({ length: 6 })
          .map((_, i) => {
            const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
            return `${cx + lr * Math.cos(a)},${cy + lr * Math.sin(a)}`;
          })
          .join(" ");
        return (
          <polygon
            key={l}
            points={pts}
            fill="none"
            stroke="rgba(240,230,211,0.08)"
            strokeWidth="1"
          />
        );
      })}
      {/* Axis lines */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + r * Math.cos(a)}
            y2={cy + r * Math.sin(a)}
            stroke="rgba(240,230,211,0.1)"
            strokeWidth="1"
          />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={polygon}
        fill={`${color}22`}
        stroke={color}
        strokeWidth="2"
      />
      {/* Data points */}
      {values.map((v, i) => {
        const p = getPoint(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} />;
      })}
      {/* Labels */}
      {labels.map((label, i) => {
        const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const lx = cx + (r + 22) * Math.cos(a);
        const ly = cy + (r + 22) * Math.sin(a);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(240,230,211,0.5)"
            fontSize="10"
            fontFamily="'JetBrains Mono', monospace"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
