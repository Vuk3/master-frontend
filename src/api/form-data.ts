export function toFileFormData(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}
