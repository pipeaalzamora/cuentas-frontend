import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LayoutModerno } from './LayoutModerno';
import { ErrorBoundary } from './ErrorBoundary';
import type { BreadcrumbItem } from './navegacion';

// Carga diferida (code splitting) de las páginas.
// Las páginas pesadas (Reportes -> jsPDF/html2canvas, Estadisticas -> charts)
// se separan en chunks independientes que solo se descargan al navegar a ellas.
const Dashboard = lazy(() => import('../paginas/Dashboard'));
const Cuentas = lazy(() => import('../paginas/Cuentas'));
const Estadisticas = lazy(() => import('../paginas/Estadisticas'));
const Reportes = lazy(() => import('../paginas/Reportes'));
const Desglosador = lazy(() => import('../paginas/Desglosador'));
const Suenos = lazy(() => import('../paginas/Suenos'));
const Supermercado = lazy(() => import('../paginas/Supermercado'));
const NotFound = lazy(() => import('../paginas/NotFound'));
const TestNavegacion = lazy(() => import('../paginas/TestNavegacion'));

// Fallback simple mientras se descarga el chunk de la página.
const CargandoPagina: React.FC = () => (
  <div className="loading-spinner">
    <div className="spinner" />
    <p>Cargando...</p>
  </div>
);



// Componente interno que usa useLocation
const AppContent: React.FC = () => {
  const location = useLocation();

  // Generar breadcrumbs basados en la ruta actual
  const generarBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    
    const breadcrumbs: BreadcrumbItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        activo: path === '/',
        ruta: '/'
      }
    ];

    const rutaLabels: Record<string, string> = {
      '/cuentas': 'Gestión de Cuentas',
      '/estadisticas': 'Estadísticas y Análisis',
      '/reportes': 'Generación de Reportes',
      '/desglosador': 'Mi Sueldo',
      '/suenos': 'Calculador de Sueños',
      '/supermercado': 'Lista del Super',
    };

    if (path !== '/') {
      const label = rutaLabels[path] || 'Página';
      breadcrumbs.push({
        id: path.slice(1),
        label,
        activo: true,
        ruta: path
      });
    }

    // Agregar breadcrumb para formularios
    if (path === '/cuentas' && searchParams.get('accion')) {
      const accion = searchParams.get('accion');
      breadcrumbs.push({
        id: 'formulario',
        label: accion === 'editar' ? 'Editar Cuenta' : 'Nueva Cuenta',
        activo: true
      });
    }

    return breadcrumbs;
  };

  const obtenerSeccionActual = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/cuentas')) return 'cuentas';
    if (path.startsWith('/estadisticas')) return 'estadisticas';
    if (path.startsWith('/reportes')) return 'reportes';
    if (path.startsWith('/desglosador')) return 'desglosador';
    if (path.startsWith('/suenos')) return 'suenos';
    if (path.startsWith('/supermercado')) return 'supermercado';
    return 'dashboard';
  };

  return (
    <LayoutModerno
      seccionActual={obtenerSeccionActual()}
      breadcrumbs={generarBreadcrumbs()}
    >
      <ErrorBoundary>
        <Suspense fallback={<CargandoPagina />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cuentas" element={<Cuentas />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/desglosador" element={<Desglosador />} />
            <Route path="/suenos" element={<Suenos />} />
            <Route path="/supermercado" element={<Supermercado />} />
            <Route path="/test" element={<TestNavegacion />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </LayoutModerno>
  );
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default AppRouter;