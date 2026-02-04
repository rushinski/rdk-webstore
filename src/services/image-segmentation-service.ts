// src/services/image-segmentation-service.ts
import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";

export type SubjectBounds = { left: number; top: number; width: number; height: number; imageW: number; imageH: number };

export class ImageSegmentationService {
  /**
   * Returns:
   * - cutout PNG (alpha included)
   * - bounding box of non-transparent pixels in the cutout
   */
  async cutoutAndBounds(inputBuffer: Buffer): Promise<{ cutoutPng: Buffer; bounds: SubjectBounds | null }> {
    // removeBackground returns an image (PNG with alpha)
    const cutout = await removeBackground(inputBuffer);
    const cutoutPng = Buffer.from(await cutout.arrayBuffer());

    const img = sharp(cutoutPng).ensureAlpha();
    const meta = await img.metadata();
    if (!meta.width || !meta.height) return { cutoutPng, bounds: null };

    // Scan alpha to find bbox (downscaled for speed)
    const scanW = 256;
    const scanH = Math.max(1, Math.round((meta.height / meta.width) * scanW));

    const { data, info } = await img
      .resize(scanW, scanH, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const alphaChannelIndex = info.channels - 1;

    let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * info.channels;
        const a = data[i + alphaChannelIndex];
        if (a > 12) { // alpha threshold
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) return { cutoutPng, bounds: null };

    // Map bbox back to original resolution
    const scaleX = meta.width / info.width;
    const scaleY = meta.height / info.height;

    const left = Math.max(0, Math.floor(minX * scaleX));
    const top = Math.max(0, Math.floor(minY * scaleY));
    const width = Math.min(meta.width - left, Math.ceil((maxX - minX + 1) * scaleX));
    const height = Math.min(meta.height - top, Math.ceil((maxY - minY + 1) * scaleY));

    return {
      cutoutPng,
      bounds: { left, top, width, height, imageW: meta.width, imageH: meta.height },
    };
  }
}
