import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { servicioAlmacenamiento } from '../servicios/almacenamiento';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    
    this.setState({ errorInfo });

    // Llamar callback personalizado si existe
    this.props.onError?.(error, errorInfo);

    // Registrar error para análisis
    this.registrarError(error, errorInfo);

    // Verificar integridad de datos si el error parece relacionado con almacenamiento
    if (this.esErrorAlmacenamiento(error)) {
      this.verificarIntegridadDatos();
    }
  }

  private registrarError(error: Error, errorInfo: ErrorInfo): void {
    try {
      const errorLog = {
        id: this.state.errorId,
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Guardar en localStorage para análisis posterior
      const erroresGuardados = JSON.parse(localStorage.getItem('app-errors') || '[]');
      erroresGuardados.push(errorLog);
      
      // Mantener solo los últimos 10 errores
      if (erroresGuardados.length > 10) {
        erroresGuardados.splice(0, erroresGuardados.length - 10);
      }
      
      localStorage.setItem('app-errors', JSON.stringify(erroresGuardados));
    } catch (logError) {
      console.error('No se pudo registrar el error:', logError);
    }
  }

  private esErrorAlmacenamiento(error: Error): boolean {
    const mensajeError = error.message.toLowerCase();
    return mensajeError.includes('localstorage') ||
           mensajeError.includes('almacenamiento') ||
           mensajeError.includes('parse') ||
           mensajeError.includes('json');
  }

  private verificarIntegridadDatos(): void {
    servicioAlmacenamiento.verificarIntegridad().then(resultado => {
      if (!resultado.valido) {
        console.warn('Problemas de integridad detectados:', resultado.errores);
      }
    }).catch(error => {
      console.error('Error al verificar integridad de datos:', error);
    });
  }

  private obtenerMensajeEspecifico(): { titulo: string; descripcion: string; sugerencias: string[] } {
    const error = this.state.error;
    if (!error) {
      return {
        titulo: 'Error desconocido',
        descripcion: 'Ha ocurrido un error inesperado.',
        sugerencias: ['Intenta recargar la página']
      };
    }

    const mensaje = error.message.toLowerCase();

    if (this.esErrorAlmacenamiento(error)) {
      return {
        titulo: 'Error de almacenamiento',
        descripcion: 'Hay un problema con los datos guardados en tu navegador.',
        sugerencias: [
          'Verifica que el navegador permita almacenamiento local',
          'Intenta limpiar los datos de la aplicación',
          'Exporta tus datos antes de limpiar si es posible'
        ]
      };
    }

    if (mensaje.includes('network') || mensaje.includes('fetch')) {
      return {
        titulo: 'Error de conexión',
        descripcion: 'No se pudo conectar con los servicios necesarios.',
        sugerencias: [
          'Verifica tu conexión a internet',
          'Intenta recargar la página en unos momentos'
        ]
      };
    }

    if (mensaje.includes('chunk') || mensaje.includes('loading')) {
      return {
        titulo: 'Error de carga',
        descripcion: 'No se pudieron cargar algunos recursos de la aplicación.',
        sugerencias: [
          'Recarga la página para obtener la versión más reciente',
          'Limpia la caché del navegador si el problema persiste'
        ]
      };
    }

    return {
      titulo: 'Error inesperado',
      descripcion: 'Ha ocurrido un error que no pudimos identificar.',
      sugerencias: [
        'Intenta recargar la página',
        'Si el problema persiste, contacta al soporte'
      ]
    };
  }

  private manejarReintentar = (): void => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private manejarRecargar = (): void => {
    window.location.reload();
  };

  private manejarLimpiarDatos = (): void => {
    // Solo limpia el estado LOCAL del navegador (caché, logs, preferencias locales).
    // NUNCA borra las cuentas ni otros datos del backend: esos viven en el servidor
    // y no deben eliminarse por un error de la interfaz.
    if (window.confirm('Esto reiniciará la app y limpiará datos locales del navegador (no borra tus cuentas del servidor). ¿Continuar?')) {
      try {
        localStorage.removeItem('app-errors');
        localStorage.removeItem('app-error-logs');
        localStorage.removeItem('configuracion-usuario');
        localStorage.removeItem('gestor-cuentas-servicios');
        localStorage.removeItem('indicadores-economicos-cache');
      } catch (error) {
        console.error('Error al limpiar datos locales:', error);
      }
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { titulo, descripcion, sugerencias } = this.obtenerMensajeEspecifico();
      const puedeReintentar = this.state.retryCount < this.maxRetries;

      return (
        <div className="error-boundary">
          <div className="error-boundary-contenido">
            <div className="error-boundary-icono">⚠️</div>
            <h2>{titulo}</h2>
            <p className="error-boundary-descripcion">{descripcion}</p>
            
            {sugerencias.length > 0 && (
              <div className="error-boundary-sugerencias">
                <h3>Qué puedes hacer:</h3>
                <ul>
                  {sugerencias.map((sugerencia, index) => (
                    <li key={index}>{sugerencia}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="error-boundary-acciones">
              {puedeReintentar && (
                <button 
                  className="boton boton-primario"
                  onClick={this.manejarReintentar}
                >
                  Reintentar ({this.maxRetries - this.state.retryCount} intentos restantes)
                </button>
              )}
              
              <button 
                className="boton boton-secundario"
                onClick={this.manejarRecargar}
              >
                Recargar página
              </button>

              {this.esErrorAlmacenamiento(this.state.error!) && (
                <button 
                  className="boton boton-outline boton-peligro"
                  onClick={this.manejarLimpiarDatos}
                >
                  Limpiar caché local y reiniciar
                </button>
              )}
            </div>

            <details className="error-boundary-detalles">
              <summary>Detalles técnicos</summary>
              <div className="error-boundary-info">
                <p><strong>ID del error:</strong> {this.state.errorId}</p>
                <p><strong>Mensaje:</strong> {this.state.error?.message}</p>
                {this.state.error?.stack && (
                  <div>
                    <strong>Stack trace:</strong>
                    <pre>{this.state.error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;