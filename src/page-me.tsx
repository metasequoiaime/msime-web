import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Avatar } from "./account/avatar";
import { useAccount } from "./account/session";
import { cardGridClass, PagedList, SearchBox, SegmentedTabs, StatusCard, tabId, useSearch } from "./community/parts";
import { PluginCard, ResourceCard } from "./community/resource-card";
import { accountCall, ApiError, clipboardQuery, dictionaryQuery, ignoreBody, MAX_DATA_QUERY_BYTES, pluginsQuery, resourcesQuery, v1CandidateSkinsQuery, v1KeyboardSkinsQuery } from "./data/account";
import type { DictionaryEntry, DictionaryKind, Me } from "./data/schemas";
import { inputClass } from "./feedback/styles";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { CandidateSkinCard, fromV1Candidate, fromV1Keyboard, KeyboardSkinCard } from "./skins/skin-cards";
import { Button, Card, Container, copyText, cx, useToast } from "./ui";
import { usePageSearch } from "./use-page-search";
import { useLocale } from "./use-locale";

const TABS = ["skins", "dictionary", "quick", "clipboard", "saved", "account"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { skins: "我的皮肤", dictionary: "词库", quick: "快捷短语", clipboard: "云剪贴板", saved: "收藏", account: "账号" };

/**
 * 我的：the signed-in user's own data on msime-backend, read and changed through the account proxy. Not indexed and not in the sitemap; the static HTML is only the page frame, since everything on it belongs to one person.
 */
export function MePage() {
  const { t } = useLocale();
  usePageMeta();
  const { status, me, openLogin } = useAccount();
  const { choice, update } = usePageSearch();
  const tab = choice("tab", TABS, "skins");
  const panelId = `${useId()}-panel`;

  return (
    <>
      <PageHero variant="plain" kicker="水杉输入法账号" title="我的" lead="管理你在水杉输入法账号里的皮肤、词库、快捷短语、云剪贴板和收藏，与 App 中登录同一账号看到的内容一致。" />
      <main className="w-full">
        <Container className="pt-8">
          {status === "unknown" ? (
            <StatusCard busy>{t("正在读取账号…")}</StatusCard>
          ) : status === "signed-out" || !me ? (
            <StatusCard>
              <p className="m-0">{t("登录后查看和管理你的皮肤、词库、快捷短语、云剪贴板和收藏。")}</p>
              <Button size="sm" className="mt-4" onClick={openLogin}>{t("登录")}</Button>
            </StatusCard>
          ) : (
            <>
              <SegmentedTabs label="账号分区" values={TABS} labels={TAB_LABELS} value={tab} onChange={value => update({ tab: value === "skins" ? undefined : value }, true)} panelId={panelId} />
              <section id={panelId} role="tabpanel" aria-labelledby={tabId(panelId, tab)} className="mt-6">
                <h2 className="sr-only">{t(TAB_LABELS[tab])}</h2>
                {tab === "skins" && <MySkins />}
                {tab === "dictionary" && <Dictionaries />}
                {tab === "quick" && <DictionaryEditor kind="quick" />}
                {tab === "clipboard" && <CloudClipboard />}
                {tab === "saved" && <Saved />}
                {tab === "account" && <AccountPanel me={me} />}
              </section>
            </>
          )}
        </Container>
      </main>
    </>
  );
}

const hintClass = "m-0 text-sm leading-[1.75] text-muted";
const subheadingClass = "m-0 mb-3 font-heading text-[15.5px] font-bold text-ink";

/** A destructive button that asks once more in place: the first press arms it for a few seconds. */
function ConfirmButton({ label, confirm, onConfirm, disabled }: { label: string; confirm: string; onConfirm: () => void; disabled?: boolean }) {
  const { t } = useLocale();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cx(armed && "text-warn shadow-ring-warn hover:text-warn")}
      disabled={disabled}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    >
      {t(armed ? confirm : label)}
    </Button>
  );
}

// ---- 我的皮肤 ----

