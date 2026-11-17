export function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

export function errorResponse(
  failure: { status: number; code: string; message: string },
): Response {
  return json(
    { error: { code: failure.code, message: failure.message } },
    { status: failure.status },
  );
}
