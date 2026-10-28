import axios from "axios";
import { API_BASE_URL } from "./apiBaseUrl";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
export function validateUpload(file, purpose) {
  if (!file || !file.size || file.size > MAX_UPLOAD_BYTES) throw new Error("File must be 10 MB or smaller.");
  const types = purpose === "attachment" ? ["application/pdf"] : IMAGE_ACCEPT.split(",");
  if (!types.includes(file.type)) throw new Error(purpose === "attachment" ? "Only PDF files are accepted as attachments." : "Choose a JPG, PNG, WebP, GIF or AVIF image.");
}

export async function directUpload(file, purpose) {
  validateUpload(file, purpose);
  const token = window.localStorage.getItem("lms_auth_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const options = { headers, withCredentials: true };
  const { data: { data: upload } } = await axios.post(`${API_BASE_URL}/api/v1/media/upload-signature`, { purpose }, options);
  const form = new FormData();
  for (const [key, value] of Object.entries(upload.params)) form.append(key, String(value));
  form.append("api_key", upload.apiKey);
  form.append("signature", upload.signature);
  form.append("file", file);
  // No session header or cookie is sent to the storage provider.
  await axios.post(`https://api.cloudinary.com/v1_1/${upload.cloudName}/${upload.resourceType}/upload`, form);
  const publicId = upload.params.public_id;
  if (purpose === "quiz") {
    const { data } = await axios.post(`${API_BASE_URL}/api/v1/media/verify-quiz-image`, { publicId }, options);
    return data.data;
  }
  return { public_id: publicId };
}

export const uploadErrorMessage = (error) => error?.response?.data?.message || error?.data?.message || error?.message || "Upload failed. Please try again.";