function MySkins() {
  const { t } = useLocale();
  const candidate = useInfiniteQuery(v1CandidateSkinsQuery("", undefined, "mine"));
  const keyboard = useInfiniteQuery(v1KeyboardSkinsQuery("", "mine"));
  return (
    <>
      <p className={hintClass}>{t("在水杉输入法 App 中发布和管理皮肤。私有的候选窗皮肤只有你自己能看到；被审核下架的作品只对你显示。")}</p>
      <h3 className={cx(subheadingClass, "mt-6")}>{t("候选窗皮肤")}</h3>
      <PagedList query={candidate} noun="候选窗皮肤" empty="你还没有候选窗皮肤。" compact>
        {items => (
          <ul className={cardGridClass}>
            {items.map(item => <CandidateSkinCard key={item.id} skin={fromV1Candidate(item)} own />)}
          </ul>
        )}
      </PagedList>
      <h3 className={cx(subheadingClass, "mt-10")}>{t("键盘皮肤")}</h3>
      <PagedList query={keyboard} noun="键盘皮肤" empty="你还没有发布键盘皮肤。" compact>
        {items => (
          <ul className={cardGridClass}>
            {items.map(item => <KeyboardSkinCard key={item.id} skin={fromV1Keyboard(item)} own />)}
          </ul>
        )}
      </PagedList>
    </>
  );
}

// ---- 词库与快捷短语 ----

const WORD_KINDS = ["pinyin", "wubi", "english"] as const;
const WORD_KIND_LABELS = { pinyin: "拼音", wubi: "五笔", english: "英文" };

function Dictionaries() {
  const [kind, setKind] = useState<(typeof WORD_KINDS)[number]>("pinyin");
  const panelId = `${useId()}-words`;
  return (
    <>
      <SegmentedTabs label="词库类型" values={WORD_KINDS} labels={WORD_KIND_LABELS} value={kind} onChange={setKind} panelId={panelId} size="sm" />
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(panelId, kind)} className="mt-5">
        <DictionaryEditor key={kind} kind={kind} />
      </div>
    </>
  );
}

const FIELDS: Record<DictionaryKind, { code: string; codeExample: string; word: string; wordExample: string; hint: string; noun: string }> = {
  pinyin: { code: "拼音", codeExample: "nihao", word: "词语", wordExample: "你好", noun: "拼音词条", hint: "你在任意设备上新增的拼音词条，至少两个字。修改会同步到登录同一账号的所有设备。" },
  wubi: { code: "五笔编码", codeExample: "wqvb", word: "词语", wordExample: "你好", noun: "五笔词条", hint: "你新增的五笔词条。修改会同步到登录同一账号的所有设备。" },
  english: { code: "编码", codeExample: "hello", word: "单词", wordExample: "Hello", noun: "英文词条", hint: "你新增的英文单词。修改会同步到登录同一账号的所有设备。" },
  quick: { code: "编码", codeExample: "dz", word: "短语", wordExample: "北京市朝阳区…", noun: "快捷短语", hint: "输入编码时，短语会出现在候选中，最长 199 个字符。修改会同步到登录同一账号的所有设备。" },
};

const DICTIONARY_ERRORS: Record<string, string> = {
  dictionary_duplicate: "已有相同编码和文字的词条。",
  revision_conflict: "这个词条已在其他设备上修改，列表已刷新，请重试。",
  invalid_dictionary_entry: "编码或文字不符合规则，请检查后重试。",
  dictionary_limit: "词条数量已达上限。",
  not_found: "这个词条已被删除，列表已刷新。",
  rate_limit_exceeded: "操作太频繁，请稍后再试。",
};

const dictionaryError = (error: unknown) => (error instanceof ApiError ? DICTIONARY_ERRORS[error.code] ?? (error.status >= 500 ? "词库服务暂时不可用，请稍后再试。" : "操作失败，请稍后再试。") : "网络连接失败，请稍后再试。");

const DEFAULT_WEIGHT = 10;

type Draft = { code: string; word: string; weight: string };
const emptyDraft: Draft = { code: "", word: "", weight: String(DEFAULT_WEIGHT) };

