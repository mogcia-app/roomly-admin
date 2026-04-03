import "server-only";

import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

type FirebaseAdminConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function readFirebaseAdminConfig(): FirebaseAdminConfig | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

let cachedApp: App | null = null;

export function getFirebaseAdminApp() {
  if (cachedApp) {
    return cachedApp;
  }

  const config = readFirebaseAdminConfig();

  if (!config) {
    throw new Error(
      "Firebase Admin environment variables are missing. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  cachedApp =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
    });

  return cachedApp;
}

export function getFirebaseAdminServices() {
  const app = getFirebaseAdminApp();

  return {
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };
}

export function isFirebaseAdminConfigured() {
  return readFirebaseAdminConfig() !== null;
}

export function getFirebaseStorageBucketName() {
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? "";

  if (!bucketName) {
    throw new Error("Firebase Storage bucket が設定されていません。");
  }

  return bucketName.replace(/^gs:\/\//, "");
}
