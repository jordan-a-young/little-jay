export { WorkflowForm } from "../../WorkflowForm.js";

export function LocalServerGuide() {
  return (
    <div className="space-y-5">
      <p>
        This catalog is frontend-only. This page makes no API requests and reports no connection
        status.
      </p>
      <ol className="list-decimal space-y-3 pl-6">
        <li>
          After cloning and installing with <code>pnpm install --frozen-lockfile</code>, run{" "}
          <code>pnpm dev</code> for the catalog alone.
        </li>
        <li>
          In a separate terminal, run <code>pnpm dev:server</code> to start the optional loopback
          server demo.
        </li>
        <li>
          Use a terminal to inspect <code>curl http://127.0.0.1:5050/api/health</code> or{" "}
          <code>curl http://127.0.0.1:5050/api/example</code>.
        </li>
        <li>Stop the server with Ctrl+C. The catalog remains independent of that process.</li>
      </ol>
      <p>
        The server uses synthetic injected dependencies. Its example summary is not a check of any
        external service.
      </p>
      <a href="https://github.com/jordan-a-young/little-jay/blob/main/docs/SERVER.md">
        Read local server setup and ownership guidance
      </a>
    </div>
  );
}
