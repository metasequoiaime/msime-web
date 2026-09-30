import { ARCHIVED_REPOS_URL, REPOSITORY_GROUPS, repositoryUrl } from "./code/repositories";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { AnchorButton, Card, Container, ExternalIcon, LinkButton } from "./ui";
import { useLocale } from "./use-locale";
import { useReveal } from "./use-reveal";

const GITHUB_DOCS = "https://github.com/metasequoiaime/.github/blob/main";

/** 开源代码页（design-home §10）：按用途分组的组织仓库索引，左列编号与组名，右列每行一个仓库链接。 */
export function CodePage() {
  const { t } = useLocale();
  usePageMeta();
  useReveal();

  return (
    <>
      <PageHero
        kicker="GPL-3.0 开源"
        title="开源代码"
        lead="水杉输入法由多个相互协作的开源项目组成。各仓库的构建方式、依赖与许可以其 README 和 LICENSE 为准。"
      />
      <main className="w-full">
        <Container className="pt-[clamp(28px,4vw,48px)]">
          {REPOSITORY_GROUPS.map((group, index) => {
            const headingId = `code-group-${index + 1}`;
            return (
              <section
                key={group.title}
                aria-labelledby={headingId}
                className="flex flex-wrap gap-x-[clamp(24px,4vw,56px)] gap-y-3 py-[clamp(24px,3vw,36px)] shadow-divider-t-2"
                data-reveal
              >
                <div className="max-w-full flex-[0_0_220px]">
                  <p className="m-0 font-mono text-xs tracking-[0.16em] text-accent-ink" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 id={headingId} className="m-0 mt-2 font-heading text-[21px] leading-[1.4] font-bold text-ink">
                    {t(group.title)}
                  </h2>
                </div>
                <ul className="m-0 min-w-0 flex-[1_1_480px] list-none p-0">
                  {group.repositories.map((repository) => (
                    <li key={repository.name}>
                      <a
                        href={repositoryUrl(repository.name)}
                        target="_blank"
                        rel="noreferrer"
                        className="-mx-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-field px-3 py-3.5 text-body no-underline transition-colors duration-150 hover:bg-panel hover:text-body"
                      >
                        <span className="min-w-0 flex-[0_0_min(100%,260px)] font-mono text-sm break-all text-ink">{repository.name}</span>
                        <span className="min-w-0 flex-[1_1_240px] text-[14.5px] leading-[1.7] text-muted">{t(repository.description)}</span>
                        <ExternalIcon className="flex-none self-center text-accent-ink" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <p className="m-0 py-[clamp(20px,2.4vw,28px)] text-[14.5px] leading-[1.8] text-muted shadow-divider-t-2">
            {t("合仓之前的旧仓库（MSIME-Engine、MSIME-Linux、MSIME-UI 等）已经归档，保留完整的提交历史与已有 Release，可以在 ")}
            <a href={ARCHIVED_REPOS_URL} target="_blank" rel="noreferrer">
              {t("GitHub 组织的归档列表")}
            </a>
            {t(" 中查看。")}
          </p>

          <Card as="section" tone="muted" className="mt-[clamp(28px,4vw,48px)] rounded-panel p-[clamp(24px,3.4vw,40px)]" aria-labelledby="code-contribute" data-reveal>
            <h2 id="code-contribute" className="m-0 font-heading text-[clamp(22px,2.4vw,26px)] leading-[1.4] font-bold text-ink">
              {t("参与开发")}
            </h2>
            <p className="m-0 mt-3 max-w-[72ch] text-[15.5px] leading-[1.95] text-body">
              {t(
                "可以从各仓库的 Issue 中寻找任务：good first issue 通常适合初次参与，no-code 以词库、图标或文档等非代码工作为主，help wanted 表示需要协助，needs-design 建议先讨论方案。任务范围与要求以具体 Issue 为准。"
              )}
            </p>
            <p className="m-0 mt-2 max-w-[72ch] text-[15.5px] leading-[1.95] text-body">
              {t("不写代码也能参与：遇到问题或有功能建议，可以在")}
              <LocaleLink to="/feedback/">{t("Bug 与需求反馈")}</LocaleLink>
              {t("提交，无需 GitHub 账号；想补充常用词，可以在")}
              <LocaleLink to="/words/">{t("词库缺失反馈")}</LocaleLink>
              {t("提交词条。")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <AnchorButton href={`${GITHUB_DOCS}/CONTRIBUTING.md`} size="md">
                {t("贡献指南")}
              </AnchorButton>
              <AnchorButton href={`${GITHUB_DOCS}/RECRUITING.md`} variant="secondary" size="md">
                {t("招募开源开发者")}
              </AnchorButton>
              <LinkButton to="/about/" variant="ghost" size="md">
                {t("关于项目")}
              </LinkButton>
            </div>
          </Card>
        </Container>
      </main>
    </>
  );
}
