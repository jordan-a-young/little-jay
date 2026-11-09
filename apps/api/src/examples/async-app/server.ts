import { startDemo } from "./startup.js";

try {
  const { app } = await startDemo(process.env);
  console.log(`Local server demo listening at ${app.listeningOrigin}`);
} catch {
  console.error("Local server demo failed to start");
  process.exitCode = 1;
}
