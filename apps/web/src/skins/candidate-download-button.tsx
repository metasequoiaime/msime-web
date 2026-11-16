import { Button, DownloadIcon } from "../ui";
import { useLocale } from "../use-locale";

export function CandidateDownloadButton({ id, name, className = "mt-3 w-full" }: { id: string; name: string; className?: string }) {
  const { t } = useLocale();
  return (
    <form method="post" action={`/api/skins/candidate/${encodeURIComponent(id)}/download`} className="m-0">
      <Button type="submit" variant="secondary" size="sm" className={className} aria-label={t(`下载 ${name} 的皮肤包`)}>
        <DownloadIcon size={15} />{t("下载皮肤包")}
      </Button>
    </form>
  );
}
