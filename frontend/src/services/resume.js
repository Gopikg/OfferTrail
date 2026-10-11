import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";

import app from "../firebase";

const storage = getStorage(app);
const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["pdf", "doc", "docx"];

function resumeRef(uid) {
  return ref(storage, `resumes/${uid}/current`);
}

function extensionFor(fileName) {
  return fileName.split(".").pop()?.toLowerCase();
}

export function validateResume(file) {
  if (!file) return "Choose a resume file first.";
  if (!ACCEPTED_EXTENSIONS.includes(extensionFor(file.name))) return "Upload a PDF, DOC, or DOCX resume.";
  if (file.size > MAX_RESUME_SIZE_BYTES) return "Your resume must be 5 MB or smaller.";
  return null;
}

export async function getResume(uid) {
  const fileRef = resumeRef(uid);
  try {
    const [url, metadata] = await Promise.all([getDownloadURL(fileRef), getMetadata(fileRef)]);
    return { url, name: metadata.customMetadata?.originalName || "Current resume", updatedAt: metadata.updated, size: metadata.size };
  } catch (error) {
    if (error.code === "storage/object-not-found") return null;
    throw error;
  }
}

export async function uploadResume(uid, file) {
  const validationError = validateResume(file);
  if (validationError) throw new Error(validationError);
  await uploadBytes(resumeRef(uid), file, {
    contentType: file.type || "application/octet-stream",
    customMetadata: { originalName: file.name },
  });
  return getResume(uid);
}

export async function deleteResume(uid) {
  await deleteObject(resumeRef(uid));
}
