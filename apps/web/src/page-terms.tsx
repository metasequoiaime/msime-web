import termsSource from "./content/terms.md?raw";
import { ContentPage } from "./page-content";

export function TermsPage() {
  return (
    <ContentPage
      documentTitle="用户协议 | 水杉输入法"
      description="水杉输入法用户协议：账号、云同步、社区与官网等在线服务的使用规则"
      kicker="用户协议"
      source={termsSource}
      contentId="terms-content"
      contentClass="terms-content"
      sectioned
    />
  );
}
