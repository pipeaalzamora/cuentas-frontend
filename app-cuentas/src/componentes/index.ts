// Componentes reutilizables para el Sistema de Gestión de Cuentas de Servicios
// Este archivo será expandido en las siguientes tareas

// Exportaciones de componentes base
export { default as Boton } from './base/Boton';
export { default as Input } from './base/Input';
export { default as Tarjeta } from './base/Tarjeta';
export { default as Modal } from './base/Modal';
export { default as Toast, ToastContainer } from './base/Toast';
export { default as ConfirmacionEliminar } from './base/ConfirmacionEliminar';

// Exportaciones de componentes específicos
export { default as FormularioCuenta } from './FormularioCuenta';
export { default as FormularioCuentaAvanzado } from './FormularioCuentaAvanzado';
export { default as ListaCuentas } from './ListaCuentas';
export { default as PanelEstadisticas } from './PanelEstadisticas';
export { PanelPredicciones } from './PanelPredicciones';
export { DashboardModerno } from './DashboardModerno';
export { GeneradorReportes } from './GeneradorReportes';
export { default as DesglosadorSueldo } from './DesglosadorSueldo';
export { default as WidgetIndicadores } from './WidgetIndicadores';

// Exportaciones de componentes de gráficos
export * from './graficos';

// Exportaciones de plantillas de reportes
export * from './reportes';

// Exportaciones de navegación y layout
export { LayoutModerno } from './LayoutModerno';
export { default as AppRouter } from './AppRouter';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as AlternadorTema } from './AlternadorTema';
export * from './navegacion';