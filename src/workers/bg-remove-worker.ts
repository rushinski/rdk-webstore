// src/workers/bg-remove-worker.ts
import { removeBackground, type Config as ImglyConfig } from "@imgly/background-removal-node";

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const raw = await readStdin();
  const msg = JSON.parse(raw) as { imageBase64: string };

  const bytes = Buffer.from(msg.imageBase64, "base64");

  // IMPORTANT: pass a Blob/File-like input; Node has global Blob in Node 18+
  const inputBlob = new Blob([bytes], { type: "image/png" });

  const cfg: ImglyConfig = {
    model: "medium",
    output: { format: "image/png", quality: 0.95 },
  };

  const cutoutBlob = await removeBackground(inputBlob, cfg);
  const cutoutPng = Buffer.from(await cutoutBlob.arrayBuffer());

  process.stdout.write(
    JSON.stringify({
      cutoutBase64: cutoutPng.toString("base64"),
    }),
  );
}

main().catch((err) => {
  // never throw raw; always write JSON so parent can parse
  process.stdout.write(
    JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    }),
  );
  process.exit(1);
});
