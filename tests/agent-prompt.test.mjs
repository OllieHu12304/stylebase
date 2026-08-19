import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentPrompt,
  hasExportableAnalysis,
  joinLocalAssetPath,
} from "../public/agent-prompt.js";

const analysis = {
  data: {
    summary: "克制的編輯式產品介面。",
    tags: ["editorial", "minimal"],
    components: ["hero", "reference grid"],
    avoid: ["過度裝飾"],
  },
  description: "以非對稱構圖、清楚字級與大量留白建立閱讀節奏。",
  visualDna: {
    composition: "非對稱主視覺與模組網格",
    typography: { category: "Grotesk sans", weight: "Bold / Regular" },
  },
  palette: [
    { hex: "#171918", name: "Ink" },
    { hex: "#F7F7F3", name: "Paper" },
  ],
  whyItWorks: ["層級能在第一眼被理解"],
  recipe: ["先建立字級與間距 token"],
  prompts: {
    implementation: "建立可響應的十二欄編輯式介面。",
    tokens: "定義紙白、墨黑與單一校準藍。",
    visual: "克制的編輯式產品構圖。",
    negative: "避免玻璃擬態與裝飾漸層。",
  },
  provider: "codex",
  model: "fixture-model",
  version: 2,
  promptVersion: "stylebase-visual-v1",
  analyzedAt: "2026-08-19T12:00:00.000Z",
  confidence: 0.91,
};

test("joinLocalAssetPath preserves Windows and POSIX path styles", () => {
  assert.equal(
    joinLocalAssetPath("C:\\Stylebase\\library\\inbox", "web/hero.png"),
    "C:\\Stylebase\\library\\inbox\\web\\hero.png",
  );
  assert.equal(
    joinLocalAssetPath("/Users/me/stylebase/library/inbox/", "web/hero.png"),
    "/Users/me/stylebase/library/inbox/web/hero.png",
  );
});

test("buildAgentPrompt exports traceable visual evidence and task boundaries", () => {
  const prompt = buildAgentPrompt({
    asset: {
      title: "Editorial reference",
      fileName: "editorial.png",
      relativePath: "web/editorial.png",
      sourceUrl: "https://example.com/reference",
      rightsNote: "研究用，不重用品牌資產。",
      notes: "關注資訊層級。",
      customTags: ["會員中心", "高對比"],
    },
    analysis,
    inboxPath: "/Stylebase/library/inbox",
  });

  assert.match(prompt, /## 本次任務/);
  assert.match(prompt, /本機原圖：\/Stylebase\/library\/inbox\/web\/editorial\.png/);
  assert.match(prompt, /分析版本：2/);
  assert.match(prompt, /構圖：非對稱主視覺與模組網格/);
  assert.match(prompt, /#171918 — Ink/);
  assert.match(prompt, /### 自訂標籤\n- 會員中心\n- 高對比/);
  assert.match(prompt, /## 成功條件/);
  assert.match(prompt, /## 回覆格式/);
  assert.doesNotMatch(prompt, /undefined|null/);
});

test("hasExportableAnalysis rejects assets without Codex evidence", () => {
  assert.equal(hasExportableAnalysis({ data: {}, prompts: {} }), false);
  assert.throws(
    () => buildAgentPrompt({ asset: { title: "Empty" }, analysis: {} }),
    /尚未有可匯出/,
  );
});