/** Code, text and weight inputs, used for adding and for editing a row in place. */
function EntryFields({ kind, draft, onChange }: { kind: DictionaryKind; draft: Draft; onChange: (draft: Draft) => void }) {
  const { t } = useLocale();
  const fields = FIELDS[kind];
  const field = cx(inputClass, "mt-0 h-10 bg-panel");
  return (
    <>
      <label className="min-w-0">
        <span className="sr-only">{t(fields.code)}</span>
        <input className={cx(field, "font-mono")} value={draft.code} placeholder={`${t(fields.code)}：${fields.codeExample}`} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={512} required onChange={event => onChange({ ...draft, code: event.target.value })} />
      </label>
      <label className="min-w-0">
        <span className="sr-only">{t(fields.word)}</span>
        <input className={field} value={draft.word} placeholder={`${t(fields.word)}：${t(fields.wordExample)}`} autoComplete="off" spellCheck={false} maxLength={kind === "quick" ? 199 : 2048} required onChange={event => onChange({ ...draft, word: event.target.value })} />
      </label>
      <label className="min-w-0">
        <span className="sr-only">{t("权重")}</span>
        <input className={cx(field, "tabular-nums")} type="number" min={0} step={1} inputMode="numeric" value={draft.weight} placeholder={t("权重")} title={t("权重，越大越靠前")} required onChange={event => onChange({ ...draft, weight: event.target.value })} />
      </label>
    </>
  );
}

const rowGrid = "grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_88px_auto] sm:items-center";

function DictionaryEditor({ kind }: { kind: DictionaryKind }) {
  const { t } = useLocale();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const search = useSearch();
  const entries = useInfiniteQuery(dictionaryQuery(kind, search.query));
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const fields = FIELDS[kind];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["account", "dictionary", kind] });

  /** One write to the user's dictionary. Conflicts and deleted rows refresh the list so the next try uses the current revision. */
  const write = async (path: string, method: "POST" | "PUT" | "DELETE", body: unknown, done: string) => {
    setBusy(true);
    try {
      await accountCall(path, ignoreBody, { method, body });
      show(t(done));
      await refresh();
      return true;
    } catch (error) {
      show(t(dictionaryError(error)));
      if (error instanceof ApiError && (error.code === "revision_conflict" || error.code === "not_found")) void refresh();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (await write(`/api/v1/users/me/dictionaries/${kind}`, "POST", { code: draft.code.trim(), word: draft.word, weight: Number(draft.weight) }, "已添加")) setDraft(emptyDraft);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className={cx(hintClass, "max-w-[640px]")}>{t(fields.hint)}</p>
        <SearchBox label={`搜索${fields.noun}`} maxBytes={MAX_DATA_QUERY_BYTES} search={search} />
      </div>
      <form className="mt-5 rounded-tile bg-panel-2 p-3" onSubmit={add} aria-label={t(`添加${fields.noun}`)}>
        <div className={rowGrid}>
          <EntryFields kind={kind} draft={draft} onChange={setDraft} />
          <Button type="submit" size="sm" className="h-10" disabled={busy}>{t("添加")}</Button>
        </div>
      </form>
      <div className="mt-4">
        <PagedList query={entries} noun={fields.noun} empty={search.query ? `没有包含「${search.query}」的${fields.noun}。` : `还没有${fields.noun}。`} compact>
          {items => (
            <Card as="div" tone="raised" className="rounded-tile p-1.5">
              <ul className="m-0 list-none p-0">
                {items.map(entry => <EntryRow key={entry.id} kind={kind} entry={entry} busy={busy} write={write} />)}
              </ul>
            </Card>
          )}
        </PagedList>
      </div>
    </>
  );
}

