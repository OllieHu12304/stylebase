import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { createCatalog } from "../src/db.mjs";
import {
  ensureLibraryDirectories,
  moveAssetToTrash,
  resolveAssetPath,
  restoreTrashedAsset,
  saveUploadedImage,
  scanInbox,
} from "../src/library.mjs";

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("saveUploadedImage and scanInbox import a valid PNG without auto-dispatch", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "stylebase-library-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const dataDir = path.join(root, "data");
  const inboxDir = path.join(root, "inbox");
  await ensureLibraryDirectories({ dataDir, inboxDir });

  const records = new Map();
  let queued = 0;
  let seen = [];
  const catalog = {
    upsertAsset(record) {
      const existing = [...records.values()].find(
        (item) => item.sha256 === record.sha256,
      );
      if (existing) {
        return { asset: existing, isNew: false, isDuplicate: true };
      }
      const asset = {
        ...record,
        fileStatus: "active",
        analysisStatus: "pending",
      };
      records.set(record.id, asset);
      return { asset, isNew: true, isDuplicate: false };
    },
    enqueueAnalysis() {
      queued += 1;
    },
    markMissingExcept(paths) {
      seen = paths;
    },
  };

  const uploaded = await saveUploadedImage({
    inboxDir,
    name: "我的參考.png",
    type: "image/png",
    data: ONE_PIXEL_PNG,
  });
  assert.equal(uploaded.width, 1);
  assert.equal(uploaded.height, 1);
  assert.equal(uploaded.relativePath, "我的參考.png");

  const result = await scanInbox({
    catalog,
    inboxDir,
    autoAnalyze: false,
  });
  assert.equal(result.scanned, 1);
  assert.equal(result.imported, 1);
  assert.equal(result.queued, 0);
  assert.equal(queued, 0);
  assert.deepEqual(seen, ["我的參考.png"]);
  assert.equal([...records.values()][0].mimeType, "image/png");
});

test("saveUploadedImage rejects disguised non-image data", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "stylebase-library-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  await assert.rejects(
    saveUploadedImage({
      inboxDir: root,
      name: "not-an-image.png",
      type: "image/png",
      data: Buffer.from("not an image").toString("base64"),
    }),
    /不是支援的/,
  );
});

test("resolveAssetPath refuses traversal outside the inbox", () => {
  const inbox = path.resolve("D:/stylebase/library/inbox");
  assert.throws(
    () => resolveAssetPath(inbox, "../../outside.png"),
    /不在 Stylebase 圖片資料夾內/,
  );
});

test("moveAssetToTrash preserves the original image for manual recovery", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "stylebase-library-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const dataDir = path.join(root, "data");
  const inboxDir = path.join(root, "inbox");
  const trashDir = path.join(root, "trash");
  await ensureLibraryDirectories({ dataDir, inboxDir, trashDir });
  const uploaded = await saveUploadedImage({
    inboxDir,
    name: "可復原素材.png",
    type: "image/png",
    data: ONE_PIXEL_PNG,
  });

  const moved = await moveAssetToTrash({
    inboxDir,
    trashDir,
    relativePath: uploaded.relativePath,
    assetId: 42,
  });
  assert.equal(moved.moved, true);
  await assert.rejects(stat(uploaded.absolutePath), { code: "ENOENT" });
  assert.deepEqual(await readdir(trashDir), [moved.trashName]);

  assert.equal(await restoreTrashedAsset(moved), true);
  assert.equal((await stat(uploaded.absolutePath)).isFile(), true);
  assert.deepEqual(await readdir(trashDir), []);
});

test("deleteAsset removes dependent jobs and collection links", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "stylebase-catalog-"));
  const dataDir = path.join(root, "data");
  const inboxDir = path.join(root, "inbox");
  const catalog = createCatalog(path.join(dataDir, "catalog.sqlite"));
  t.after(async () => {
    catalog.close();
    await rm(root, { recursive: true, force: true });
  });
  await ensureLibraryDirectories({ dataDir, inboxDir });
  await saveUploadedImage({
    inboxDir,
    name: "待移除素材.png",
    type: "image/png",
    data: ONE_PIXEL_PNG,
  });
  await scanInbox({ catalog, inboxDir, autoAnalyze: false });
  const asset = catalog.listAssets({ limit: 10 }).items[0];
  const collection = catalog.createCollection("測試收藏集");
  catalog.addCollectionItem(collection.id, asset.id);
  catalog.enqueueAnalysis(asset.id);

  assert.equal(catalog.deleteAsset(asset.id)?.id, asset.id);
  assert.equal(catalog.getAsset(asset.id), null);
  assert.equal(catalog.listJobs({ assetId: asset.id }).total, 0);
  assert.equal(catalog.getCollection(collection.id).itemCount, 0);
});

