import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

export const frontendAuthProvider = (import.meta.env.VITE_AUTH_PROVIDER || 'token').trim().toLowerCase();
export const firebaseAuthHabilitado = frontendAuthProvider === 'firebase' || frontendAuthProvider === 'google';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigCompleta = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const crearFirebaseApp = (): FirebaseApp | null => {
  if (!firebaseAuthHabilitado || !firebaseConfigCompleta) {
    return null;
  }

  const appExistente = getApps()[0];
  return appExistente ?? initializeApp(firebaseConfig);
};

export const firebaseApp = crearFirebaseApp();
export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const googleProvider = firebaseAuth ? new GoogleAuthProvider() : null;

googleProvider?.setCustomParameters({
  prompt: 'select_account',
});

export async function obtenerFirebaseIdToken(): Promise<string> {
  if (!firebaseAuthHabilitado || !firebaseAuth?.currentUser) {
    return '';
  }

  return firebaseAuth.currentUser.getIdToken();
}
