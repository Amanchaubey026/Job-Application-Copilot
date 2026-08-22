import { useEffect, useState, type ReactNode } from "react";
import "~styles/popup.css";

function BootScreen({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ padding: 16, width: 360, fontFamily: "system-ui, sans-serif", color: "#171717" }}>
      <h1 style={{ fontSize: 15, margin: "0 0 8px" }}>Job Application Copilot</h1>
      <p style={{ margin: 0, fontSize: 13, color: "#5c5c5c" }}>{title}</p>
      {detail ? (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c", whiteSpace: "pre-wrap" }}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export default function Popup() {
  const [view, setView] = useState<ReactNode>(
    <BootScreen title="Starting…" detail="" />
  );

  useEffect(() => {
    let cancelled = false;
    import("~components/App")
      .then((mod) => {
        if (cancelled) return;
        const Loaded = mod.App;
        setView(<Loaded />);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setView(
          <BootScreen
            title="The UI failed to load."
            detail={`${message}\n\nReload the extension from build/chrome-mv3-prod on chrome://extensions.`}
          />
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return view;
}
