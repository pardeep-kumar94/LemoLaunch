// Small inline icons. Decorative unless given a label by the caller.
type IconProps = { className?: string };

export function TagIcon({ className = "size-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={className}>
      <path d="M2 2.75v4.3c0 .4.16.78.44 1.06l5.45 5.45a1.5 1.5 0 0 0 2.12 0l3.5-3.5a1.5 1.5 0 0 0 0-2.12L8.06 2.44A1.5 1.5 0 0 0 7 2H2.75A.75.75 0 0 0 2 2.75Z" />
      <circle cx="5.25" cy="5.25" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SearchIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className={className}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" strokeLinecap="round" />
    </svg>
  );
}

export function UpTriangle({ className = "size-3" }: IconProps) {
  return (
    <svg viewBox="0 0 12 10" aria-hidden="true" className={className}>
      <path d="M6 0 L12 10 H0 Z" fill="currentColor" />
    </svg>
  );
}

export function CalendarIcon({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" />
      <path d="M3 8.5h14M7 2.75v3.5M13 2.75v3.5" strokeLinecap="round" />
    </svg>
  );
}

export function CommentIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <path d="M3 3.5h10a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 13 12H8l-3.25 2.5V12H3a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 3 3.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function MailIcon({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <rect x="2.75" y="4.25" width="14.5" height="11.5" rx="2.5" />
      <path d="m3.5 5.5 6.5 5 6.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <rect x="3.75" y="8.75" width="12.5" height="8.5" rx="2.25" />
      <path d="M6.75 8.75V6.5a3.25 3.25 0 0 1 6.5 0v2.25" strokeLinecap="round" />
    </svg>
  );
}

export function UserIcon({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <circle cx="10" cy="7" r="3.25" />
      <path d="M3.75 17c.6-3.2 3.1-5 6.25-5s5.65 1.8 6.25 5" strokeLinecap="round" />
    </svg>
  );
}

export function EyeIcon({ className = "size-5", off = false }: IconProps & { off?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <path d="M1.75 10S4.75 4.5 10 4.5 18.25 10 18.25 10 15.25 15.5 10 15.5 1.75 10 1.75 10Z" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" />
      {off && <path d="m3 3 14 14" strokeLinecap="round" />}
    </svg>
  );
}

export function CheckIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className={className}>
      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GlobeIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M1.75 8h12.5M8 1.75c1.8 1.9 2.6 4 2.6 6.25S9.8 12.35 8 14.25C6.2 12.35 5.4 10.25 5.4 8S6.2 3.65 8 1.75Z" strokeLinejoin="round" />
    </svg>
  );
}

export function PhoneIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={className}>
      <rect x="4" y="1.5" width="8" height="13" rx="2" />
      <path d="M7 12h2" strokeLinecap="round" />
    </svg>
  );
}

export function ExternalIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <path d="M9 2.5h4.5V7M13.25 2.75 7.5 8.5M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MenuIcon({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <path d="M3.5 6h13M3.5 10h13M3.5 14h13" strokeLinecap="round" />
    </svg>
  );
}

export function BellIcon({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={className}>
      <path d="M5 8.5a5 5 0 0 1 10 0c0 3.5 1.5 5 1.5 5h-13S5 12 5 8.5Z" strokeLinejoin="round" />
      <path d="M8.25 16.25a1.9 1.9 0 0 0 3.5 0" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ className = "size-4", filled = true }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        d="m10 1.9 2.47 5.02 5.53.8-4 3.9.94 5.5L10 14.52 5.06 17.12 6 11.62l-4-3.9 5.53-.8L10 1.9Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LinkIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <path d="M6.75 9.25a3 3 0 0 0 4.24 0l2.13-2.12a3 3 0 0 0-4.25-4.25l-.7.71M9.25 6.75a3 3 0 0 0-4.24 0L2.88 8.87a3 3 0 0 0 4.25 4.25l.7-.71" strokeLinecap="round" />
    </svg>
  );
}

export function FlagIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={className}>
      <path d="M3 14.5V2.5m0 0h8.5l-1.75 3 1.75 3H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function XLogo({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" />
    </svg>
  );
}

export function LinkedInLogo({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.83v1.54h.06c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.66 4.8 6.13V21h-4v-4.98c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.92 1.3-1.92 2.63V21h-4V9.75Z" />
    </svg>
  );
}

export function GitHubLogo({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

export function FacebookLogo({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M13.5 21v-7.5h2.53l.38-2.94H13.5V8.69c0-.85.24-1.43 1.46-1.43h1.55V4.63A20.8 20.8 0 0 0 14.25 4.5c-2.24 0-3.77 1.37-3.77 3.88v2.18H7.95v2.94h2.53V21h3.02Z" />
    </svg>
  );
}
