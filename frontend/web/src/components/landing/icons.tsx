import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** One stroke family for every icon: 24px grid, 1.75 stroke, round caps. */
function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Three heads on one body, drawn as the same points and lines as the map. */
export function HydraMark(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M16 25.5V9.5M16 25.5C16 18.5 7 19 7 11.5M16 25.5C16 18.5 25 19 25 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="7" cy="9" r="3.4" fill="currentColor" />
      <circle cx="16" cy="6.5" r="3.4" fill="currentColor" />
      <circle cx="25" cy="9" r="3.4" fill="currentColor" />
      <circle cx="16" cy="26" r="4.2" fill="currentColor" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </Icon>
  );
}

/** Half light, half dark: follows the time of day. */
export function AutoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6v12M15 6v12" strokeWidth="2.5" />
    </Icon>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function ArrowUpRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 17L17 7M8 7h9v9" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.25" pathLength={1} />
    </Icon>
  );
}

/** A pointer: used for the hint that the map can be clicked. */
export function PointerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4.5l11 6.2-4.6 1.3-1.9 4.6z" />
      <path d="M13.4 12l4.1 4.1" />
    </Icon>
  );
}

/** Saved: an arrow going into a tray. */
export function SaveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v10M7.5 9.5L12 14l4.5-4.5M4.5 15.5V19h15v-3.5" strokeWidth="2" />
    </Icon>
  );
}

/** Unhealthy: a warning triangle. */
export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4L21 19.5H3z" strokeWidth="2" />
      <path d="M12 10v4M12 17v.01" strokeWidth="2.25" />
    </Icon>
  );
}

/** Potentially affected: a ring with a dot, deliberately different from the triangle. */
export function AffectedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function RecoverIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.5H8" strokeWidth="2" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </Icon>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" />
      <path d="M14 3.5V8h4.5" />
    </Icon>
  );
}

/** Reading: three lines being scanned. */
export function ReadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 7h14M5 12h9M5 17h11" />
    </Icon>
  );
}

/** Waiting: an empty ring. */
export function WaitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="6.5" strokeDasharray="3 3.4" />
    </Icon>
  );
}
