"use client";

import { useRef, useState } from "react";

export default function ImagePicker({
  name = "image",
  label = "Cover photo",
  existingUrl = null,
  compact = false,
}: {
  name?: string;
  label?: string;
  existingUrl?: string | null;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const accept = (file: File | null | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setProblem("Choose a JPG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProblem("That image is larger than 5 MB.");
      return;
    }
    setProblem(null);
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
    const input = inputRef.current;
    if (input) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    }
  };

  const clear = () => {
    setPreview(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (compact) {
    return (
      <div>
        <span className="label">{label}</span>
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            accept(event.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed p-1.5 transition ${
            dragging ? "border-brand-500 bg-brand-50" : "border-moss-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            name={name}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => accept(event.target.files?.[0])}
          />
          {preview ? (
            <img src={preview} alt="Selected cover preview" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-moss-50 text-base" aria-hidden="true">
              🖼️
            </span>
          )}
          <span className="text-[11px] font-semibold text-moss-700">{preview ? "Replace photo" : "Add photo"}</span>
        </label>
        {problem ? <p className="mt-1 text-[11px] font-semibold text-rose-700">{problem}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <span className="label">{label}</span>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col gap-2 rounded-2xl border-2 border-dashed p-2 transition ${
          dragging ? "border-brand-500 bg-brand-50" : "border-moss-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => accept(event.target.files?.[0])}
        />
        {preview ? (
          <img src={preview} alt="Selected cover preview" className="h-36 w-full rounded-xl object-cover" />
        ) : (
          <span className="flex h-36 w-full flex-col items-center justify-center gap-1 rounded-xl bg-moss-50 text-moss-600">
            <span className="text-2xl" aria-hidden="true">
              🖼️
            </span>
            <span className="text-xs font-semibold text-moss-800">Choose a photo from this device</span>
            <span className="text-[10px]">Tap to browse or drop a file here</span>
            <span className="text-[10px] text-moss-500">JPG, PNG, WebP or GIF · up to 5 MB</span>
          </span>
        )}
      </label>
      {fileName ? (
        <p className="mt-1 truncate text-[11px] font-semibold text-brand-800">Selected: {fileName}</p>
      ) : existingUrl && preview ? (
        <p className="mt-1 text-[11px] text-moss-500">Current photo — choose a new one to replace it.</p>
      ) : null}
      {problem ? <p className="mt-1 text-[11px] font-semibold text-rose-700">{problem}</p> : null}
      {preview ? (
        <button type="button" onClick={clear} className="mt-1 text-[11px] font-semibold text-rose-600 hover:underline">
          Clear selected photo
        </button>
      ) : null}
    </div>
  );
}
