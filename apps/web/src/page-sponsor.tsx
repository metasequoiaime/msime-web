import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { AnchorButton, Card, Container, GitHubIcon, HeartIcon } from "./ui";
import { useLocale } from "./use-locale";
import { useReveal } from "./use-reveal";

/** Keep in step with `.github/FUNDING.yml` in the msime repository; only list accounts that actually accept sponsorship. */
const AFDIAN_URL = "https://afdian.com/a/msime";
const GITHUB_SPONSORS_URL = "https://github.com/sponsors/houko";
const ORG_URL = "https://github.com/metasequoiaime";

const eyebrowClass = "m-0 text-[13.5px] tracking-[0.16em] text-accent-ink";

const USES = [
  { title: "开发与维护", body: "六个平台的客户端、输入引擎、词库和语言模型的持续开发。" },
  { title: "服务器与基础设施", body: "官网、下载镜像、云同步、社区与联网候选所需的服务器和带宽。" },
  { title: "发布与签名", body: "Windows 代码签名证书、Apple 开发者账号等发布所需的费用。" },
] as const;

/** 赞助页：两个收款渠道，资金用途，以及不花钱的支持方式。赞助完全自愿，不解锁任何功能。 */
export function SponsorPage() {
  const { t } = useLocale();
  usePageMeta();
  useReveal();

  return (
    <>
      <PageHero
        kicker="赞助"
        title="赞助水杉输入法"
        lead="水杉输入法免费、开源，没有广告，也不出售用户数据。赞助完全自愿，不会解锁任何功能，只用来让项目持续做下去。"
      />
      <main className="w-full">
        <Container className="pt-[clamp(36px,5vw,64px)]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-reveal-stagger>
            <Card as="section" tone="accent" className="flex flex-col rounded-tile px-7 py-[26px]" aria-labelledby="sponsor-afdian" data-reveal>
              <h2 id="sponsor-afdian" className="m-0 flex items-center gap-2 font-heading text-[21px] font-bold text-ink">
                <HeartIcon filled size={18} className="text-accent-ink" />
                {t("爱发电")}
              </h2>
              <p className="m-0 mt-2.5 flex-1 text-[15px] leading-[1.9] text-body">{t("项目的官方账号，支持微信和支付宝，可以单次赞助，也可以按月支持。")}</p>
              <AnchorButton className="mt-5 self-start" href={AFDIAN_URL}>
                {t("前往爱发电")}
              </AnchorButton>
            </Card>
            <Card as="section" className="flex flex-col rounded-tile px-7 py-[26px]" aria-labelledby="sponsor-github" data-reveal>
              <h2 id="sponsor-github" className="m-0 flex items-center gap-2 font-heading text-[21px] font-bold text-ink">
                <GitHubIcon size={18} />
                GitHub Sponsors
              </h2>
              <p className="m-0 mt-2.5 flex-1 text-[15px] leading-[1.9] text-body">{t("赞助维护者 houko，支持信用卡和 PayPal，适合海外用户。")}</p>
              <AnchorButton className="mt-5 self-start" variant="secondary" href={GITHUB_SPONSORS_URL}>
                {t("前往 GitHub Sponsors")}
              </AnchorButton>
            </Card>
          </div>

          <section
            className="mt-[clamp(64px,8vw,104px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-[clamp(20px,4vw,56px)] py-[clamp(32px,4vw,56px)] shadow-[inset_0_1px_0_var(--hair-2),inset_0_-1px_0_var(--hair-2)]"
            aria-labelledby="sponsor-uses"
            data-reveal
          >
            <div>
              <h2 id="sponsor-uses" className={eyebrowClass}>
                {t("资金用途")}
              </h2>
              <p className="m-0 mt-3.5 font-heading text-[clamp(24px,2.8vw,32px)] leading-[1.5] font-bold text-ink">{t("每一笔赞助都用在项目本身。")}</p>
            </div>
            <dl className="m-0 grid gap-5">
              {USES.map((use) => (
                <div key={use.title}>
                  <dt className="font-heading text-[17px] font-bold text-ink">{t(use.title)}</dt>
                  <dd className="m-0 mt-1 text-[15px] leading-[1.9] text-body">{t(use.body)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-[clamp(40px,5vw,56px)]" aria-labelledby="sponsor-other" data-reveal>
            <h2 id="sponsor-other" className={eyebrowClass}>
              {t("其他支持方式")}
            </h2>
            <ul className="m-0 mt-3.5 grid list-none gap-2.5 p-0 text-[15.5px] leading-[1.9] text-body">
              <li>
                {t("在 ")}
                <a href={ORG_URL} target="_blank" rel="noreferrer">
                  GitHub
                </a>
                {t(" 上给仓库点个 Star，或推荐给身边的朋友。")}
              </li>
              <li>
                {t("通过")}
                <LocaleLink to="/feedback/">{t("问题反馈")}</LocaleLink>
                {t("报告 Bug、提出建议，或")}
                <LocaleLink to="/words/">{t("提交缺失的词条")}</LocaleLink>
                {t("。")}
              </li>
              <li>
                {t("参与开发，见")}
                <a href="https://github.com/metasequoiaime/.github/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">
                  {t("贡献指南")}
                </a>
                {t("。")}
              </li>
            </ul>
            <p className="m-0 mt-6 text-sm leading-[1.85] text-muted">
              {t("后续的一次性付费支持计划见")}
              <LocaleLink to="/price/">{t("价格说明")}</LocaleLink>
              {t("。")}
            </p>
          </section>
        </Container>
      </main>
    </>
  );
}
