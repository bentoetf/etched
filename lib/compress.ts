// Client-side image compression to webp (jpeg fallback) targeting the
// smallest tier that preserves reasonable quality. Enforces the 200kb cap.
import { HARD_CAP } from "./config";

export interface CompressResult {
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Could not decode image"));
      img.src = url;
    });
    return img;
  } finally {
    // revoke after decode completes
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function canvasToBytes(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return resolve(null);
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      mime,
      quality
    );
  });
}

export async function compressImage(file: File): Promise<CompressResult> {
  const img = await loadImage(file);

  // Cap dimensions; big sources get scaled down first.
  const MAX_DIM = 1024;
  let { width, height } = img;
  if (Math.max(width, height) > MAX_DIM) {
    const s = MAX_DIM / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }

  const canvas = document.createElement("canvas");
  const supportsWebp = canvas
    .toDataURL("image/webp")
    .startsWith("data:image/webp");
  const mime = supportsWebp ? "image/webp" : "image/jpeg";

  // Try descending quality, then descending scale, until under the cap.
  const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25];
  const scales = [1, 0.85, 0.7, 0.55, 0.4, 0.3];

  for (const scale of scales) {
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of qualities) {
      const bytes = await canvasToBytes(canvas, mime, q);
      if (bytes && bytes.length <= HARD_CAP) {
        return { bytes, mime, width: w, height: h };
      }
    }
  }

  throw new Error(
    "Could not compress image under 200kb. Try a smaller or simpler image."
  );
}
