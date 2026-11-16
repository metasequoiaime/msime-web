/*
 * GitHub 在 `html_url` 和 `browser_download_url` 里回的仓库名，大小写不保证和请求时写的一致：同一个仓库、同一条 release，一次请求拿到 `metasequoiaime/msime-linux`，另一次拿到 `metasequoiaime/MSIME-Linux`。改过名的仓库尤其如此。
 *
 * 两份清单都拿这个地址做过「这个产物确实来自我们自己的仓库」的前缀校验，而那个校验是区分大小写的，于是它答不答得上取决于是哪台边缘节点回的这一次：platforms.json 那边前缀对不上就把该平台的产物全部丢掉，最后连整个平台一起从清单里消失，页面上 macOS 和 Linux 只剩「前往发布页」，全程没有任何报错；update.json 那边则直接抛错，整轮同步失败。
 *
 * 所以比较时不看大小写，通过之后把地址换回调用方配置的那个拼法再写进清单 —— 输出只取决于上游发了什么，不取决于谁回的这次请求。否则大小写每翻一次就是一份新清单、一个 PR 和一次生产部署。
 *
 * 只规整仓库名那一段。tag 名和文件名是区分大小写的，原样保留。
 */
export function canonicalGithubUrl(repository, url) {
  const prefix = `https://github.com/${repository}/`;
  if (typeof url !== 'string' || !url.toLowerCase().startsWith(prefix.toLowerCase())) return null;
  return prefix + url.slice(prefix.length);
}
