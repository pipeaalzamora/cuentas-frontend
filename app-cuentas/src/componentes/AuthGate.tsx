import type { ReactNode } from 'react';
import { useAuth } from '../contextos/AuthContext';
import './AuthGate.css';

interface AuthGateProps {
  children: ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const {
    usuario,
    cargando,
    error,
    firebaseActivo,
    firebaseConfigurado,
    iniciarSesionGoogle,
  } = useAuth();

  if (!firebaseActivo) {
    return <>{children}</>;
  }

  if (!firebaseConfigurado) {
    return (
      <main className="auth-gate">
        <section className="auth-gate__panel">
          <p className="auth-gate__etiqueta">Firebase Auth</p>
          <h1>Faltan variables de Firebase</h1>
          <p>
            Completa la configuración web del proyecto para habilitar el acceso con Google.
          </p>
        </section>
      </main>
    );
  }

  if (cargando) {
    return (
      <main className="auth-gate">
        <section className="auth-gate__panel">
          <div className="spinner" />
          <p>Validando sesión...</p>
        </section>
      </main>
    );
  }

  if (!usuario) {
    return (
      <main className="auth-gate">
        <section className="auth-gate__panel auth-gate__panel--login">
          <p className="auth-gate__etiqueta">App Cuentas</p>
          <h1>Acceso privado</h1>
          <p>Inicia sesión con tu cuenta de Google para ver tus cuentas y reportes.</p>
          <button className="auth-gate__boton" type="button" onClick={iniciarSesionGoogle}>
            <span className="auth-gate__google">G</span>
            Entrar con Google
          </button>
          {error && <p className="auth-gate__error">{error}</p>}
        </section>
      </main>
    );
  }

  return <>{children}</>;
};

export default AuthGate;
