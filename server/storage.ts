import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import type { Config } from './config.js';
import { HttpError } from './security.js';
export class Storage {
  config: Config; client: S3Client | null;
  constructor(config: Config) {
    this.config = config;
    this.client = config.S3_BUCKET ? new S3Client({ region: config.S3_REGION, ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT, forcePathStyle: true } : {}), ...(config.S3_ACCESS_KEY_ID ? { credentials: { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY } } : {}) }) : null;
  }
  async put(bytes: Buffer, imageOnly = false) {
    const type = await fileTypeFromBuffer(bytes);
    const allowed = imageOnly ? ['image/jpeg', 'image/png', 'image/webp'] : ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (!type || !allowed.includes(type.mime) || bytes.length > (type.mime === 'video/mp4' ? 25 : 8) * 1024 * 1024) throw new HttpError(400, 'Archivo no permitido. Usa JPG, PNG o WebP de hasta 8 MB, o MP4 de hasta 25 MB');
    let mime = type.mime, ext = type.ext;
    if (mime.startsWith('image/')) {
      try { bytes = await sharp(bytes, { limitInputPixels: 40000000, failOn: 'warning' }).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer(); mime = 'image/webp'; ext = 'webp'; }
      catch { throw new HttpError(400, 'No pudimos leer esa imagen. Prueba otra foto JPG, PNG o WebP'); }
    }
    const key = `${randomUUID()}.${ext}`;
    if (this.client) await this.client.send(new PutObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key, Body: bytes, ContentType: mime, ServerSideEncryption: 'AES256' }));
    else {
      if (this.config.NODE_ENV === 'production' && !resolve(this.config.UPLOAD_DIR).startsWith(resolve('data'))) throw new HttpError(503, 'Configura un volumen persistente de archivos');
      await mkdir(resolve(this.config.UPLOAD_DIR), { recursive: true });
      await writeFile(resolve(this.config.UPLOAD_DIR, key), bytes, { flag: 'wx' });
    }
    return { key, mime, size: bytes.length };
  }
  async get(key: string): Promise<Buffer> {
    if (!/^[a-f0-9-]{36}\.(?:jpg|png|webp|mp4)$/.test(key)) throw new HttpError(404, 'Archivo no encontrado');
    if (this.client) { const r = await this.client.send(new GetObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key })); if (!r.Body) throw new HttpError(404, 'Archivo no encontrado'); return Buffer.from(await r.Body.transformToByteArray()); }
    return readFile(resolve(this.config.UPLOAD_DIR, key));
  }
}
