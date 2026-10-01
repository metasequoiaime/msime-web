import { useState } from "react";
import type { AccountUser } from "../data/schemas";
import { cx } from "../ui";

/** The account picture, or the nickname's first character on a tinted disc when there is none (or it fails to load), as the App does. */
export function Avatar({ user, size = 36, className }: { user: AccountUser; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initial = [...user.display_name.trim()][0] ?? "水";
  return user.avatar_url && !failed ? (
    <img className={cx("block flex-none rounded-full object-cover", className)} src={user.avatar_url} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  ) : (
    <span className={cx("inline-flex flex-none items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-ink", className)} style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">
      {initial}
    </span>
  );
}
