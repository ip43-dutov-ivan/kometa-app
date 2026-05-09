export type ApiFieldErrors = Record<string, string[]>;

export interface KometaApiErrorDetails {
  message: string;
  fieldErrors: ApiFieldErrors;
  nonFieldErrors: string[];
  raw?: unknown;
}

export interface ApiErrorDto {
  code?: string;
  message?: string;
  detail?: string;
  details?: Record<string, unknown>;
}

const NON_FIELD_ERROR_KEYS = new Set(["non_field_errors", "nonFieldErrors", "nonFieldError"]);

export function parseApiErrorDetails(
  raw: unknown,
  fallbackMessage = "Request failed.",
): KometaApiErrorDetails {
  const fieldErrors: ApiFieldErrors = {};
  const nonFieldErrors: string[] = [];

  if (isRecord(raw)) {
    const explicitMessage = firstString(raw.message) ?? firstString(raw.detail);

    for (const [key, value] of Object.entries(raw)) {
      if (key === "message" || key === "detail" || key === "code" || key === "details") {
        continue;
      }

      const messages = collectErrorMessages(value);
      if (messages.length === 0) {
        continue;
      }

      if (NON_FIELD_ERROR_KEYS.has(key)) {
        nonFieldErrors.push(...messages);
      } else {
        fieldErrors[key] = messages;
      }
    }

    const detailMessages = isRecord(raw.details) ? collectRecordErrors(raw.details) : [];
    const message =
      explicitMessage ??
      nonFieldErrors[0] ??
      detailMessages[0] ??
      firstFieldError(fieldErrors) ??
      fallbackMessage;

    return {
      message,
      fieldErrors,
      nonFieldErrors,
      raw,
    };
  }

  const messages = collectErrorMessages(raw);
  return {
    message: messages[0] ?? fallbackMessage,
    fieldErrors,
    nonFieldErrors: messages,
    raw,
  };
}

export function getApiErrorMessage(error: unknown, fallbackMessage = "Request failed."): string {
  if (error instanceof Error && error.name === "KometaApiError") {
    return error.message || fallbackMessage;
  }

  return error instanceof Error ? error.message : fallbackMessage;
}

export function getApiFieldErrors(error: unknown): ApiFieldErrors {
  if (hasApiErrorDetails(error)) {
    return error.details.fieldErrors;
  }

  return {};
}

export function getApiNonFieldErrors(error: unknown): string[] {
  if (hasApiErrorDetails(error)) {
    return error.details.nonFieldErrors;
  }

  return [];
}

function hasApiErrorDetails(error: unknown): error is { details: KometaApiErrorDetails } {
  return (
    isRecord(error) &&
    isRecord(error.details) &&
    typeof error.details.message === "string" &&
    isRecord(error.details.fieldErrors) &&
    Array.isArray(error.details.nonFieldErrors)
  );
}

function collectRecordErrors(value: Record<string, unknown>): string[] {
  return Object.values(value).flatMap((item) => collectErrorMessages(item));
}

function collectErrorMessages(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectErrorMessages(item));
  }

  if (isRecord(value)) {
    return collectRecordErrors(value);
  }

  return [];
}

function firstFieldError(fieldErrors: ApiFieldErrors): string | undefined {
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages[0];
    if (message) {
      return `${humanizeFieldName(field)}: ${message}`;
    }
  }

  return undefined;
}

function firstString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function humanizeFieldName(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
