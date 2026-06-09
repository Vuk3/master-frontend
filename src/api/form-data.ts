export function toFileFormData(file: File, fields?: Record<string, string>) {
  const formData = new FormData();
  formData.append("file", file);

  Object.entries(fields ?? {}).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return formData;
}
