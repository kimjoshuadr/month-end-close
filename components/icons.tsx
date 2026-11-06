// Custom inline SVG icon set, 1.5px stroke, currentColor.
type P = { size?: number; className?: string };

function base(size: number, className: string | undefined, inner: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {inner}
    </svg>
  );
}

export const IconCheck = (p: P) => base(p.size ?? 16, p.className, <path d="M4 12.5l5 5L20 6.5" />);
export const IconLock = (p: P) => base(p.size ?? 16, p.className, (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>));
export const IconChevronR = (p: P) => base(p.size ?? 16, p.className, <path d="M9 5l7 7-7 7" />);
export const IconChevronL = (p: P) => base(p.size ?? 16, p.className, <path d="M15 5l-7 7 7 7" />);
export const IconUpload = (p: P) => base(p.size ?? 16, p.className, (<><path d="M12 16V4m0 0L7 9m5-5l5 5" /><path d="M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></>));
export const IconFile = (p: P) => base(p.size ?? 16, p.className, (<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></>));
export const IconSpark = (p: P) => base(p.size ?? 16, p.className, (<><path d="M12 3v6m0 0l-2.5-2.5M12 9l2.5-2.5" /><path d="M5 12l3 3-3 3m14-6l-3 3 3 3" /><circle cx="12" cy="15" r="2.2" /></>));
export const IconX = (p: P) => base(p.size ?? 16, p.className, <path d="M6 6l12 12M18 6L6 18" />);
export const IconMenu = (p: P) => base(p.size ?? 16, p.className, <path d="M4 7h16M4 12h16M4 17h16" />);
export const IconReset = (p: P) => base(p.size ?? 16, p.className, (<><path d="M4 10a8 8 0 111 6" /><path d="M4 4v6h6" /></>));
export const IconScale = (p: P) => base(p.size ?? 16, p.className, (<><path d="M12 4v16m-7 0h14" /><path d="M12 6L5 8m7-2l7 2" /><path d="M2.5 13L5 18l2.5-5M16.5 13L19 18l2.5-5" /></>));
export const IconDoc = (p: P) => base(p.size ?? 16, p.className, (<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5m-5 4h5" /></>));
export const IconClock = (p: P) => base(p.size ?? 16, p.className, (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>));
export const IconArrowR = (p: P) => base(p.size ?? 16, p.className, <path d="M4 12h15m0 0l-5-5m5 5l-5 5" />);
export const IconCaretUp = (p: P) => base(p.size ?? 12, p.className, <path d="M6 14l6-6 6 6" />);
export const IconCaretDown = (p: P) => base(p.size ?? 12, p.className, <path d="M6 10l6 6 6-6" />);
export const IconEye = (p: P) => base(p.size ?? 16, p.className, (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>));
export const IconChat = (p: P) => base(p.size ?? 16, p.className, <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4z" />);
export const IconPrint = (p: P) => base(p.size ?? 16, p.className, (<><path d="M7 8V3h10v5" /><rect x="4" y="8" width="16" height="9" rx="2" /><path d="M7 14h10v7H7z" /></>));
export const IconAlert = (p: P) => base(p.size ?? 16, p.className, (<><path d="M12 3.5L22 20H2z" /><path d="M12 10v4.5m0 2.5v.5" /></>));
