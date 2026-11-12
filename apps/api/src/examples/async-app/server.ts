import { loadEnvFile } from "node:process";
import { startDemo } from "./startup.js";

try {
  try {
    loadEnvFile();
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const { app } = await startDemo(process.env);
  if (app.server.listening) console.log(`Local server demo listening at ${app.listeningOrigin}`);
} catch {
  console.error("Local server demo failed to start");
  process.exitCode = 1;
}
