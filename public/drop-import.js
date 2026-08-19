const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function hasDraggedFiles(dataTransfer) {
  const types = dataTransfer?.types;
  if (!types) return false;
  if (typeof types.includes === "function") return types.includes("Files");
  if (typeof types.contains === "function") return types.contains("Files");
  return Array.from(types).includes("Files");
}

export function partitionImageFiles(files) {
  const supported = [];
  const rejected = [];

  for (const file of Array.from(files || [])) {
    if (SUPPORTED_IMAGE_TYPES.has(String(file?.type || "").toLowerCase())) {
      supported.push(file);
    } else {
      rejected.push(file);
    }
  }

  return { supported, rejected };
}
