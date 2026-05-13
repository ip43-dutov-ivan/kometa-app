import type { StorageClient, StorageKey, StorageUploadResult } from "./client";
import { StorageError } from "./client";

export interface R2PresignedUploadResult {
  presignedUrl: string;
  key: StorageKey;
}

export interface R2PresignedDeleteResult {
  presignedUrl: string;
}

/**
 * Abstracts how presigned R2 URLs are obtained — typically by calling a backend
 * endpoint that holds the R2 credentials and uses the S3-compatible API server-side.
 */
export interface R2PresignedUrlProvider {
  getUploadUrl(key: StorageKey, contentType: string): Promise<R2PresignedUploadResult>;
  getDeleteUrl(key: StorageKey): Promise<R2PresignedDeleteResult>;
}

export interface CloudflareR2ClientOptions {
  /** Public base URL of the R2 bucket (e.g. https://assets.example.com). */
  publicBaseUrl: string;
  urlProvider: R2PresignedUrlProvider;
  /** Optional key prefix, e.g. "avatars". */
  keyPrefix?: string;
  fetchFn?: typeof fetch;
}

function generateKey(file: File, prefix?: string): StorageKey {
  const ext = file.name.split(".").pop() ?? "bin";
  const id = crypto.randomUUID();
  return prefix ? `${prefix}/${id}.${ext}` : `${id}.${ext}`;
}

export class CloudflareR2Client implements StorageClient {
  private readonly publicBaseUrl: string;
  private readonly urlProvider: R2PresignedUrlProvider;
  private readonly keyPrefix?: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: CloudflareR2ClientOptions) {
    this.publicBaseUrl = options.publicBaseUrl.replace(/\/+$/, "");
    this.urlProvider = options.urlProvider;
    this.keyPrefix = options.keyPrefix;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  async upload(file: File): Promise<StorageUploadResult> {
    const key = generateKey(file, this.keyPrefix);
    const { presignedUrl, key: confirmedKey } = await this.urlProvider.getUploadUrl(key, file.type);

    const response = await this.fetchFn(presignedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!response.ok) {
      throw new StorageError(
        "upload",
        `R2 upload failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    return { key: confirmedKey, url: `${this.publicBaseUrl}/${confirmedKey}` };
  }

  async remove(key: StorageKey): Promise<void> {
    const { presignedUrl } = await this.urlProvider.getDeleteUrl(key);

    const response = await this.fetchFn(presignedUrl, { method: "DELETE" });

    if (!response.ok) {
      throw new StorageError(
        "remove",
        `R2 delete failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }
  }

  async update(key: StorageKey, file: File): Promise<StorageUploadResult> {
    const { presignedUrl } = await this.urlProvider.getUploadUrl(key, file.type);

    const response = await this.fetchFn(presignedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!response.ok) {
      throw new StorageError(
        "update",
        `R2 update failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    return { key, url: `${this.publicBaseUrl}/${key}` };
  }
}
