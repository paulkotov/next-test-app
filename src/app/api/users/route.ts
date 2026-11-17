import { errorResponse, json } from "@/server/http";
import { userFromRequest } from "@/server/request-user";
import { UNAUTHENTICATED } from "@/server/session";
import { parseCreateUserInput } from "@/server/user-input";
import { createUser, listUsersFor } from "@/server/users";

const BAD_REQUEST = {
  status: 400,
  code: "BAD_REQUEST",
  message: "Request body is invalid.",
};

export async function GET(request: Request): Promise<Response> {
  const actor = userFromRequest(request);

  if (!actor) {
    return errorResponse({ status: 401, ...UNAUTHENTICATED });
  }

  const result = listUsersFor(actor);

  if (!result.ok) {
    return errorResponse(result);
  }

  return json({ users: result.user });
}

export async function POST(request: Request): Promise<Response> {
  const actor = userFromRequest(request);

  if (!actor) {
    return errorResponse({ status: 401, ...UNAUTHENTICATED });
  }

  const body: unknown = await request.json().catch(() => null);
  const input = parseCreateUserInput(body);

  if (!input) {
    return errorResponse(BAD_REQUEST);
  }

  const result = createUser(actor, input);

  if (!result.ok) {
    return errorResponse(result);
  }

  return json({ user: result.user }, { status: 201 });
}