function EntryRow({ kind, entry, busy, write }: { kind: DictionaryKind; entry: DictionaryEntry; busy: boolean; write: (path: string, method: "PUT" | "DELETE", body: unknown, done: string) => Promise<boolean> }) {
  const { t } = useLocale();
  const [editing, setEditing] = useState<Draft | null>(null);
  const path = `/api/v1/users/me/dictionaries/${kind}/${encodeURIComponent(entry.id)}`;

  if (editing)
    return (
      <li className="rounded-field bg-panel-2 p-2 not-first:mt-1">
        <form
          className={rowGrid}
          onSubmit={async event => {
            event.preventDefault();
            // The weight is sent every time: the backend resets an omitted weight to its default.
            if (await write(path, "PUT", { code: editing.code.trim(), word: editing.word, weight: Number(editing.weight), revision: entry.revision }, "已保存")) setEditing(null);
          }}
        >
          <EntryFields kind={kind} draft={editing} onChange={setEditing} />
          <div className="flex gap-1.5">
            <Button type="submit" size="sm" className="h-10" disabled={busy}>{t("保存")}</Button>
            <Button variant="ghost" size="sm" className="h-10" onClick={() => setEditing(null)}>{t("取消")}</Button>
          </div>
        </form>
      </li>
    );

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-field px-3 py-2 hover:bg-panel-2 not-first:mt-0.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_88px_auto]">
      <span className="truncate font-mono text-[13.5px] text-muted" title={entry.code}>{entry.code}</span>
      <span className="col-start-1 row-start-2 truncate text-[14.5px] text-ink sm:col-start-auto sm:row-start-auto" title={entry.word}>{entry.word}</span>
      <span className="hidden text-[13px] text-muted tabular-nums sm:block" title={t("权重")}>{entry.weight}</span>
      <span className="col-start-2 row-span-2 row-start-1 flex justify-end gap-1.5 sm:col-start-auto sm:row-span-1 sm:row-start-auto">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing({ code: entry.code, word: entry.word, weight: String(entry.weight) })}>{t("编辑")}</Button>
        <ConfirmButton label="删除" confirm="确认删除" disabled={busy} onConfirm={() => void write(path, "DELETE", { revision: entry.revision }, "已删除")} />
      </span>
    </li>
  );
}

// ---- 云剪贴板 ----

