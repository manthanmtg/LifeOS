export function splitDocumentFilename(filename: string) {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) {
    return { basename: filename, extension: "" };
  }
  return { basename: filename.slice(0, dot), extension: filename.slice(dot) };
}

export function validateDocumentFilename(filename: string) {
  const trimmed = filename.trim();
  if (!trimmed) return "Filename is required";
  if (trimmed.length > 255) return "Filename must be at most 255 characters";
  if (/[\\/\u0000-\u001F\u007F]/.test(trimmed)) {
    return "Filename cannot contain path separators or control characters";
  }
  return null;
}
