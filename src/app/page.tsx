import { redirect } from "next/navigation";

import { requireSuperAdminPageSession } from "@/lib/server/super-admin-auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireSuperAdminPageSession();
  redirect("/hotels");
}
