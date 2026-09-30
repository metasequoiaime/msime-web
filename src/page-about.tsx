import { LakeIllustration } from "./about/lake-illustration";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { Card, Container, copyText, useToast } from "./ui";
import { useLocale } from "./use-locale";
import { useReveal } from "./use-reveal";

const TELEGRAM_URL = "https://t.me/msimegroup";
const QQ_GROUP = "829919142";
const EMAIL = "metasequoiaime@gmail.com";

const eyebrowClass = "m-0 text-[13.5px] tracking-[0.16em] text-accent-ink";
const chipClass =
  "inline-flex min-h-8 items-center rounded-full bg-panel px-[13px] py-[5px] text-sm text-ink no-underline transition-colors duration-150 hover:text-accent-ink [overflow-wrap:anywhere]";

/** 关于页（design-home §11）：名字的由来配湖畔插画，项目理念，许可、签名与社区三张卡片。 */
export function AboutPage() {
  const { t } = useLocale();
  const toast = useToast();
  usePageMeta();
  useReveal();

  const copyQQ = async () => {
    toast.show(t((await copyText(QQ_GROUP)) ? `已复制 QQ 群号 ${QQ_GROUP}` : `QQ 群号：${QQ_GROUP}`));
  };

  return (
    <>
      <PageHero
        kicker="Metasequoia IME"
        title="关于水杉输入法"
        lead="一套开源中文输入法，从 Windows 起步，现在已覆盖六个平台。Windows 版独立开发，其余五个平台共用一套 Rust 输入引擎。"
      />
      <main className="w-full">
        <Container className="pt-[clamp(36px,5vw,64px)]">
          <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-center gap-[clamp(28px,5vw,72px)]" aria-labelledby="about-name">
            <div className="relative mx-auto aspect-[4/5] w-[min(100%,448px)]">
              <LakeIllustration label={t("湖畔的水杉林")} />
            </div>
            <div className="min-w-0">
              <p className={eyebrowClass}>{t("背景")}</p>
              <h2 id="about-name" className="m-0 mt-3.5 font-heading text-[clamp(28px,3.4vw,40px)] leading-[1.35] font-bold text-ink">
                {t("名字取自一片水杉林")}
              </h2>
              <p className="m-0 mt-[22px] text-base leading-[2] text-body">
                {t(
                  "水杉（MetaSequoia）这个名字取自我 GAP 两年多的地方 —— 湖北省潜江市江汉油田，此地盛产水杉。我与此地结缘，遂以此树命名这款一直想做的输入法，希望它能像水杉一样，给用户带来绿色的体验。"
                )}
              </p>
            </div>
          </section>

          <section
            className="mt-[clamp(64px,8vw,104px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-[clamp(20px,4vw,56px)] py-[clamp(32px,4vw,56px)] shadow-[inset_0_1px_0_var(--hair-2),inset_0_-1px_0_var(--hair-2)]"
            aria-labelledby="about-principles"
            data-reveal
          >
            <div>
              <h2 id="about-principles" className={eyebrowClass}>
                {t("项目理念")}
              </h2>
              <p className="m-0 mt-3.5 font-heading text-[clamp(24px,2.8vw,32px)] leading-[1.5] font-bold text-ink">
                {t("开箱即用、输入体验简洁、设置便捷、响应迅速。")}
              </p>
            </div>
            <div>
              <p className="m-0 text-[15.5px] leading-[1.95] text-body">
                {t(
                  "输入法能看到用户输入的一切，隐私边界不该靠承诺保证，而该能被任何人读代码检查；桌面工具软件长期由少数大厂主导，我们想留一个用户可以自己改、自己分发的选择。"
                )}
              </p>
              <p className="m-0 mt-3 text-[15.5px] leading-[1.95] text-muted">{t("项目仍在持续建设中，功能、界面和文档都会逐步完善。")}</p>
            </div>
          </section>

          <div className="mt-[clamp(40px,5vw,56px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4" data-reveal-stagger>
            <Card as="section" className="rounded-tile px-7 py-[26px]" aria-labelledby="about-license" data-reveal>
              <h3 id="about-license" className="m-0 font-heading text-[19px] font-bold text-ink">
                {t("开源许可")}
              </h3>
              <p className="m-0 mt-2.5 text-[15px] leading-[1.9] text-body">
                {t("GPL-3.0，现在和将来都会保持 100% 开源。各组件的源码见")}
                <LocaleLink to="/code/">{t("开源代码")}</LocaleLink>
                {t("。")}
              </p>
            </Card>
            <Card as="section" className="rounded-tile px-7 py-[26px]" aria-labelledby="about-signing" data-reveal>
              <h3 id="about-signing" className="m-0 font-heading text-[19px] font-bold text-ink">
                {t("签名与安全")}
              </h3>
              <p className="m-0 mt-2.5 text-[15px] leading-[1.9] text-body">
                {t("签署者 Open Source Developer LU FAN，签名机构 Certum。若 Windows 提示程序没有签名，可能来源被篡改，请勿安装。请从")}
                <LocaleLink to="/download/">{t("下载页")}</LocaleLink>
                {t("获取安装包并核对 SHA256。")}
              </p>
            </Card>
            <Card as="section" tone="muted" className="rounded-tile px-7 py-[26px]" aria-labelledby="about-community" data-reveal>
              <h3 id="about-community" className="m-0 font-heading text-[19px] font-bold text-ink">
                {t("社区与反馈")}
              </h3>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <a className={chipClass} href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                  Telegram t.me/msimegroup
                </a>
                <button className={chipClass} type="button" title={t("点击复制群号")} onClick={() => void copyQQ()}>
                  {t(`QQ 群 ${QQ_GROUP}`)}
                </button>
                <a className={chipClass} href={`mailto:${EMAIL}`}>
                  {EMAIL}
                </a>
              </div>
              <p className="m-0 mt-3.5 text-sm leading-[1.85] text-muted">
                {t("发现问题或有功能建议，可以在官网“")}
                <LocaleLink to="/feedback/">{t("问题与建议")}</LocaleLink>
                {t("”提交，无需 GitHub 账号。提交前请确认不含 API Key 等敏感信息。")}
              </p>
            </Card>
          </div>
        </Container>
      </main>
    </>
  );
}
