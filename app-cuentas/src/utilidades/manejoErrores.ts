import { servicioAlmacenamiento } from '../servicios/almacenamiento';
import { validarEstructuraAlmacenamiento, sanitizarCuentas } from './validacion';

export interface ErrorInfo {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  actions?: string[];
  dataLoss?: boolean;
}

/**
 * Maneja errores de la aplicación con diferentes estrategias de recuperación
 */
export class ManejadorErrores {
  private static readonly MAX_ERROR_LOGS = 50;
  private static readonly STORAGE_KEY = 'app-error-logs';

  /**
   * Registra un error en el sistema
   */
  static registrarError(
    error: Error, 
    context?: Record<string, unknown>,
    severity: ErrorInfo['severity'] = 'medium'
  ): string {
    const errorInfo: ErrorInfo = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      severity
    };

    try {
      const erroresExistentes = this.obtenerErroresRegistrados();
      erroresExistentes.push(errorInfo);

      // Mantener solo los errores más recientes
      if (erroresExistentes.length > this.MAX_ERROR_LOGS) {
        erroresExistentes.splice(0, erroresExistentes.length - this.MAX_ERROR_LOGS);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(erroresExistentes));
    } catch (storageError) {
      console.error('No se pudo registrar el error:', storageError);
    }

    return errorInfo.id;
  }

  /**
   * Obtiene los errores registrados
   */
  static obtenerErroresRegistrados(): ErrorInfo[] {
    try {
      const erroresString = localStorage.getItem(this.STORAGE_KEY);
      return erroresString ? JSON.parse(erroresString) : [];
    } catch (error) {
      console.error('Error al obtener errores registrados:', error);
      return [];
    }
  }

  /**
   * Limpia los errores registrados
   */
  static limpiarErrores(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error al limpiar errores:', error);
    }
  }

  /**
   * Intenta recuperar la aplicación de errores de almacenamiento
   */
  static async recuperarAlmacenamiento(): Promise<RecoveryResult> {
    try {
      // Verificar integridad actual
      const integridad = await servicioAlmacenamiento.verificarIntegridad();
      
      if (integridad.valido) {
        return {
          success: true,
          message: 'Los datos están íntegros, no se requiere recuperación'
        };
      }

      // Intentar obtener datos raw del localStorage
      const datosRaw = localStorage.getItem('gestor-cuentas-servicios');
      
      if (!datosRaw) {
        // No hay datos, crear estructura limpia
        servicioAlmacenamiento.limpiarDatos();
        return {
          success: true,
          message: 'Se creó una nueva estructura de datos limpia',
          actions: ['Datos inicializados'],
          dataLoss: true
        };
      }

      // Intentar parsear y validar
      const datosParseados = JSON.parse(datosRaw);
      const validacion = validarEstructuraAlmacenamiento(datosParseados);

      if (validacion.valida) {
        return {
          success: true,
          message: 'Los datos se validaron correctamente',
          actions: validacion.advertencias
        };
      }

      // Intentar reparar los datos
      const resultadoReparacion = await this.repararDatos(datosParseados);
      return resultadoReparacion;

    } catch (error) {
      console.error('Error durante recuperación:', error);
      
      // Último recurso: limpiar todo
      try {
        servicioAlmacenamiento.limpiarDatos();
        return {
          success: true,
          message: 'Se reinició la aplicación con datos limpios debido a errores irrecuperables',
          actions: ['Datos reiniciados'],
          dataLoss: true
        };
      } catch {
        return {
          success: false,
          message: 'No se pudo recuperar la aplicación. Intenta limpiar manualmente los datos del navegador.'
        };
      }
    }
  }

  /**
   * Intenta reparar datos corruptos
   */
  private static async repararDatos(datos: unknown): Promise<RecoveryResult> {
    const acciones: string[] = [];
    let perdidaDatos = false;

    try {
      // Estructura base
      const datosReparados: Record<string, unknown> = {
        version: '1.0.0',
        configuracion: {
          monedaDefault: '$',
          recordatoriosActivos: true,
          temaOscuro: false
        },
        cuentas: []
      };

      const datosObj = datos as Record<string, unknown>;
      
      // Reparar configuración
      if (datosObj.configuracion && typeof datosObj.configuracion === 'object') {
        const configBase = datosReparados.configuracion as Record<string, unknown>;
        const configImportada = datosObj.configuracion as Record<string, unknown>;
        datosReparados.configuracion = {
          ...configBase,
          ...configImportada
        };
        acciones.push('Configuración reparada');
      } else {
        acciones.push('Configuración reiniciada con valores por defecto');
        perdidaDatos = true;
      }

      // Reparar cuentas
      if (Array.isArray(datosObj.cuentas)) {
        const reparacion = sanitizarCuentas(datosObj.cuentas);
        datosReparados.cuentas = reparacion.cuentasReparadas;
        
        acciones.push(`${reparacion.cuentasReparadas.length} cuentas recuperadas`);
        
        if (reparacion.cuentasDescartadas > 0) {
          acciones.push(`${reparacion.cuentasDescartadas} cuentas descartadas por errores`);
          perdidaDatos = true;
        }

        if (reparacion.reparaciones.length > 0) {
          acciones.push(`${reparacion.reparaciones.length} reparaciones aplicadas`);
        }
      } else {
        acciones.push('Lista de cuentas reiniciada');
        perdidaDatos = true;
      }

      // Guardar datos reparados
      localStorage.setItem('gestor-cuentas-servicios', JSON.stringify(datosReparados));

      return {
        success: true,
        message: 'Datos reparados exitosamente',
        actions: acciones,
        dataLoss: perdidaDatos
      };

    } catch (error) {
      console.error('Error durante reparación:', error);
      return {
        success: false,
        message: `Error durante la reparación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Crea un respaldo de emergencia de los datos
   */
  static async crearRespaldoEmergencia(): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const datos = await servicioAlmacenamiento.exportarDatos();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const nombreArchivo = `respaldo-emergencia-${timestamp}.json`;

      // Intentar descargar automáticamente
      try {
        const blob = new Blob([datos], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (downloadError) {
        console.warn('No se pudo descargar automáticamente:', downloadError);
      }

      return {
        success: true,
        data: datos,
        message: `Respaldo creado: ${nombreArchivo}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Error al crear respaldo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Verifica el estado general de la aplicación
   */
  static async verificarEstadoAplicacion(): Promise<{
    healthy: boolean;
    issues: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Verificar localStorage disponible
      if (typeof Storage === 'undefined') {
        issues.push('LocalStorage no está disponible');
      } else {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
        } catch (error) {
          issues.push('LocalStorage no es funcional');
        }
      }

      // Verificar integridad de datos
      const integridad = await servicioAlmacenamiento.verificarIntegridad();
      if (!integridad.valido) {
        issues.push('Problemas de integridad en los datos');
        recommendations.push('Ejecutar reparación de datos');
      }

      // Verificar errores recientes
      const errores = this.obtenerErroresRegistrados();
      const erroresRecientes = errores.filter(e => {
        const tiempoError = new Date(e.timestamp).getTime();
        const ahora = Date.now();
        return (ahora - tiempoError) < 24 * 60 * 60 * 1000; // Últimas 24 horas
      });

      if (erroresRecientes.length > 10) {
        warnings.push(`${erroresRecientes.length} errores en las últimas 24 horas`);
        recommendations.push('Revisar logs de errores');
      }

      const erroresCriticos = erroresRecientes.filter(e => e.severity === 'critical');
      if (erroresCriticos.length > 0) {
        issues.push(`${erroresCriticos.length} errores críticos recientes`);
      }

      // Verificar espacio de almacenamiento
      try {
        const datosString = localStorage.getItem('gestor-cuentas-servicios') || '';
        const tamaño = new Blob([datosString]).size;
        
        if (tamaño > 5 * 1024 * 1024) { // 5MB
          warnings.push('Los datos ocupan mucho espacio de almacenamiento');
          recommendations.push('Considerar limpiar datos antiguos');
        }
      } catch (error) {
        warnings.push('No se pudo verificar el tamaño de los datos');
      }

    } catch (error) {
      issues.push(`Error durante verificación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      warnings,
      recommendations
    };
  }
}

/**
 * Hook para manejar errores de forma consistente en componentes
 */
export function useManejoErrores() {
  const manejarError = (error: Error, context?: Record<string, unknown>) => {
    const errorId = ManejadorErrores.registrarError(error, context);
    console.error(`Error registrado [${errorId}]:`, error);
    return errorId;
  };

  const recuperarAplicacion = async () => {
    return await ManejadorErrores.recuperarAlmacenamiento();
  };

  const crearRespaldo = () => {
    return ManejadorErrores.crearRespaldoEmergencia();
  };

  return {
    manejarError,
    recuperarAplicacion,
    crearRespaldo,
    verificarEstado: ManejadorErrores.verificarEstadoAplicacion
  };
}
