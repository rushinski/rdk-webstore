export interface ProductImageFileLike {
  name: string;
  type: string;
  size: number;
}

interface ProductImageValidationResult<TFile extends ProductImageFileLike> {
  valid: TFile[];
  errors: string[];
}

export function validateProductImageFiles<TFile extends ProductImageFileLike>(
  files: readonly TFile[],
): ProductImageValidationResult<TFile> {
  const valid: TFile[] = [];
  const errors: string[] = [];
  const maxSize = 10 * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  files.forEach((file) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".heic") || fileName.endsWith(".heif")) {
      errors.push(
        `${file.name}: HEIC/HEIF not supported. Please convert to JPG in Photos app first.`,
      );
      return;
    }

    if (file.size === 0) {
      errors.push(`${file.name}: File is empty`);
      return;
    }

    if (file.size > maxSize) {
      errors.push(`${file.name}: File too large (max 10MB)`);
      return;
    }

    const hasValidType = file.type && allowedTypes.includes(file.type);
    const hasValidExtension = /\.(jpe?g|png|webp)$/i.test(fileName);

    if (!hasValidType && !hasValidExtension) {
      errors.push(`${file.name}: Not a supported image type (use JPG, PNG, or WebP)`);
      return;
    }

    valid.push(file);
  });

  return { valid, errors };
}
