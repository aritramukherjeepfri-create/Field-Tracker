import { ICON_DATA } from '../lib/icon-data';

export type IconName = keyof typeof ICON_DATA;

interface IconProps {
  name: IconName | string;
  filled?: boolean;
  className?: string;
  size?: number | string;
}

/**
 * Renders a Material Symbols icon as inline SVG, sourced from a
 * pre-extracted data file (see scripts/gen-icons.mjs). Uses
 * width/height = 1em so it inherits font-size and color classes
 * exactly like an icon font would, without any ligature-font
 * runtime loading or subsetting fragility.
 */
export function Icon({ name, filled = false, className = '', size }: IconProps) {
  const entry = ICON_DATA[name as string];

  if (!entry) {
    // Fail loud in dev rather than silently rendering nothing.
    if (import.meta.env.DEV) {
      console.warn(`Icon "${name}" not found in icon-data. Add it to scripts/gen-icons.mjs.`);
    }
    return null;
  }

  const path = filled && entry.filled ? entry.filled : entry.outline;
  const dimension = size ?? '1em';

  return (
    <svg
      viewBox={entry.viewBox}
      width={dimension}
      height={dimension}
      fill="currentColor"
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
