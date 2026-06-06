import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './Toast.css';

export interface ToastData {
  id: string;
  tipo: 'exito' | 'error' | 'advertencia' | 'info';
  titulo?: string;
  mensaje: string;
  duracion?: number;
  accion?: {
    etiqueta: string;
    onClick: () => void;
  };
}

export interface ToastProps extends ToastData {
  onCerrar: (id: string) => void;
}

export interface ToastContainerProps {
  toasts: ToastData[];
  onCerrar: (id: string) => void;
  posicion?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const Toast: React.FC<ToastProps> = ({
  id,
  tipo,
  titulo,
  mensaje,
  duracion = 5000,
  accion,
  onCerrar
}) => {
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const cerrarToast = useCallback(() => {
    setSaliendo(true);
    setTimeout(() => {
      onCerrar(id);
    }, 300); // Duración de la animación de salida
  }, [id, onCerrar]);

  useEffect(() => {
    // Mostrar toast con animación
    const timer = setTimeout(() => setVisible(true), 10);
    
    // Auto-cerrar si tiene duración
    let autoCloseTimer: ReturnType<typeof setTimeout>;
    if (duracion > 0) {
      autoCloseTimer = setTimeout(() => {
        cerrarToast();
      }, duracion);
    }

    return () => {
      clearTimeout(timer);
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  }, [cerrarToast, duracion]);

  const obtenerIcono = () => {
    switch (tipo) {
      case 'exito':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
      case 'error':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'advertencia':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'info':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  const clases = [
    'toast',
    `toast--${tipo}`,
    visible && 'toast--visible',
    saliendo && 'toast--saliendo'
  ].filter(Boolean).join(' ');

  return (
    <div className={clases} role="alert" aria-live="polite">
      <div className="toast__icono">
        {obtenerIcono()}
      </div>
      
      <div className="toast__contenido">
        {titulo && (
          <div className="toast__titulo">
            {titulo}
          </div>
        )}
        <div className="toast__mensaje">
          {mensaje}
        </div>
        
        {accion && (
          <button
            type="button"
            className="toast__accion"
            onClick={accion.onClick}
          >
            {accion.etiqueta}
          </button>
        )}
      </div>
      
      <button
        type="button"
        className="toast__cerrar"
        onClick={cerrarToast}
        aria-label="Cerrar notificación"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onCerrar,
  posicion = 'top-right'
}) => {
  if (toasts.length === 0) return null;

  const clases = [
    'toast-container',
    `toast-container--${posicion}`
  ].join(' ');

  const contenidoContainer = (
    <div className={clases}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onCerrar={onCerrar}
        />
      ))}
    </div>
  );

  return createPortal(contenidoContainer, document.body);
};

export default Toast;
export { ToastContainer };
