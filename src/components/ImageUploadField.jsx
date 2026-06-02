import { useEffect, useId, useState } from "react";

/**
 * Local image file picker with preview. Sends `imageFile` via api shim multipart;
 * on edit, shows existing URL until a new file is chosen.
 */
export default function ImageUploadField({
  label = "Image",
  file = null,
  onFileChange,
  existingUrl = "",
  accept = "image/*",
  testId = "image-upload",
  required = false,
  hint = "JPEG, PNG, or WebP. Uploaded directly to Cloudinary.",
}) {
  const inputId = useId();
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (file instanceof File) {
      const blob = URL.createObjectURL(file);
      setPreview(blob);
      return () => URL.revokeObjectURL(blob);
    }
    setPreview(existingUrl || "");
  }, [file, existingUrl]);

  function onPick(e) {
    const picked = e.target.files?.[0] ?? null;
    onFileChange?.(picked);
    e.target.value = "";
  }

  function clearFile() {
    onFileChange?.(null);
  }

  return (
    <div data-testid={testId}>
      <label className="label" htmlFor={inputId}>
        {label}
        {required ? <span className="text-[var(--brand-red)]"> *</span> : null}
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={onPick}
        className="input py-1.5 file:mr-3 file:rounded-sm file:border-0 file:bg-[var(--slate-100)] file:px-2 file:py-1 file:text-xs file:font-medium"
        data-testid={`${testId}-input`}
      />
      {file ? (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-600">
          <span className="truncate flex-1">{file.name}</span>
          <button type="button" onClick={clearFile} className="text-[var(--brand-red)] font-medium shrink-0">
            Remove
          </button>
        </div>
      ) : null}
      {hint ? <p className="text-[10px] text-zinc-500 mt-1">{hint}</p> : null}
      {preview ? (
        <div className="mt-2 border border-[var(--border-default)] rounded-sm overflow-hidden bg-[var(--slate-50)]">
          <img src={preview} alt="" className="w-full max-h-28 object-contain" data-testid={`${testId}-preview`} />
        </div>
      ) : null}
    </div>
  );
}
