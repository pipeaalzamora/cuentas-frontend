import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation, Sidebar, Breadcrumbs } from './navegacion';
import AlternadorTema from './AlternadorTema';
import { useAuth } from '../contextos/AuthContext';
import type { NavegacionItem, BreadcrumbItem } from './navegacion';
import './LayoutModerno.css';

interface LayoutModernoProps {
  children: React.ReactNode;
  seccionActual: string;
  breadcrumbs?: BreadcrumbItem[];
}

export const LayoutModerno: React.FC<LayoutModernoProps> = ({
  children,
  seccionActual,
  breadcrumbs = []
}) => {
  const navigate = useNavigate();
  const { usuario, firebaseActivo, cerrarSesion } = useAuth();
  const [sidebarColapsado, setSidebarColapsado] = useState(false);
  const [esMobile, setEsMobile] = useState(false);

  useEffect(() => {
    const detectarMobile = () => {
      setEsMobile(window.innerWidth <= 768);
    };

    detectarMobile();
    window.addEventListener('resize', detectarMobile);
    
    return () => window.removeEventListener('resize', detectarMobile);
  }, []);

  const manejarNavegacion = (seccion: string) => {
    if (seccion === 'dashboard') {
      navigate('/', { replace: true });
    } else {
      navigate(`/${seccion}`, { replace: true });
    }
  };

  const manejarBreadcrumbClick = (item: BreadcrumbItem) => {
    if (item.ruta) {
      navigate(item.ruta);
    }
  };

  const itemsNavegacion: NavegacionItem[] = [
    { id: 'dashboard',     label: 'Dashboard',    icono: '', activo: seccionActual === 'dashboard' },
    { id: 'cuentas',       label: 'Cuentas',      icono: '', activo: seccionActual === 'cuentas' },
    { id: 'desglosador',   label: 'Mi Sueldo',    icono: '', activo: seccionActual === 'desglosador' },
    { id: 'supermercado',  label: 'Super',        icono: '', activo: seccionActual === 'supermercado' },
    { id: 'suenos',        label: 'Sueños',       icono: '', activo: seccionActual === 'suenos' },
    { id: 'estadisticas',  label: 'Estadísticas', icono: '', activo: seccionActual === 'estadisticas' },
    { id: 'reportes',      label: 'Reportes',     icono: '', activo: seccionActual === 'reportes' },
  ];

  const manejarToggleSidebar = () => {
    setSidebarColapsado(!sidebarColapsado);
  };

  return (
    <div className={`layout-moderno ${sidebarColapsado ? 'sidebar-colapsado' : ''}`}>
      {/* Fondo animado con degradado */}
      <div className="layout-moderno__background" />
      
      {/* Sidebar para desktop */}
      {!esMobile && (
        <Sidebar
          items={itemsNavegacion}
          onItemClick={manejarNavegacion}
          colapsado={sidebarColapsado}
          onToggleColapse={manejarToggleSidebar}
        />
      )}

      {/* Contenido principal */}
      <main className="layout-moderno__main">
        {/* Header con efecto glass */}
        <div className="layout-moderno__header glass">
          {breadcrumbs.length > 0 && (
            <Breadcrumbs
              items={breadcrumbs}
              onItemClick={manejarBreadcrumbClick}
            />
          )}
          <div className="layout-moderno__header-acciones">
            {firebaseActivo && usuario && (
              <div className="layout-moderno__usuario">
                {usuario.photoURL ? (
                  <img src={usuario.photoURL} alt="" className="layout-moderno__avatar" />
                ) : (
                  <span className="layout-moderno__avatar layout-moderno__avatar--fallback">
                    {usuario.displayName?.charAt(0) || usuario.email?.charAt(0) || 'U'}
                  </span>
                )}
                <span className="layout-moderno__email">{usuario.email}</span>
                <button className="layout-moderno__salir" type="button" onClick={cerrarSesion}>
                  Salir
                </button>
              </div>
            )}
            <AlternadorTema />
          </div>
        </div>

        {/* Contenido con scroll suave */}
        <div className="layout-moderno__contenido">
          {children}
        </div>

        {/* Espaciado inferior para bottom navigation en móvil */}
        {esMobile && <div className="layout-moderno__bottom-spacer" />}
      </main>

      {/* Bottom Navigation para móvil */}
      {esMobile && (
        <BottomNavigation
          items={itemsNavegacion}
          onItemClick={manejarNavegacion}
        />
      )}
    </div>
  );
};

export default LayoutModerno;
