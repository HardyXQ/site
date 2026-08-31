import { STORAGE_BUCKET } from '@/config';
import { supabase } from './supabase';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 0.85;

export interface PreparedImage {
  blob: Blob;
  ext: string;
  contentType: string;
  width: number;
  height: number;
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Допустимы только JPG, PNG или WebP.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Файл больше 5 МБ (${(file.size / 1024 / 1024).toFixed(1)} МБ).`;
  }
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение.'));
    };
    img.src = url;
  });
}

/** Downscale to <= 2000px and re-encode as WebP for lighter, consistent assets. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  const img = await loadImage(file);
  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas недоступен в этом браузере.');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
  );

  if (blob && blob.size <= file.size) {
    return { blob, ext: 'webp', contentType: 'image/webp', width, height };
  }
  // WebP unsupported or larger — keep the original (already validated & within limits).
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  return { blob: file, ext, contentType: file.type, width, height };
}

function randomId(): string {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(
    /-/g,
    '',
  );
}

/** Prepare + upload a single file. Returns the public URL and the storage path. */
export async function uploadImage(
  file: File,
  folder: string,
): Promise<{ url: string; path: string }> {
  const prepared = await prepareImage(file);
  const path = `${folder}/${Date.now()}-${randomId()}.${prepared.ext}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, prepared.blob, {
    contentType: prepared.contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Best-effort removal of a previously uploaded object (ignored for external URLs). */
export async function removeUploadedImage(url: string): Promise<void> {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return; // not one of ours (e.g. legacy wavesign.art asset)
  const path = decodeURIComponent(url.slice(idx + marker.length));
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}
