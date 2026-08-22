type Props = {
  readyCount: number;
  fieldCount: number;
  filling: boolean;
  busy: boolean;
  classifying?: boolean;
  pageHost?: string;
  scanError?: string | null;
  onFillPage: () => void;
  onScan: () => void;
};

export function FillActionBar({
  readyCount,
  fieldCount,
  filling,
  busy,
  classifying,
  pageHost,
  scanError,
  onFillPage,
  onScan
}: Props) {
  const scanning = busy || classifying;

  let status = "Open a job application page, then fill the matched fields.";
  if (scanning) status = "Looking for form fields on this page…";
  else if (scanError) status = scanError;
  else if (fieldCount === 0) status = pageHost
    ? `No form fields found on ${pageHost}.`
    : "No form fields found on this page.";
  else if (readyCount === 0) status = `${fieldCount} field${fieldCount === 1 ? "" : "s"} found. None are ready yet — check Apply or your profile.`;
  else status = `${readyCount} field${readyCount === 1 ? "" : "s"} ready on ${pageHost || "this page"}.`;

  return (
    <div className="fill-cta">
      <button
        className="btn btn-primary btn-fill-page"
        type="button"
        disabled={filling || scanning}
        onClick={onFillPage}
      >
        {filling ? "Filling this page…" : scanning ? "Scanning page…" : "Fill this page"}
      </button>
      <p className="fill-cta-hint">{status} The application is never submitted.</p>
      {fieldCount > 0 && readyCount === 0 ? (
        <button className="btn btn-ghost" type="button" disabled={scanning} onClick={onScan}>
          Scan again
        </button>
      ) : null}
    </div>
  );
}
