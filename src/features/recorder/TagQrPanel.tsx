import QRCode from "qrcode";
import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";

export function TagQrPanel() {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const tagUrl = `${window.location.origin}${window.location.pathname}?show=apriltag`;

  useEffect(() => {
    if (!qrRef.current) return;
    void QRCode.toCanvas(qrRef.current, tagUrl, {
      width: 180,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [tagUrl]);

  return (
    <div
      className="tag-qr-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.5rem",
      }}
    >
      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--color-muted, #666)",
          margin: 0,
        }}
      >
        Scan with your phone to display an AprilTag on screen for quick testing.
      </p>
      <canvas
        ref={qrRef}
        style={{ border: "1px solid #e2e8f0", borderRadius: "4px" }}
      />
      <a
        href={tagUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          fontSize: "0.8rem",
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          color: "#047857",
        }}
      >
        <ExternalLink size={14} aria-hidden="true" />
        Open AprilTag display
      </a>
    </div>
  );
}
