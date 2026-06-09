function isVisiblePixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 16) return false;
  if (a > 250 && r > 248 && g > 248 && b > 248) return false;
  return true;
}

/** Обрезает прозрачные/белые поля и вписывает результат в квадрат с небольшим полем. */
export async function trimAndSquareImageDataUrl(sourceDataUrl: string): Promise<string> {
  if (!sourceDataUrl) return "";

  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = sourceDataUrl;
  });

  if (!image || !image.naturalWidth || !image.naturalHeight) return sourceDataUrl;

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceCtx) return sourceDataUrl;

  sourceCtx.drawImage(image, 0, 0);
  const { data } = sourceCtx.getImageData(0, 0, width, height);

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (!isVisiblePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return sourceDataUrl;

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const margin = Math.round(Math.max(cropW, cropH) * 0.04);
  const side = Math.max(cropW, cropH) + margin * 2;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = side;
  outputCanvas.height = side;
  const outputCtx = outputCanvas.getContext("2d");
  if (!outputCtx) return sourceDataUrl;

  const offsetX = margin + Math.round((side - margin * 2 - cropW) / 2);
  const offsetY = margin + Math.round((side - margin * 2 - cropH) / 2);
  outputCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, offsetX, offsetY, cropW, cropH);

  try {
    const webp = outputCanvas.toDataURL("image/webp", 0.82);
    return webp.startsWith("data:image/webp") ? webp : sourceDataUrl;
  } catch {
    return sourceDataUrl;
  }
}
