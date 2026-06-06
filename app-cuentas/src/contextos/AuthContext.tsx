import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  firebaseAuth,
  firebaseAuthHabilitado,
  firebaseConfigCompleta,
  googleProvider,
  obtenerFirebaseIdToken,
} from '../servicios/firebase';

interface AuthContextValue {
  usuario: User | null;
  cargando: boolean;
  error: string | null;
  firebaseActivo: boolean;
  firebaseConfigurado: boolean;
  iniciarSesionGoogle: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
  obtenerToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [usuario, setUsuario] = useState<User | null>(firebaseAuth?.currentUser ?? null);
  const [cargando, setCargando] = useState(firebaseAuthHabilitado && firebaseConfigCompleta);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseAuthHabilitado || !firebaseAuth) {
      setCargando(false);
      return undefined;
    }

    return onAuthStateChanged(firebaseAuth, (usuarioActual) => {
      setUsuario(usuarioActual);
      setCargando(false);
      setError(null);
    }, (authError) => {
      setError(authError.message);
      setCargando(false);
    });
  }, []);

  const iniciarSesionGoogle = useCallback(async () => {
    if (!firebaseAuth || !googleProvider) {
      setError('Firebase no está configurado para iniciar sesión.');
      return;
    }

    try {
      setError(null);
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (authError) {
      const mensaje = authError instanceof Error ? authError.message : 'No se pudo iniciar sesión con Google.';
      setError(mensaje);
      throw authError;
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    if (!firebaseAuth) {
      return;
    }

    await signOut(firebaseAuth);
  }, []);

  const obtenerToken = useCallback(() => obtenerFirebaseIdToken(), []);

  const valor = useMemo<AuthContextValue>(() => ({
    usuario,
    cargando,
    error,
    firebaseActivo: firebaseAuthHabilitado,
    firebaseConfigurado: firebaseConfigCompleta,
    iniciarSesionGoogle,
    cerrarSesion,
    obtenerToken,
  }), [usuario, cargando, error, iniciarSesionGoogle, cerrarSesion, obtenerToken]);

  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return contexto;
};