test(
  "collections support batch add, dynamic covers, rename, reorder, and delete",
  async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "stylebase-collections-"));
    const catalog = createCatalog(path.join(root, "catalog.sqlite"));
    t.after(async () => {
      catalog.close();
      await rm(root, { recursive: true, force: true });
    });

    const firstAsset = catalog.upsertAsset({
      sha256: "1".repeat(64),
      relativePath: "first.png",
      fileName: "first.png",
      mimeType: "image/png",
    }).asset;
    const secondAsset = catalog.upsertAsset({
      sha256: "2".repeat(64),
      relativePath: "second.png",
      fileName: "second.png",
      mimeType: "image/png",
    }).asset;
    const thirdAsset = catalog.upsertAsset({
      sha256: "3".repeat(64),
      relativePath: "third.png",
      fileName: "third.png",
      mimeType: "image/png",
    }).asset;
    const fourthAsset = catalog.upsertAsset({
      sha256: "4".repeat(64),
      relativePath: "fourth.png",
      fileName: "fourth.png",
      mimeType: "image/png",
    }).asset;
    const fifthAsset = catalog.upsertAsset({
      sha256: "5".repeat(64),
      relativePath: "fifth.png",
      fileName: "fifth.png",
      mimeType: "image/png",
    }).asset;
    const firstCollection = catalog.createCollection("First");
    const secondCollection = catalog.createCollection("Second");

    const populated = catalog.addCollectionItems(firstCollection.id, [
      firstAsset.id,
      secondAsset.id,
      thirdAsset.id,
      fourthAsset.id,
      fifthAsset.id,
      firstAsset.id,
    ]);
    assert.equal(populated.itemCount, 5);
    assert.deepEqual(populated.coverAssetIds, [
      String(fifthAsset.id),
      String(fourthAsset.id),
      String(thirdAsset.id),
      String(secondAsset.id),
    ]);
    assert.deepEqual(
      catalog.listCollections()[0].coverAssetIds,
      populated.coverAssetIds,
    );

    const removed = catalog.removeCollectionItem(
      firstCollection.id,
      fifthAsset.id,
    );
    assert.equal(removed.removed, true);
    assert.equal(removed.collection.itemCount, 4);
    assert.deepEqual(removed.collection.coverAssetIds, [
      String(fourthAsset.id),
      String(thirdAsset.id),
      String(secondAsset.id),
      String(firstAsset.id),
    ]);

    const renamed = catalog.updateCollection(firstCollection.id, {
      name: "Renamed",
    });
    assert.equal(renamed.name, "Renamed");

    const reordered = catalog.reorderCollections([
      secondCollection.id,
      firstCollection.id,
    ]);
    assert.deepEqual(
      reordered.map((collection) => collection.id),
      [secondCollection.id, firstCollection.id],
    );

    assert.equal(
      catalog.deleteCollection(secondCollection.id).id,
      secondCollection.id,
    );
    assert.deepEqual(
      catalog.listCollections().map((collection) => collection.id),
      [firstCollection.id],
    );
  },
);

test("custom tags persist independently and participate in search", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "stylebase-tags-"));
  const dataDir = path.join(root, "data");
  const inboxDir = path.join(root, "inbox");
  const catalog = createCatalog(path.join(dataDir, "catalog.sqlite"));
  t.after(async () => {
    catalog.close();
    await rm(root, { recursive: true, force: true });
  });
  await ensureLibraryDirectories({ dataDir, inboxDir });
  await saveUploadedImage({
    inboxDir,
    name: "標籤素材.png",
    type: "image/png",
    data: ONE_PIXEL_PNG,
  });
  await scanInbox({ catalog, inboxDir, autoAnalyze: false });
  const asset = catalog.listAssets({ limit: 10 }).items[0];

  catalog.saveAnalysis(asset.id, {
    analysis: {
      summary: "Editorial checkout flow",
      tags: ["editorial", "commerce"],
    },
  });
  const updated = catalog.updateAsset(asset.id, {
    customTags: [" 結帳流程 ", "高對比", "高對比"],
  });

  assert.deepEqual(updated.customTags, ["結帳流程", "高對比"]);
  assert.equal(catalog.listAssets({ query: "結帳流程" }).items[0].id, asset.id);
  assert.equal(catalog.listAssets({ query: "editorial" }).items[0].id, asset.id);

  catalog.saveAnalysis(asset.id, {
    analysis: { summary: "Updated analysis", tags: ["mobile"] },
  });
  assert.deepEqual(catalog.getAsset(asset.id).customTags, ["結帳流程", "高對比"]);
  assert.equal(catalog.listAssets({ query: "高對比" }).items[0].id, asset.id);
  const facetCounts = new Map(
    catalog.getFacets().tags.map((tag) => [tag.value, tag.count]),
  );
  assert.equal(facetCounts.get("mobile"), 1);
  assert.equal(facetCounts.get("結帳流程"), 1);
  assert.equal(facetCounts.get("高對比"), 1);
  assert.throws(
    () => catalog.updateAsset(asset.id, { customTags: "not-an-array" }),
    /must be an array/,
  );
});

