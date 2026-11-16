import { useLocale } from "./use-locale";

/** 《用户协议》和《隐私政策》 as links that open in a new tab, so reading them does not close a half-filled login dialog or form. */
export function LegalDocumentLinks() {
  const { t, href } = useLocale();
  return (
    <>
      <a href={href("/terms/")} target="_blank" rel="noopener">{t("《用户协议》")}</a>
      {t("和")}
      <a href={href("/privacy/")} target="_blank" rel="noopener">{t("《隐私政策》")}</a>
    </>
  );
}
