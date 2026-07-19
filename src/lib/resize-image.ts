// Client-only helper: downscale a chosen image and return a small JPEG as both
// raw base64 (for the API) and a data URL (for the preview). Keeping the output
// small stays under the Server Action body limit and cuts image-token cost.

export interface ResizedImage {
  base64: string; // raw base64 (no data: prefix)
  mediaType: "image/jpeg";
  dataUrl: string; // full data URL, for <img> preview
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image."));
    img.src = src;
  });
}

export async function resizeImageToBase64(
  file: File,
  maxEdge = 1200,
  quality = 0.85
): Promise<ResizedImage> {
  const sourceUrl = await readAsDataURL(file);
  const img = await loadImage(sourceUrl);

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1] ?? "";
  return { base64, mediaType: "image/jpeg", dataUrl };
}
