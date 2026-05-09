import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LayoutModerno } from './LayoutModerno';
import { ErrorBoundary } from './ErrorBoundary';
import type { BreadcrumbItem } from './navegacion';

// Importaciones directas para evitar problemas de lazy loading
import Dashboard from '../paginas/Dashboard';
import Cuentas from '../paginas/Cuentas';
import Estadisticas from '../paginas/Estadisticas';
import Reportes from '../paginas/Reportes';
import Desglosador from '../paginas/Desglosador';
import Suenos from '../paginas/Suenos';
import Supermercado from '../paginas/Supermercado';
import NotFound from '../paginas/NotFound';
import TestNavegacion from '../paginas/TestNavegacion';



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