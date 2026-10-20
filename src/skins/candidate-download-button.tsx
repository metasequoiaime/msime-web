import { useRef, useState } from "react";
import { ApiError } from "../data/account";
import { Button, DownloadIcon, useToast } from "../ui";
import { useLocale } from "../use-locale";

export function CandidateDownloadButton({ id, name, className = "mt-3 w-full" }: { id: string; name: string; className?: string }) {
  const { t } = useLocale();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const download = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const { downloadCandidateSkin } = await import("./candidate-download");
      await downloadCandidateSkin(id);
      show(t("已开始下载。解压后，将皮肤文件夹放入水杉输入法的皮肤目录。"));
    } catch (error) {
      show(t(error instanceof ApiError && error.status === 404 ? "该皮肤已下架或不存在。" : error instanceof ApiError && error.status === 429 ? "下载太频繁，请稍后再试。" : "下载失败，请稍后重试。"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <Button variant="secondary" size="sm" className={className} disabled={busy} aria-label={t(`下载 ${name} 的皮肤包`)} onClick={() => void download()}>
      <DownloadIcon size={15} />{t(busy ? "正在下载…" : "下载皮肤包")}
    </Button>
  );
}
