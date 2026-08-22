import { useCallback, useRef, useState } from "react";

type Props = {
  busy: boolean;
  onFile: (file: File) => void;
};

export function UploadResume({ busy, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div className="stack">
      <div
        className={`dropzone ${dragover ? "dragover" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragover(true);
        }}
        onDragLeave={() => setDragover(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragover(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <strong>Drop resume here</strong>
        <div>or</div>
        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Processing…" : "Browse files"}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          PDF or DOCX. Parsing happens locally.
        </p>
        <input
          ref={inputRef}
          className="file-input"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />
      </div>
    </div>
  );
}
