export type StorageKey = string;

export interface StorageUploadResult {
  key: StorageKey;
  url: string;
}

export interface StorageClient {
  upload(file: File): Promise<StorageUploadResult>;
  remove(key: StorageKey): Promise<void>;
  update(key: StorageKey, file: File): Promise<StorageUploadResult>;
}

export class StorageError extends Error {
  readonly operation: "upload" | "remove" | "update";
  readonly status?: number;

  constructor(operation: StorageError["operation"], message: string, status?: number) {
    super(message);
    this.name = "StorageError";
    this.operation = operation;
    this.status = status;
  }
}
