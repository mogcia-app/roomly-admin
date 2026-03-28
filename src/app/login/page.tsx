import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { getOptionalSuperAdminPageSession } from "@/lib/server/super-admin-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (isFirebaseAdminConfigured()) {
    const session = await getOptionalSuperAdminPageSession();

    if (session) {
      redirect("/");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-lg p-8 md:p-10">
        <p className="eyebrow">Roomly Admin</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-stone-950">
          super_admin ログイン
        </h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">
          <code>super_admin</code> の custom claim が付いた Firebase Auth アカウントでログインしてください。
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
