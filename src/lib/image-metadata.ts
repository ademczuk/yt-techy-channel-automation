export function readPngDimensions(buffer: Buffer): {
  width: number;
  height: number;
} {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error("Unsupported image format: expected PNG");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export function toRuntimeAssetPath(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, "/");
  const runtimeMarker = "/runtime/";
  const index = normalized.indexOf(runtimeMarker);

  if (index === -1) {
    throw new Error(`Expected runtime asset path, received: ${absolutePath}`);
  }

  return normalized.slice(index + 1);
}