test("tag search fuzzily matches detected or custom tags with AND semantics", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "stylebase-tag-filter-"));
  const catalog = createCatalog(path.join(root, "catalog.sqlite"));
  t.after(async () => {
    catalog.close();
    await rm(root, { recursive: true, force: true });
  });

  const addAsset = (index, detectedTags, customTags) => {
    const { asset } = catalog.upsertAsset({
      sha256: String(index).repeat(64),
      relativePath: `reference-${index}.png`,
      fileName: `reference-${index}.png`,
      mimeType: "image/png",
    });
    catalog.saveAnalysis(asset.id, {
      analysis: {
        summary: `Reference ${index}`,
        tags: detectedTags,
      },
    });
    return catalog.updateAsset(asset.id, { customTags });
  };

  const exactGrain = addAsset(1, ["顆粒", "編輯版面"], []);
  const highGrain = addAsset(2, ["高顆粒"], ["雜誌編輯"]);
  const grainTexture = addAsset(3, ["顆粒質感", "海報"], []);
  addAsset(4, ["高顆", "粒質感", "編輯版面"], []);
  const mobileFirst = addAsset(5, ["mobile-first", "commerce"], []);
  const literalWildcard = addAsset(6, ["100% 覆蓋"], []);

  const sortedIds = (result) =>
    result.items.map((asset) => asset.id).sort((left, right) => left - right);
  const fuzzyGrainIds = [exactGrain.id, highGrain.id, grainTexture.id].sort(
    (left, right) => left - right,
  );
  const fuzzyGrainAndEditorialIds = [exactGrain.id, highGrain.id].sort(
    (left, right) => left - right,
  );

  assert.deepEqual(
    sortedIds(catalog.listAssets({ tags: ["顆粒"] })),
    fuzzyGrainIds,
  );
  assert.deepEqual(
    sortedIds(catalog.listAssets({ tags: ["顆粒", "編輯"] })),
    fuzzyGrainAndEditorialIds,
  );
  assert.deepEqual(
    sortedIds(catalog.listAssets({ query: "顆粒" })),
    fuzzyGrainIds,
  );
  assert.deepEqual(
    sortedIds(catalog.listAssets({ query: "顆粒 編輯" })),
    fuzzyGrainAndEditorialIds,
  );
  assert.equal(catalog.listAssets({ tags: ["MOBILE"] }).total, 1);
  assert.equal(catalog.listAssets({ tags: ["mobile-first"] }).total, 1);
  assert.equal(
    catalog.listAssets({ tags: ["mobile"] }).items[0].id,
    mobileFirst.id,
  );
  assert.equal(
    catalog.listAssets({ tags: ["%"] }).items[0].id,
    literalWildcard.id,
  );
});

test("createCatalog migrates a v1 asset database without losing records", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "stylebase-migration-"));
  const dbPath = path.join(root, "catalog.sqlite");
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const legacy = new DatabaseSync(dbPath);
  legacy.exec(`
    CREATE TABLE assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sha256 TEXT NOT NULL UNIQUE,
      relative_path TEXT NOT NULL COLLATE NOCASE,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      file_size INTEGER NOT NULL DEFAULT 0,
      mtime_ms REAL NOT NULL DEFAULT 0,
      source_url TEXT,
      source_domain TEXT COLLATE NOCASE,
      rights_note TEXT,
      title TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
      file_status TEXT NOT NULL DEFAULT 'available',
      analysis_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO assets(
      sha256, relative_path, file_name, mime_type, created_at, updated_at
    ) VALUES(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'legacy.png',
      'legacy.png',
      'image/png',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z'
    );
    PRAGMA user_version = 1;
  `);
  legacy.close();

  const catalog = createCatalog(dbPath);
  assert.deepEqual(catalog.getAsset(1).customTags, []);
  catalog.updateAsset(1, { customTags: ["legacy-safe"] });
  assert.deepEqual(catalog.getAsset(1).customTags, ["legacy-safe"]);
  catalog.close();

  const migrated = new DatabaseSync(dbPath, { readOnly: true });
  assert.equal(migrated.prepare("PRAGMA user_version").get().user_version, 3);
  assert.equal(
    migrated
      .prepare("PRAGMA table_info(assets)")
      .all()
      .some((column) => column.name === "custom_tags_json"),
    true,
  );
  assert.equal(
    migrated
      .prepare("PRAGMA table_info(collections)")
      .all()
      .some((column) => column.name === "sort_order"),
    true,
  );
  migrated.close();
});
