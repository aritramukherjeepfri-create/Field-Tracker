import { useState } from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}

// Palette drawn from the app's own container-tone colors so avatar
// circles always feel native to the design system, never arbitrary.
const PALETTE = [
  { bg: '#c8daff', fg: '#00478d' },
  { bg: '#91f77e', fg: '#006e06' },
  { bg: '#d4d9eb', fg: '#424755' },
  { bg: '#ffdad6', fg: '#ba1a1a' },
  { bg: '#fde293', fg: '#7a5900' },
  { bg: '#c9e9ff', fg: '#00497d' },
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, src, size = 40, className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const color = PALETTE[hashName(name) % PALETTE.length];

  if (showImage) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color.bg,
        color: color.fg,
        fontSize: Math.max(11, size * 0.38),
      }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
