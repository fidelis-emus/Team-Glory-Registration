// Compatibility Mock Client Data Layer module
// This file has been completely scrubbed of any actual Firebase SDK dependencies or imports.

export const db: any = null;
export const auth: any = {
  currentUser: null
};

export const FIREBASE_AUTH_PROVIDER_GUIDE = "Firebase has been successfully removed and migrated to MongoDB.";

export function getFirebaseAuthErrorMessage(error: any): string {
  return error?.message || 'Authentication error';
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.warn('[DB Engine] Operation error:', error, 'Ops:', operationType, 'Path:', path);
  throw error;
}
