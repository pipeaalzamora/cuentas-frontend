import type { 
  CuentaServicio, 
  AlmacenamientoLocal, 
  ConfiguracionUsuario,
  FiltrosCuentas 
} from '../tipos';
import { 
  esquemaAlmacenamientoLocal, 
  esquemaConfiguracionUsuario 
} from '../tipos/esquemas';
import { cuentasAPI } from './cuentasAPI';

type CuentaCruda = Record<string, unknown>;

const obtenerFecha = (valor: unknown, respaldo: Date): Date => {
  if (!valor) return respaldo;
  const fecha = new Date(valor as string | number | Date);
  return isNaN(fecha.getTime()) ? respaldo : fecha;
};

const obtenerNumero = (valor: unknown, respaldo = 0): number => {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : respaldo;
  }
  return respaldo;
};

const obtenerTexto = (valor: unknown, respaldo = ''): string => {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : respaldo;
};

/**
 * Normaliza una cuenta cruda de MongoDB a CuentaServicio con fechas Date e id correcto
 */
function normalizarCuenta(cuenta: CuentaCruda): CuentaServicio {
  const ahora = new Date();
  const fechaVencimiento = obtenerFecha(cuenta.fechaVencimiento, ahora);
  const fechaCreacion = obtenerFecha(cuenta.fechaCreacion || cuenta.createdAt, ahora);
  const id = obtenerTexto(cuenta._id || cuenta.id, `tmp_${Date.now()}`);

  return {
    ...cuenta,
    id,
    servicio: obtenerTexto(cuenta.servicio, 'luz') as CuentaServicio['servicio'],
    monto: obtenerNumero(cuenta.monto),
    mes: obtenerNumero(cuenta.mes, 1),
    año: obtenerNumero(cuenta.año, ahora.getFullYear()),
    pagada: Boolean(cuenta.pagada),
    fechaVencimiento,
    fechaCreacion,
    fechaActualizacion: cuenta.fechaActualizacion || cuenta.updatedAt
      ? obtenerFecha(cuenta.fechaActualizacion || cuenta.updatedAt, fechaCreacion)
      : undefined,
    fechaEmision: obtenerFecha(cuenta.fechaEmision, fechaCreacion),
    fechaCorte: obtenerFecha(cuenta.fechaCorte, fechaVencimiento),
    fechaLectura: obtenerFecha(cuenta.fechaLectura, fechaVencimiento),
    proximaFechaLectura: cuenta.proximaFechaLectura ? obtenerFecha(cuenta.proximaFechaLectura, fechaVencimiento) : undefined,
    saldoAnterior: obtenerNumero(cuenta.saldoAnterior),
    consumoActual: obtenerNumero(cuenta.consumoActual, obtenerNumero(cuenta.monto)),
    otrosCargos: obtenerNumero(cuenta.otrosCargos),
    descuentos: obtenerNumero(cuenta.descuentos),
  } as CuentaServicio;
}

/**
 * Servicio para manejar el almacenamiento de cuentas de servicios
 * Implementa persistencia en base de datos mediante API
 */
export class ServicioAlmacenamiento {
  private static readonly VERSION_ACTUAL = '1.0.0';

  /**
   * Configuración por defecto para nuevos usuarios
   */
  private static readonly CONFIGURACION_DEFAULT: ConfiguracionUsuario = {
    monedaDefault: 'CLP',
    recordatoriosActivos: true,
    temaOscuro: false
  };

  /**
   * Guarda una nueva cuenta de servicio
   */
  async guardarCuenta(datosCuenta: Omit<CuentaServicio, 'id' | 'fechaCreacion' | 'fechaActualizacion'>): Promise<CuentaServicio> {
    const cuentaGuardada = await cuentasAPI.crear(datosCuenta as Omit<CuentaServicio, 'id'>);
    return normalizarCuenta(cuentaGuardada);
  }

  /**
   * Actualiza una cuenta existente
   */
  async actualizarCuenta(id: string, datosActualizados: Partial<Omit<CuentaServicio, 'id' | 'fechaCreacion'>>): Promise<CuentaServicio> {
    const cuentaGuardada = await cuentasAPI.actualizar(id, {
      ...datosActualizados,
      fechaActualizacion: new Date()
    });
    return normalizarCuenta(cuentaGuardada);
  }

