import { CuentasProvider } from './contextos/CuentasContext';
import { ConfiguracionProvider } from './contextos/ConfiguracionContext';
import { TemaProvider } from './contextos/TemaContext';
import { PeriodoProvider } from './contextos/PeriodoContext';
import { AuthProvider } from './contextos/AuthContext';
import { AppRouter } from './componentes/AppRouter';
import { AuthGate } from './componentes/AuthGate';
import { ErrorBoundary } from './componentes/ErrorBoundary';
import { ManejadorErrores } from './utilidades/manejoErrores';
import type { ErrorInfo } from 'react';
import './App.css';

function App() {
  const manejarErrorGlobal = (error: Error, errorInfo: ErrorInfo) => {
    ManejadorErrores.registrarError(error, {
      componentStack: errorInfo.componentStack,
      location: window.location.href
    }, 'high');
  };

  return (
    <ErrorBoundary onError={manejarErrorGlobal}>
      <TemaProvider>
        <AuthProvider>
          <AuthGate>
            <PeriodoProvider>
              <ConfiguracionProvider>
                <CuentasProvider>
                  <div className="app">
                    <AppRouter />
                  </div>
                </CuentasProvider>
              </ConfiguracionProvider>
            </PeriodoProvider>
          </AuthGate>
        </AuthProvider>
      </TemaProvider>
    </ErrorBoundary>
  );
}

export default App
