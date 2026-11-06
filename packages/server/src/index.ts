import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
export { safeErrorsPlugin, type SafeErrorResponse } from "./safe-errors.js";
export { healthRoutes, type HealthRoutesOptions } from "./health.js";
export type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyServerOptions,
} from "fastify";
/** Create a configurable Fastify instance. The caller owns routes, listen(), and close(). */
export function createServer(options: FastifyServerOptions = {}): FastifyInstance {
  return Fastify(options);
}
