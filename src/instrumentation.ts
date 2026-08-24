export async function register() {
  // Hook point for OpenTelemetry or a hosted error monitor in production.
}

export function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string },
) {
  const message = error instanceof Error ? error.message : "Unknown request error";
  console.error("vault-x request error", {
    message,
    path: request.path,
    method: request.method,
    route: context.routePath,
    router: context.routerKind,
  });
}