const formatTime = (value: string, tw: boolean) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(tw ? "zh-TW" : "zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

function CloudClipboard() {
  const { t, tw } = useLocale();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const search = useSearch();
  const clipboard = useQuery(clipboardQuery(search.query));
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["account", "clipboard"] });

  const run = async (path: string, method: "PUT" | "DELETE", body: unknown, done: string) => {
    setBusy(true);
    try {
      await accountCall(path, ignoreBody, { method, body });
      show(t(done));
      await refresh();
    } catch (error) {
      show(t(error instanceof ApiError && error.code === "not_found" ? "这条记录已被删除。" : "操作失败，请稍后再试。"));
      void refresh();
    } finally {
      setBusy(false);
      setConfirmOff(false);
    }
  };

  const setEnabled = (enabled: boolean) => run("/api/v1/users/me/clipboard/settings", "PUT", { enabled }, enabled ? "已开启云剪贴板同步" : "已关闭云剪贴板同步，服务器上的记录已删除");

  if (clipboard.isPending) return <StatusCard busy compact>{t("正在读取云剪贴板…")}</StatusCard>;
  if (clipboard.isError)
    return (
      <StatusCard compact>
        <p className="m-0">{t("暂时无法读取云剪贴板，请稍后再试。")}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => void clipboard.refetch()}>{t("重试")}</Button>
      </StatusCard>
    );

  const { enabled, items } = clipboard.data;
  return (
    <>
      <Card tone="muted" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-tile px-5 py-4">
        <div className="min-w-0 flex-1 basis-[320px]">
          <p className="m-0 text-[14.5px] font-semibold text-ink">{t("同步云剪贴板")}</p>
          <p className="m-0 mt-1 text-[13.5px] leading-[1.7] text-muted">{t("开启后，登录同一账号的设备共享最近 50 条剪贴板记录。这些内容保存在水杉输入法的服务器上；关闭同步会删除服务器上的全部记录。")}</p>
        </div>
        {confirmOff ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] text-warn">{t("关闭后服务器上的记录会被删除")}</span>
            <Button variant="ghost" size="sm" className="text-warn shadow-ring-warn hover:text-warn" disabled={busy} onClick={() => void setEnabled(false)}>{t("确认关闭")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOff(false)}>{t("取消")}</Button>
          </div>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={t("同步云剪贴板")}
            disabled={busy}
            className={cx("relative h-7 w-12 flex-none cursor-pointer rounded-full border-0 p-0 transition-colors disabled:opacity-45", enabled ? "bg-accent" : "bg-hair-2")}
            onClick={() => (enabled ? setConfirmOff(true) : void setEnabled(true))}
          >
            <span className={cx("absolute top-1 left-1 size-5 rounded-full bg-panel shadow-tab transition-transform", enabled && "translate-x-5")} />
          </button>
        )}
      </Card>
      {(enabled || items.length > 0) && (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <SearchBox label="搜索剪贴板内容" maxBytes={MAX_DATA_QUERY_BYTES} search={search} />
            {items.length > 0 && !search.query && <ConfirmButton label="清空全部" confirm="确认清空" disabled={busy} onConfirm={() => void run("/api/v1/users/me/clipboard", "DELETE", undefined, "已清空云剪贴板")} />}
          </div>
          <div className="mt-4">
            {items.length === 0 ? (
              <StatusCard compact>{t(search.query ? `没有包含「${search.query}」的记录。` : "云剪贴板里还没有内容。")}</StatusCard>
            ) : (
              <Card as="div" tone="raised" className="rounded-tile p-1.5">
                <ul className="m-0 list-none p-0">
                  {items.map(item => (
                    <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-field px-3 py-2.5 hover:bg-panel-2 not-first:mt-0.5">
                      <div className="min-w-0">
                        <p className="m-0 line-clamp-3 text-[14.5px] leading-[1.7] whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">{item.text}</p>
                        <p className="m-0 mt-0.5 text-xs text-muted tabular-nums">{formatTime(item.updated_at, tw)}</p>
                      </div>
                      <span className="flex gap-1.5">
                        <Button variant="ghost" size="sm" onClick={async () => show(t((await copyText(item.text)) ? "已复制" : "复制失败，请手动选择文字"))}>{t("复制")}</Button>
                        <ConfirmButton label="删除" confirm="确认删除" disabled={busy} onConfirm={() => void run(`/api/v1/users/me/clipboard/${encodeURIComponent(item.id)}`, "DELETE", undefined, "已删除")} />
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ---- 收藏 ----

const SAVED_KINDS = ["keyboard", "candidate", "plugin", "dictionary", "reply"] as const;
type SavedKind = (typeof SAVED_KINDS)[number];
const SAVED_LABELS: Record<SavedKind, string> = { keyboard: "键盘皮肤", candidate: "候选窗皮肤", plugin: "插件", dictionary: "词库", reply: "回复模板" };

function Saved() {
  const [kind, setKind] = useState<SavedKind>("keyboard");
  const panelId = `${useId()}-saved`;
  return (
    <>
      <SegmentedTabs label="收藏类型" values={SAVED_KINDS} labels={SAVED_LABELS} value={kind} onChange={setKind} panelId={panelId} size="sm" />
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(panelId, kind)} className="mt-5">
        {kind === "keyboard" && <SavedKeyboard />}
        {kind === "candidate" && <SavedCandidate />}
        {kind === "plugin" && <SavedPlugins />}
        {(kind === "dictionary" || kind === "reply") && <SavedResources key={kind} kind={kind} />}
      </div>
    </>
  );
}

const savedEmpty = (kind: SavedKind) => `还没有收藏的${SAVED_LABELS[kind]}。`;

function SavedKeyboard() {
  const items = useInfiniteQuery(v1KeyboardSkinsQuery("", "saved"));
  return (
    <PagedList query={items} noun="收藏" empty={savedEmpty("keyboard")} compact>
      {rows => <ul className={cardGridClass}>{rows.map(item => <KeyboardSkinCard key={item.id} skin={fromV1Keyboard(item)} />)}</ul>}
    </PagedList>
  );
}

function SavedCandidate() {
  const items = useInfiniteQuery(v1CandidateSkinsQuery("", undefined, "saved"));
  return (
    <PagedList query={items} noun="收藏" empty={savedEmpty("candidate")} compact>
      {rows => <ul className={cardGridClass}>{rows.map(item => <CandidateSkinCard key={item.id} skin={fromV1Candidate(item)} />)}</ul>}
    </PagedList>
  );
}

function SavedPlugins() {
  const items = useInfiniteQuery(pluginsQuery("", undefined, "saved", true));
  return (
    <PagedList query={items} noun="收藏" empty={savedEmpty("plugin")} compact>
      {rows => <ul className={cardGridClass}>{rows.map(item => <PluginCard key={item.id} item={item} />)}</ul>}
    </PagedList>
  );
}

function SavedResources({ kind }: { kind: "dictionary" | "reply" }) {
  const items = useInfiniteQuery(resourcesQuery(kind, "", "saved", true));
  return (
    <PagedList query={items} noun="收藏" empty={savedEmpty(kind)} compact>
      {rows => <ul className={cardGridClass}>{rows.map(item => <ResourceCard key={item.id} item={item} />)}</ul>}
    </PagedList>
  );
}

// ---- 账号 ----

const PROVIDERS: Record<string, string> = { google: "Google", apple: "Apple", wechat: "微信", phone: "手机号", email: "邮箱", anonymous: "匿名账号" };

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 py-2.5 not-first:shadow-divider-t">
      <dt className="text-[13.5px] text-muted">{t(label)}</dt>
      <dd className="m-0 min-w-0 truncate text-[14.5px] text-ink">{children}</dd>
    </div>
  );
}

function AccountPanel({ me }: { me: Me }) {
  const { t, tw } = useLocale();
  const { show } = useToast();
  const { signOut } = useAccount();
  const queryClient = useQueryClient();
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const created = new Date(me.user.created_at);
  const providers = [...new Set(me.identities.map(identity => PROVIDERS[identity.provider] ?? identity.provider))];

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    if (name === null) return;
    setBusy(true);
    try {
      await accountCall("/api/v1/users/me", ignoreBody, { method: "PATCH", body: { display_name: name.trim() } });
      await queryClient.invalidateQueries({ queryKey: ["account", "me"] });
      setName(null);
      show(t("昵称已更新"));
    } catch (error) {
      show(t(error instanceof ApiError && error.code === "invalid_display_name" ? "昵称最长 64 个字符。" : "保存失败，请稍后再试。"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card tone="raised" className="max-w-[560px] rounded-tile px-6 py-5">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar user={me.user} size={56} />
        <div className="min-w-0 flex-1">
          {name === null ? (
            <div className="flex min-w-0 items-center gap-2">
              <p className="m-0 truncate font-heading text-lg font-bold text-ink">{me.user.display_name}</p>
              <Button variant="ghost" size="sm" className="flex-none" onClick={() => setName(me.user.display_name)}>{t("修改昵称")}</Button>
            </div>
          ) : (
            <form className="flex min-w-0 gap-2" onSubmit={rename}>
              <label className="min-w-0 flex-1">
                <span className="sr-only">{t("昵称")}</span>
                <input className={cx(inputClass, "mt-0 h-9")} value={name} maxLength={64} required onChange={event => setName(event.target.value)} />
              </label>
              <Button type="submit" size="sm" disabled={busy || !name.trim()}>{t("保存")}</Button>
              <Button variant="ghost" size="sm" onClick={() => setName(null)}>{t("取消")}</Button>
            </form>
          )}
          {me.user.email && <p className="m-0 mt-0.5 truncate text-[13.5px] text-muted">{me.user.email}</p>}
        </div>
      </div>
      <dl className="m-0 mt-4">
        {providers.length > 0 && <InfoRow label="登录方式">{t(providers.join("、"))}</InfoRow>}
        {!Number.isNaN(created.getTime()) && <InfoRow label="注册时间">{created.toLocaleDateString(tw ? "zh-TW" : "zh-CN", { year: "numeric", month: "long", day: "numeric" })}</InfoRow>}
      </dl>
      <p className={cx(hintClass, "mt-3")}>{t("更换头像、绑定其他登录方式和注销账号，请在水杉输入法 App 的账号页操作。")}</p>
      <div className="mt-5 flex">
        <Button variant="secondary" size="sm" onClick={() => void signOut()}>{t("退出登录")}</Button>
      </div>
    </Card>
  );
}
