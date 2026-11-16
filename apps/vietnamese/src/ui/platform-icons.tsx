import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children" | "aria-hidden"> & { size?: number };

/*
 * Platform marks for the download sections and the home page's platform cards. Monochrome, filled with `currentColor` on a 24px grid so they follow the theme and season colours. The Apple and Android paths are from simple-icons 16.33.0 (CC0-1.0); the Windows four-pane window and the cloud-download glyph are drawn here. All marks are decorative: the element around them carries the accessible name.
 */
function Mark({ size = 22, d, ...props }: IconProps & { d: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d={d} />
    </svg>
  );
}

export type PlatformId = "windows" | "macos" | "linux" | "android" | "ios";

const WINDOWS = "M2 2h9.5v9.5H2zM12.5 2H22v9.5h-9.5zM2 12.5h9.5V22H2zM12.5 12.5H22V22h-9.5z";
const PLATFORM_COLORS: Record<PlatformId, string> = {
  windows: "#0078d4",
  macos: "#a2aaad",
  linux: "#111111",
  android: "#3ddc84",
  ios: "#555555",
};
const APPLE = "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701";
const ANDROID = "M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z";

export const WindowsIcon = (props: IconProps) => <Mark d={WINDOWS} {...props} />;
/** Apple's mark, used for both macOS and iOS. */
export const AppleIcon = (props: IconProps) => <Mark d={APPLE} {...props} />;
export function LinuxIcon({ size = 22, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      {/* Tux 多色标识来自 Wikimedia Commons 的 CC0 资源。 */}
      <image href="/img/icons/linux-tux.png" width="24" height="24" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}
export const AndroidIcon = (props: IconProps) => <Mark d={ANDROID} {...props} />;

/** A cloud with a down arrow, for the dl.msime.app mirror. Stroke-drawn like the rest of the UI icons. */
export function CloudDownloadIcon({ size = 22, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M7.5 18.5H6.8a4.3 4.3 0 0 1-.6-8.56A6 6 0 0 1 17.8 8.6a4.95 4.95 0 0 1-.3 9.9h-.9" />
      <path d="M12 11.5v9M8.8 17.5l3.2 3.2 3.2-3.2" />
    </svg>
  );
}

const PLATFORM_ICONS: Record<PlatformId, (props: IconProps) => React.JSX.Element> = {
  windows: WindowsIcon,
  macos: AppleIcon,
  linux: LinuxIcon,
  android: AndroidIcon,
  ios: AppleIcon,
};

export function PlatformIcon({ platform, ...props }: IconProps & { platform: PlatformId }) {
  const Icon = PLATFORM_ICONS[platform];
  return <Icon data-platform-icon={platform} {...props} color={props.color ?? PLATFORM_COLORS[platform]} />;
}
