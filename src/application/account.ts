// Account-related actions (deletion via Callable Functions)
import { getFunctions, httpsCallable } from 'firebase/functions';
import { callableErrorMessage } from './callableError';

// Delete my account and related personal data via Cloud Functions
export async function deleteMyAccount(): Promise<void> {
  const functions = getFunctions(undefined, 'asia-northeast1');
  const fn = httpsCallable(functions, 'deleteMyAccount');
  try {
    await fn({});
  } catch (e) {
    // HttpsError の message は開発者向けなので、そのまま画面に出さない
    throw new Error(callableErrorMessage(e, 'アカウントの削除に失敗しました'));
  }
}

