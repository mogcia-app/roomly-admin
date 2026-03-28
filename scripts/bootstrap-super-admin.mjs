import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

async function main() {
  const app = getAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const email = requireEnv("SUPER_ADMIN_EMAIL");

  const user = await auth.getUserByEmail(email);
  const currentClaims = user.customClaims ?? {};

  await auth.setCustomUserClaims(user.uid, {
    ...currentClaims,
    role: "super_admin",
  });

  await db.collection("users").doc(user.uid).set(
    {
      user_id: user.uid,
      role: "super_admin",
      email: user.email ?? email,
      display_name: user.displayName ?? null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`super_admin bootstrap complete for ${email}`);
  console.log(`uid=${user.uid}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
