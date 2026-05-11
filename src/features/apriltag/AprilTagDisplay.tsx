import { AprilTagFamily } from "apriltag";
import tagConfig36h11 from "apriltag/families/36h11.json";
import { useEffect, useRef, useState } from "react";

const family = new AprilTagFamily(tagConfig36h11);
const TAG_COUNT = tagConfig36h11.codes.length;

export function AprilTagDisplay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tagId, setTagId] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pixels = family.render(tagId);
    const size = pixels.length;
    const border = 2; // white quiet-zone in cells
    const total = size + border * 2;
    const cellSize = Math.floor(
      Math.min(window.innerWidth, window.innerHeight) / total,
    );
    canvas.width = total * cellSize;
    canvas.height = total * cellSize;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const px = pixels[row][col];
        ctx.fillStyle = px === "b" ? "#000000" : "#ffffff";
        ctx.fillRect(
          (col + border) * cellSize,
          (row + border) * cellSize,
          cellSize,
          cellSize,
        );
      }
    }
  }, [tagId]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          imageRendering: "pixelated",
          maxWidth: "100%",
          maxHeight: "80dvh",
        }}
      />
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <label style={{ fontFamily: "sans-serif", fontSize: "0.9rem" }}>
          Tag ID (36h11):&nbsp;
          <select
            value={tagId}
            onChange={(e) => setTagId(Number(e.currentTarget.value))}
            style={{ fontSize: "1rem" }}
          >
            {Array.from({ length: Math.min(30, TAG_COUNT) }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <a
          href="../"
          style={{
            fontFamily: "sans-serif",
            fontSize: "0.9rem",
            color: "#047857",
          }}
        >
          ← Back to recorder
        </a>
      </div>
      <p
        style={{
          fontFamily: "sans-serif",
          fontSize: "0.75rem",
          color: "#666",
          textAlign: "center",
          maxWidth: "20rem",
        }}
      >
        Hold this screen in front of your camera. Tag size setting in the
        recorder must match the apparent size when you film it.
      </p>
    </div>
  );
}
