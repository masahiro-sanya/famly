// Account-related actions (deletion via Callable Functions)
import { getFunctions, httpsCallable } from 'firebase/functions';

// Delete my account and related personal data via Cloud Functions
export async function deleteMyAccount(): Promise<void> {
  const functions = getFunctions(undefined, 'asia-northeast1');
  const fn = httpsCallable(functions, 'deleteMyAccount');
  await fn({});
}

