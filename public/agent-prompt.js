const VISUAL_DNA_LABELS = Object.freeze({
  discipline: "設計領域",
  artifact: "產物類型",
  lineage: "設計譜系",
  composition: "構圖",
  grid: "網格",
  hierarchy: "資訊層級",
  density: "密度",
  whitespace: "留白",
  rhythm: "節奏",
  typography: "字體",
  color: "色彩",
  imagery: "影像",
  material: "材質",
  interaction: "互動線索",
});

function cleanText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function readableValue(value) {
  if (Array.isArray(value)) {
    return value.map(readableValue).filter(Boolean).join("、");
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        const content = readableValue(item);
        return content ? `${key}: ${content}` : "";
      })
      .filter(Boolean)
      .join("；");
  }
  return cleanText(value);
}

function textList(value) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items.map(readableValue).filter(Boolean);
}

function appendBullets(lines, heading, items) {
  const values = textList(items);
  if (!values.length) return;
  lines.push(`### ${heading}`, ...values.map((item) => `- ${item}`), "");
}

function appendText(lines, heading, value) {
  const text = cleanText(value);
  if (!text) return;
  lines.push(`### ${heading}`, text, "");
}

export function joinLocalAssetPath(inboxPath, relativePath) {
  const root = cleanText(inboxPath).replace(/[\\/]+$/, "");
  const relative = cleanText(relativePath).replace(/^[\\/]+/, "");
  if (!root) return relative;
  if (!relative) return root;
  const separator = root.includes("\\") && !root.includes("/") ? "\\" : "/";
  return `${root}${separator}${relative.replace(/[\\/]+/g, separator)}`;
}

export function hasExportableAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object") return false;
  return Boolean(
    cleanText(analysis.description) ||
      Object.values(analysis.visualDna || {}).some((value) => readableValue(value)) ||
      (analysis.palette || []).length ||
      (analysis.whyItWorks || []).length ||
      (analysis.recipe || []).length ||
      Object.values(analysis.prompts || {}).some((value) => cleanText(value)),
  );
}

export function buildAgentPrompt({ asset, analysis, inboxPath = "" }) {
  if (!asset || typeof asset !== "object") {
    throw new TypeError("asset is required");
  }
  if (!hasExportableAnalysis(analysis)) {
    throw new Error("這張素材尚未有可匯出的 Codex 分析結果。");
  }

  const data = analysis.data && typeof analysis.data === "object" ? analysis.data : {};
  const lines = [
    "# Stylebase Agent Reference Prompt",
    "",
    "## 本次任務",
    "[請在這裡描述要完成的 UI／UX 任務、目標使用者、平台與交付範圍]",
    "",
    "## Agent 工作方式",
    "- 先檢查目標專案的既有設計系統、元件、內容與技術限制，再決定如何採用這份參考。",
    "- 將此素材視為設計證據，不要逐像素照抄品牌資產、文案或受保護內容。",
    "- 優先轉譯構圖、層級、節奏、字體角色、色彩角色與互動原則；未被證據支持的細節不要自行捏造。",
    "- 若本機原圖路徑可讀，先檢視原圖；Codex 分析是可修正的輔助脈絡，不取代原圖與人工判斷。",
    "- 在執行外部寫入、破壞性操作或擴大任務範圍前，先取得使用者確認。",
    "",
    "## 參考素材",
    `- 標題：${cleanText(asset.title) || cleanText(asset.fileName) || "未命名素材"}`,
  ];

  const absolutePath = joinLocalAssetPath(inboxPath, asset.relativePath);
  if (absolutePath) lines.push(`- 本機原圖：${absolutePath}`);
  if (cleanText(asset.relativePath)) lines.push(`- 相對路徑：${cleanText(asset.relativePath)}`);
  if (cleanText(asset.sourceUrl)) lines.push(`- 來源：${cleanText(asset.sourceUrl)}`);
  if (cleanText(asset.rightsNote)) lines.push(`- 權利備註：${cleanText(asset.rightsNote)}`);
  if (cleanText(asset.notes)) lines.push(`- 人工筆記：${cleanText(asset.notes)}`);
  lines.push("");

  lines.push("## 分析證據");
  const provenance = [
    analysis.provider ? `提供者：${cleanText(analysis.provider)}` : "",
    analysis.model ? `模型：${cleanText(analysis.model)}` : "",
    analysis.version ? `分析版本：${cleanText(analysis.version)}` : "",
    analysis.promptVersion ? `Prompt 版本：${cleanText(analysis.promptVersion)}` : "",
    analysis.analyzedAt ? `分析時間：${cleanText(analysis.analyzedAt)}` : "",
    Number.isFinite(analysis.confidence)
      ? `信心度：${Math.round(
          analysis.confidence <= 1 ? analysis.confidence * 100 : analysis.confidence,
        )}%`
      : "",
  ].filter(Boolean);
  if (provenance.length) lines.push(`- ${provenance.join("；")}`, "");

  appendText(lines, "摘要", data.summary || analysis.description);
  if (data.summary && cleanText(analysis.description) !== cleanText(data.summary)) {
    appendText(lines, "詳細描述", analysis.description);
  }

  const visualDna = Object.entries(analysis.visualDna || {})
    .map(([key, value]) => {
      const content = readableValue(value);
      return content ? `${VISUAL_DNA_LABELS[key] || key}：${content}` : "";
    })
    .filter(Boolean);
  appendBullets(lines, "Visual DNA", visualDna);

  const palette = (analysis.palette || [])
    .map((swatch) => {
      const hex = cleanText(swatch?.hex);
      const name = cleanText(swatch?.name);
      return hex ? `${hex}${name ? ` — ${name}` : ""}` : "";
    })
    .filter(Boolean);
  appendBullets(lines, "色票", palette);
  appendBullets(lines, "標籤", data.tags);
  appendBullets(lines, "元件", data.components);
  appendBullets(lines, "為何有效", analysis.whyItWorks);
  appendBullets(lines, "實作建議", analysis.recipe);

  const avoid = [...textList(data.avoid), ...textList(analysis.prompts?.negative)];
  appendBullets(lines, "避免事項", [...new Set(avoid)]);

  const promptHints = [
    ["UI 實作", analysis.prompts?.implementation],
    ["Design tokens", analysis.prompts?.tokens],
    ["視覺生成", analysis.prompts?.visual],
  ].filter(([, value]) => cleanText(value));
  if (promptHints.length) {
    lines.push("## 可直接採用的設計提示");
    for (const [heading, value] of promptHints) {
      appendText(lines, heading, value);
    }
  }

  lines.push(
    "## 成功條件",
    "- 產出符合本次任務與目標使用者，而不是重製參考圖。",
    "- 能指出採用了哪些參考證據，以及哪些部分因專案限制而調整或捨棄。",
    "- 保持響應式、可存取性、內容真實性與既有設計系統一致。",
    "- 完成後以實際畫面與必要測試驗證，不只描述預期結果。",
    "",
    "## 回覆格式",
    "1. 先用短段落說明採用的設計方向。",
    "2. 列出引用的參考證據與對應實作決策。",
    "3. 完成任務並回報變更位置、驗證結果、限制與下一步。",
  );

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
