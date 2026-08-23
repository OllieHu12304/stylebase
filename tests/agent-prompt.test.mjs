import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentPrompt,
  buildStyleboardBrief,
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

test("buildStyleboardBrief distills image-led evidence without prompt history", () => {
  const asset = {
    title: "Editorial reference",
    fileName: "editorial.png",
    relativePath: "web/editorial.png",
    sourceUrl: "https://example.com/reference",
    rightsNote: "研究用，不重用品牌資產。",
    customTags: ["會員中心", "高對比"],
  };
  const brief = buildStyleboardBrief({
    asset,
    analysis: {
      ...analysis,
      visualDna: {
        ...analysis.visualDna,
        grid: "十二欄模組網格，內容跨越不同欄寬形成節奏。",
        hierarchy: "巨幅標題、短摘要、低調 metadata 三段式層級。",
        color: "紙白為背景、墨黑承載內容、校準藍只用於互動狀態。",
        imagery: "大比例裁切，保留單一明確焦點。",
        material: "平面紙張感與細線分隔。",
        interaction: "底線與藍色標示可點擊狀態。",
      },
      whyItWorks: [
        "層級能在第一眼被理解。",
        "有限色彩讓內容與互動角色保持清楚。",
        "不對稱構圖提供辨識度，同時保留穩定網格。",
        "這一項超過三筆，不應進入蒸餾輸出。",
      ],
    },
    inboxPath: "/Stylebase/library/inbox",
  });
  const fullPrompt = buildAgentPrompt({
    asset,
    analysis,
    inboxPath: "/Stylebase/library/inbox",
  });

  assert.match(brief, /^# Stylebase Styleboard Brief/);
  assert.match(brief, /原圖：\/Stylebase\/library\/inbox\/web\/editorial\.png/);
  assert.match(brief, /原圖是視覺事實/);
  assert.match(brief, /構圖：非對稱主視覺與模組網格/);
  assert.match(brief, /色彩角色：#171918 Ink \/ #F7F7F3 Paper/);
  assert.match(brief, /索引語意：editorial、minimal、會員中心、高對比/);
  assert.match(brief, /## Agent 交付/);
  assert.doesNotMatch(brief, /fixture-model|分析時間|Prompt 版本|可直接採用的設計提示/);
  assert.doesNotMatch(brief, /這一項超過三筆/);
  assert.ok(brief.length < fullPrompt.length);
  assert.doesNotMatch(brief, /undefined|null/);
});

test("hasExportableAnalysis rejects assets without Codex evidence", () => {
  assert.equal(hasExportableAnalysis({ data: {}, prompts: {} }), false);
  assert.throws(
    () => buildAgentPrompt({ asset: { title: "Empty" }, analysis: {} }),
    /尚未有可匯出/,
  );
  assert.throws(
    () => buildStyleboardBrief({ asset: { title: "Empty" }, analysis: {} }),
    /尚未有可匯出/,
  );
});
