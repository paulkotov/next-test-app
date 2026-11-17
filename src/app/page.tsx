import { redirect } from "next/navigation";

import { landingPathFor } from "@/domain/authz";
import { readSessionUser } from "@/server/current-user";

export default async function Home() {
  const user = await readSessionUser();

  // Proxy already blocks anonymous visitors, but a cookie for a deactivated
  // account reaches here and resolves to `null`, so re-check before routing.
  redirect(user ? landingPathFor(user) : "/login");
}
