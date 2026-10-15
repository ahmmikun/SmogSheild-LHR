import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import app, { validateSmogRequest } from "./api/index.js";
import { MODEL_ID, PORT, PROVIDER } from "./lib/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static dashboard files for local standalone execution
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

export { app, validateSmogRequest };
export default app;

// Run server only if executed directly
if (process.argv[1] === __filename) {
  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🌫️  SmogShield-LHR Command Center active on port ${PORT}`);
    console.log(`🌐  Local URL: http://localhost:${PORT}`);
    console.log(`🤖  AI Model: ${MODEL_ID} (Strict 8B via ${PROVIDER})`);
    console.log(`======================================================\n`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n⚠️  Port ${PORT} is currently in use by another process.`);
    } else {
      console.error("Server error:", err);
    }
  });
}
