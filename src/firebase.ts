import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection on boot as requested by skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: client is offline.");
    }
  }
}
testConnection();

// Detailed guide to enable the Email/Password authentication provider in the Firebase Console
export const FIREBASE_AUTH_PROVIDER_GUIDE = `
Step-by-Step Guide: How to Enable Email/Password in Your Firebase Console:
1. Navigate to the Firebase Console: https://console.firebase.google.com/
2. Select your Firebase project (Project ID: ${firebaseConfig.projectId || 'your-project-id'}).
3. In the left navigation pane under the "Build" category, click on "Authentication".
4. Select the "Sign-in method" tab in the main interface.
5. Click on the "Add new provider" button (or edit the "Email/Password" entry).
6. Under native providers, click on "Email/Password".
7. Click the "Enable" switch (you can leave "Email link (passwordless sign-in)" disabled).
8. Click "Save" to apply the setting.
`;

/**
 * Formats Firebase Auth error codes into helpful developer messages.
 */
export function getFirebaseAuthErrorMessage(error: any): string {
  const errCode = error?.code || '';
  const errMsg = error?.message || String(error);

  if (errCode === 'auth/operation-not-allowed') {
    return `The 'Email/Password' authentication provider is currently disabled in your Firebase console.

=== CONFIGURATION GUIDE ===
${FIREBASE_AUTH_PROVIDER_GUIDE}
===========================

Alternatively, please use the "Sign In with Google" button to authenticate instantly.`;
  }

  if (errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential') {
    return `Authentication failed: Incorrect Email or Password. 

If you meant to access the standard administrator account using "admin@teamglory.com":
- Please ensure you entered the exact password: "HouseOfGlory2026"
- Or use "Sign In with Google" for instant authentication.`;
  }

  if (errCode === 'auth/email-already-in-use') {
    return 'The specified email address has already been created as a standard administrator account. Please sign in with those credentials, register a different email under standard sign-up, or use Google Sign-In.';
  }

  return errMsg;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
