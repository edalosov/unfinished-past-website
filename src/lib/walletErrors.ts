// Wallet rejections surface as viem's UserRejectedRequestError, whose raw
// message ("User rejected the request. Details: ... Version: viem@x.y.z")
// is implementation detail, not something to show a collector.
export function isUserRejection(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String((err as { name?: unknown }).name) : "";
  const code = "code" in err ? (err as { code?: unknown }).code : undefined;
  const message = err instanceof Error ? err.message : "";
  return name === "UserRejectedRequestError" || code === 4001 || /rejected the request/i.test(message);
}
