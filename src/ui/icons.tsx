import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children" | "aria-hidden"> & { size?: number };

/** Stroke icons share one 24px grid and inherit `currentColor`. All icons are decorative (aria-hidden); the control that contains one carries the accessible name. */
function StrokeIcon({ size = 18, strokeWidth = 1.8, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
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

export function GitHubIcon({ size = 17, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** Telegram's mark from Simple Icons (CC0), filled with `currentColor`. The QQ penguin lives with the platform marks in platform-icons.tsx. */
export function TelegramIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export const SunIcon = (props: IconProps) => (
  <StrokeIcon size={16} {...props}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
  </StrokeIcon>
);

export const MoonIcon = (props: IconProps) => (
  <StrokeIcon size={16} {...props}>
    <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8z" />
  </StrokeIcon>
);

/** "Follow the system" theme choice. */
export const MonitorIcon = (props: IconProps) => (
  <StrokeIcon size={16} {...props}>
    <rect x="3" y="4" width="18" height="12.5" rx="2" />
    <path d="M8.5 20h7M12 16.5V20" />
  </StrokeIcon>
);

/** 键盘皮肤: a keyboard with a row of keys and a space bar. */
export const KeyboardIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14.5h8" />
  </StrokeIcon>
);

/** 调色盘: the header control that opens theme, season and language. */
export const PaletteIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.1 0 1.8-.75 1.8-1.7 0-.46-.18-.86-.46-1.17a1.7 1.7 0 0 1-.44-1.13c0-.97.78-1.75 1.75-1.75h2.07a4.08 4.08 0 0 0 4.08-4.08C20.8 6.75 16.86 3.2 12 3.2z" />
    <circle cx="7.6" cy="11.2" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="10.3" cy="7.3" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="14.9" cy="7.6" r="1.15" fill="currentColor" stroke="none" />
  </StrokeIcon>
);

export const MenuIcon = (props: IconProps) => (
  <StrokeIcon strokeWidth={2} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </StrokeIcon>
);

export const CloseIcon = (props: IconProps) => (
  <StrokeIcon strokeWidth={2} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </StrokeIcon>
);

export const DownloadIcon = (props: IconProps) => (
  <StrokeIcon strokeWidth={2} {...props}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
  </StrokeIcon>
);

export const ArrowRightIcon = (props: IconProps) => (
  <StrokeIcon strokeWidth={2} {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </StrokeIcon>
);

export const ArrowUpIcon = (props: IconProps) => (
  <StrokeIcon strokeWidth={2.2} {...props}>
    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
  </StrokeIcon>
);

/** The ↗ used on every link that leaves the site. */
export const ExternalIcon = (props: IconProps) => (
  <StrokeIcon size={14} strokeWidth={2} {...props}>
    <path d="M7 17 17 7M8.5 7H17v8.5" />
  </StrokeIcon>
);

export const CheckIcon = (props: IconProps) => (
  <StrokeIcon size={16} strokeWidth={2.4} {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </StrokeIcon>
);

export const CopyIcon = (props: IconProps) => (
  <StrokeIcon size={16} {...props}>
    <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2" />
    <path d="M15.5 8.5V6.2A2.2 2.2 0 0 0 13.3 4H6.2A2.2 2.2 0 0 0 4 6.2v7.1a2.2 2.2 0 0 0 2.2 2.2h2.3" />
  </StrokeIcon>
);

export const SearchIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </StrokeIcon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <StrokeIcon size={14} strokeWidth={2} {...props}>
    <path d="m6 9 6 6 6-6" />
  </StrokeIcon>
);

export const UserIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6" />
  </StrokeIcon>
);

/** Favourite. `filled` paints the heart for an item already in the favourites. */
export const HeartIcon = ({ filled = false, ...props }: IconProps & { filled?: boolean }) => (
  <StrokeIcon size={16} fill={filled ? "currentColor" : "none"} {...props}>
    <path d="M12 20s-7.5-4.4-7.5-10.1A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.5C19.5 15.6 12 20 12 20z" />
  </StrokeIcon>
);

/** One rating star; `filled` for the stars up to the rating. */
export const StarIcon = ({ filled = false, ...props }: IconProps & { filled?: boolean }) => (
  <StrokeIcon size={16} strokeWidth={1.6} fill={filled ? "currentColor" : "none"} {...props}>
    <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" />
  </StrokeIcon>
);