  /**
   * Obtiene todas las cuentas con filtros opcionales
   */
  async obtenerCuentas(filtros?: FiltrosCuentas): Promise<CuentaServicio[]> {
    const cuentas = await cuentasAPI.obtenerTodas();
    const cuentasNormalizadas = cuentas.map((cuenta: CuentaCruda) => normalizarCuenta(cuenta));

    if (filtros) {
      return cuentasNormalizadas.filter((cuenta: CuentaServicio) => {
        if (filtros.mes !== undefined && cuenta.mes !== filtros.mes) return false;
        if (filtros.año !== undefined && cuenta.año !== filtros.año) return false;
        if (filtros.servicio !== undefined && cuenta.servicio !== filtros.servicio) return false;
        if (filtros.pagada !== undefined && cuenta.pagada !== filtros.pagada) return false;
        return true;
      });
    }

    return cuentasNormalizadas;
  }

  /**
   * Obtiene una cuenta específica por ID
   */
  async obtenerCuentaPorId(id: string): Promise<CuentaServicio | null> {
    try {
      const cuenta = await cuentasAPI.obtenerPorId(id);
      return normalizarCuenta(cuenta);
    } catch {
      return null;
    }
  }

  /**
   * Elimina una cuenta por ID
   */
  async eliminarCuenta(id: string): Promise<boolean> {
    try {
      await cuentasAPI.eliminar(id);
      return true;
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      return false;
    }
  }

  /**
   * Elimina múltiples cuentas por IDs
   */
  async eliminarCuentas(ids: string[]): Promise<number> {
    try {
      let eliminadas = 0;
      for (const id of ids) {
        try {
          await cuentasAPI.eliminar(id);
          eliminadas++;
        } catch (error) {
          console.error(`Error al eliminar cuenta ${id}:`, error);
        }
      }
      return eliminadas;
    } catch (error) {
      console.error('Error al eliminar cuentas:', error);
      return 0;
    }
  }

  /**
   * Obtiene la configuración del usuario (localStorage por ahora)
   */
  obtenerConfiguracion(): ConfiguracionUsuario {
    try {
      const configString = localStorage.getItem('configuracion-usuario');
      if (!configString) {
        return ServicioAlmacenamiento.CONFIGURACION_DEFAULT;
      }
      
      const config = JSON.parse(configString);
      return esquemaConfiguracionUsuario.parse(config);
    } catch (error) {
      console.error('Error al obtener configuración:', error);
      return ServicioAlmacenamiento.CONFIGURACION_DEFAULT;
    }
  }

  /**
   * Actualiza la configuración del usuario (localStorage por ahora)
   */
  actualizarConfiguracion(nuevaConfiguracion: Partial<ConfiguracionUsuario>): ConfiguracionUsuario {
    try {
      const configActual = this.obtenerConfiguracion();
      const configuracionActualizada = {
        ...configActual,
        ...nuevaConfiguracion
      };

      // Validar la configuración
      const configuracionValidada = esquemaConfiguracionUsuario.parse(configuracionActualizada);
      
      localStorage.setItem('configuracion-usuario', JSON.stringify(configuracionValidada));
      return configuracionValidada;
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      throw error;
    }
  }

  /**
   * Exporta todos los datos como JSON para respaldo
   */
  async exportarDatos(): Promise<string> {
    try {
      const cuentas = await this.obtenerCuentas();
      const configuracion = this.obtenerConfiguracion();
      
      const datos: AlmacenamientoLocal = {
        cuentas,
        configuracion,
        version: ServicioAlmacenamiento.VERSION_ACTUAL
      };
      
      return JSON.stringify(datos, null, 2);
    } catch (error) {
      console.error('Error al exportar datos:', error);
      throw error;
    }
  }

