import { useEffect, useRef, useState } from "react";

import { deleteResume, getResume, uploadResume, validateResume } from "../services/resume";

const RESUME_LOOKUP_TIMEOUT_MS = 10_000;

function withTimeout(promise, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(timeoutMessage)), RESUME_LOOKUP_TIMEOUT_MS);
    }),
  ]);
}

function ResumeManager({ uid }) {
  const inputRef = useRef(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadResume() {
      try {
        const existingResume = await withTimeout(
          getResume(uid),
          "Resume storage did not respond. Check that Firebase Storage is enabled and try again."
        );
        if (!cancelled) setResume(existingResume);
      } catch (error) {
        console.error("Failed to load resume:", error);
        if (!cancelled) setMessage({ type: "error", text: error.message || "Your resume could not be loaded." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadResume();
    return () => { cancelled = true; };
  }, [uid]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    const validationError = validateResume(file);
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      event.target.value = "";
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      setResume(await uploadResume(uid, file));
      setMessage({ type: "success", text: "Resume uploaded successfully." });
    } catch (error) {
      console.error("Failed to upload resume:", error);
      setMessage({ type: "error", text: error.message || "Your resume could not be uploaded." });
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }

  async function handleDelete() {
    try {
      setSaving(true);
      setMessage(null);
      await deleteResume(uid);
      setResume(null);
      setMessage({ type: "success", text: "Resume deleted." });
    } catch (error) {
      console.error("Failed to delete resume:", error);
      setMessage({ type: "error", text: "Your resume could not be deleted." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface resume-manager mt-8" aria-labelledby="resume-heading">
      <div>
        <p className="eyebrow">Career profile</p>
        <h2 id="resume-heading" className="text-2xl font-bold mt-1">Your resume</h2>
        <p className="text-gray-500 mt-2">Keep one current resume ready for future application tools and ATS feedback.</p>
      </div>
      <div className="resume-manager-actions mt-5">
        {loading ? <p className="text-gray-500">Checking for an existing resume…</p> : (
          resume ? (
            <div className="resume-file-details">
              <a href={resume.url} target="_blank" rel="noreferrer" className="font-semibold text-blue-600">{resume.name}</a>
              <span>{Math.ceil(resume.size / 1024)} KB · updated {new Date(resume.updatedAt).toLocaleDateString()}</span>
            </div>
          ) : <p className="text-gray-500">No resume uploaded yet.</p>
        )}
        <div className="flex flex-wrap gap-3">
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={handleUpload} disabled={saving} />
          <button type="button" className="primary-button" disabled={saving} onClick={() => inputRef.current?.click()}>{saving ? "Saving…" : resume ? "Replace resume" : "Upload resume"}</button>
          {resume && <a href={resume.url} download={resume.name} className="secondary-button">Download resume</a>}
          {resume && <button type="button" className="danger-button" disabled={saving} onClick={handleDelete}>Delete resume</button>}
        </div>
        <p className="text-sm text-gray-500">PDF, DOC, or DOCX · maximum 5 MB</p>
        {message && <p className={message.type === "error" ? "text-sm text-red-600" : "text-sm text-green-600"}>{message.text}</p>}
      </div>
    </section>
  );
}

export default ResumeManager;
