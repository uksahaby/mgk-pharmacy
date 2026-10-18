import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import multer from "multer";
import type { Request, Response } from "express";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "./constants";
import { env } from "./env";
import { badRequest, notFound } from "./errors";

/**
 * Private uploads (prescriptions, ID documents, transfer receipts).
 * Production: a private Cloudflare R2 bucket (S3 API), because the server's own disk is wiped on every deploy.
 * Development without R2 settings: the local `uploads/` folder.
 * Files are never public; they are only streamed through routes that check who is asking.
 */
export const UPLOAD_DIR = path.resolve(__dirname, "..", "..", "uploads");

const r2 = env.r2
  ? new S3Client({
      region: "auto",
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
    })
  : null;
if (!r2) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

async function readAll(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > MAX_UPLOAD_BYTES) throw badRequest("That file is too large.");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

/** Multer storage engine: same `file.filename` contract as disk storage, so the routes don't care where files live. */
const storage: multer.StorageEngine = {
  _handleFile(_req: Request, file, cb) {
    const name = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${EXT[file.mimetype] ?? ""}`;
    readAll(file.stream)
      .then(async (body) => {
        if (r2) {
          await r2.send(new PutObjectCommand({ Bucket: env.r2!.bucket, Key: name, Body: body, ContentType: file.mimetype }));
        } else {
          await fs.promises.writeFile(path.join(UPLOAD_DIR, name), body);
        }
        cb(null, { filename: name, size: body.length });
      })
      .catch((e) => cb(e));
  },
  _removeFile(_req: Request, file, cb) {
    const name = path.basename(file.filename);
    const done = r2
      ? r2.send(new DeleteObjectCommand({ Bucket: env.r2!.bucket, Key: name }))
      : fs.promises.rm(path.join(UPLOAD_DIR, name), { force: true });
    done.then(() => cb(null), (e) => cb(e));
  },
};

export const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_UPLOAD_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(badRequest("Only PDF, JPG, PNG or WEBP files are accepted."));
  },
});

const TYPE_BY_EXT: Record<string, string> = Object.fromEntries(Object.entries(EXT).map(([type, ext]) => [ext, type]));

export async function sendPrivateFile(res: Response, storedName: string | null | undefined, downloadName?: string) {
  if (!storedName) throw notFound("File");
  const name = path.basename(storedName);

  let body: Readable;
  let type = TYPE_BY_EXT[path.extname(name)] ?? "application/octet-stream";
  if (r2) {
    try {
      const obj = await r2.send(new GetObjectCommand({ Bucket: env.r2!.bucket, Key: name }));
      body = obj.Body as Readable;
      if (obj.ContentType) type = obj.ContentType;
    } catch (e) {
      if ((e as { name?: string }).name === "NoSuchKey") throw notFound("File");
      throw e;
    }
  } else {
    const full = path.join(UPLOAD_DIR, name);
    if (!fs.existsSync(full)) throw notFound("File");
    body = fs.createReadStream(full);
  }

  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "private, no-store");
  // Helmet's default CSP (object-src 'none') stops browsers rendering PDFs inline; only images/PDFs are ever stored here.
  res.removeHeader("Content-Security-Policy");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (downloadName) res.setHeader("Content-Disposition", `inline; filename="${downloadName.replace(/"/g, "")}"`);
  body.pipe(res);
}