  /**
   * Importa datos desde un JSON de respaldo
   */
  async importarDatos(datosJson: string, sobrescribir: boolean = false): Promise<{ exito: boolean; mensaje: string; cuentasImportadas?: number }> {
    try {
      const datosImportados = JSON.parse(datosJson) as { cuentas?: CuentaCruda[] } & Record<string, unknown>;
      
      // Convertir fechas si es necesario
      if (datosImportados.cuentas) {
        datosImportados.cuentas = datosImportados.cuentas.map((cuenta: CuentaCruda) => ({
          ...cuenta,
          fechaVencimiento: obtenerFecha(cuenta.fechaVencimiento, new Date()),
          fechaCreacion: obtenerFecha(cuenta.fechaCreacion, new Date()),
          fechaActualizacion: cuenta.fechaActualizacion ? obtenerFecha(cuenta.fechaActualizacion, new Date()) : undefined,
          fechaEmision: obtenerFecha(cuenta.fechaEmision, obtenerFecha(cuenta.fechaCreacion || cuenta.fechaVencimiento, new Date())),
          fechaCorte: obtenerFecha(cuenta.fechaCorte, obtenerFecha(cuenta.fechaVencimiento, new Date())),
          fechaLectura: obtenerFecha(cuenta.fechaLectura, obtenerFecha(cuenta.fechaVencimiento, new Date())),
          proximaFechaLectura: cuenta.proximaFechaLectura ? obtenerFecha(cuenta.proximaFechaLectura, new Date()) : undefined,
          saldoAnterior: obtenerNumero(cuenta.saldoAnterior),
          consumoActual: obtenerNumero(cuenta.consumoActual, obtenerNumero(cuenta.monto)),
          otrosCargos: obtenerNumero(cuenta.otrosCargos),
          descuentos: obtenerNumero(cuenta.descuentos)
        }));
      }

      // Validar estructura
      const datosValidados = esquemaAlmacenamientoLocal.parse(datosImportados);
      
      if (sobrescribir) {
        // Eliminar todas las cuentas existentes
        const cuentasExistentes = await this.obtenerCuentas();
        for (const cuenta of cuentasExistentes) {
          await this.eliminarCuenta(cuenta.id);
        }
        
        // Importar nuevas cuentas
        for (const cuenta of datosValidados.cuentas) {
          await cuentasAPI.crear(cuenta);
        }
        
        return {
          exito: true,
          mensaje: `Datos importados exitosamente. ${datosValidados.cuentas.length} cuentas cargadas.`,
          cuentasImportadas: datosValidados.cuentas.length
        };
      } else {
        // Fusionar con datos existentes
        const cuentasExistentes = await this.obtenerCuentas();
        const idsExistentes = new Set(cuentasExistentes.map(c => c.id));
        const cuentasNuevas = datosValidados.cuentas.filter(c => !idsExistentes.has(c.id));
        
        for (const cuenta of cuentasNuevas) {
          await cuentasAPI.crear(cuenta);
        }
        
        return {
          exito: true,
          mensaje: `${cuentasNuevas.length} cuentas nuevas importadas exitosamente.`,
          cuentasImportadas: cuentasNuevas.length
        };
      }
      
    } catch (error) {
      console.error('Error al importar datos:', error);
      return {
        exito: false,
        mensaje: `Error al importar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Limpia todos los datos del almacenamiento
   */
  async limpiarDatos(): Promise<void> {
    try {
      const cuentas = await this.obtenerCuentas();
      for (const cuenta of cuentas) {
        await this.eliminarCuenta(cuenta.id);
      }
      
      // Limpiar configuración
      localStorage.removeItem('configuracion-usuario');
    } catch (error) {
      console.error('Error al limpiar datos:', error);
      throw error;
    }
  }

  /**
   * Verifica la integridad de los datos almacenados
   */
  async verificarIntegridad(): Promise<{ valido: boolean; errores: string[] }> {
    try {
      const cuentas = await this.obtenerCuentas();
      const configuracion = this.obtenerConfiguracion();
      
      const datos: AlmacenamientoLocal = {
        cuentas,
        configuracion,
        version: ServicioAlmacenamiento.VERSION_ACTUAL
      };
      
      esquemaAlmacenamientoLocal.parse(datos);
      
      return {
        valido: true,
        errores: []
      };
    } catch (error) {
      const errores = error instanceof Error ? [error.message] : ['Error de validación desconocido'];
      
      return {
        valido: false,
        errores
      };
    }
  }

  /**
   * Obtiene estadísticas básicas del almacenamiento
   */
  async obtenerEstadisticas(): Promise<{
    totalCuentas: number;
    cuentasPagadas: number;
    cuentasPendientes: number;
    serviciosUnicos: number;
    rangoFechas: { inicio?: Date; fin?: Date };
  }> {
    try {
      const cuentas = await this.obtenerCuentas();
      
      const cuentasPagadas = cuentas.filter(c => c.pagada).length;
      const serviciosUnicos = new Set(cuentas.map(c => c.servicio)).size;
      
      const fechas = cuentas.map(c => c.fechaVencimiento).sort((a, b) => a.getTime() - b.getTime());
      
      return {
        totalCuentas: cuentas.length,
        cuentasPagadas,
        cuentasPendientes: cuentas.length - cuentasPagadas,
        serviciosUnicos,
        rangoFechas: {
          inicio: fechas[0],
          fin: fechas[fechas.length - 1]
        }
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        totalCuentas: 0,
        cuentasPagadas: 0,
        cuentasPendientes: 0,
        serviciosUnicos: 0,
        rangoFechas: {}
      };
    }
  }


}

// Instancia singleton del servicio
export const servicioAlmacenamiento = new ServicioAlmacenamiento();
