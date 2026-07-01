type UploadResult = {
  url: string;
};

type UploadsResponse = {
  uploads: UploadResult[];
};

type UploadErrorResponse = {
  error?: string;
  message?: string;
};

const isUploadResult = (value: unknown): value is UploadResult => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.url === "string";
};

const isUploadsResponse = (value: unknown): value is UploadsResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Array.isArray(record.uploads);
};

const isUploadErrorResponse = (value: unknown): value is UploadErrorResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.error === "string" || typeof record.message === "string";
};

export function parseProductImageUploadResponse({
  ok,
  responseText,
}: {
  ok: boolean;
  responseText: string;
}): string[] {
  let json: unknown = null;
  try {
    json = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid server response: ${responseText.substring(0, 100)}`);
  }

  if (!ok) {
    const errorMessage = isUploadErrorResponse(json)
      ? json.error || json.message
      : "Image upload failed";
    throw new Error(errorMessage);
  }

  if (isUploadsResponse(json)) {
    return json.uploads.filter(isUploadResult).map((upload) => upload.url);
  }

  if (isUploadResult(json)) {
    return [json.url];
  }

  return [];
}
