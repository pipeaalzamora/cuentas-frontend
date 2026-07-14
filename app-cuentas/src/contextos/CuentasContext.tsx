import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { CuentaServicio, FiltrosCuentas } from '../tipos';
import { servicioAlmacenamiento } from '../servicios/almacenamiento';
import { ManejadorErrores } from '../utilidades/manejoErrores';
import { validarIntegridadCuentas } from '../utilidades/validacion';

// Tipos para las acciones del reducer
export type AccionCuentas =
  | { tipo: 'CARGAR_CUENTAS'; payload: CuentaServicio[] }
  | { tipo: 'AGREGAR_CUENTA'; payload: CuentaServicio }
  | { tipo: 'ACTUALIZAR_CUENTA'; payload: { id: string; cuenta: CuentaServicio } }
  | { tipo: 'ELIMINAR_CUENTA'; payload: string }
  | { tipo: 'ELIMINAR_CUENTAS'; payload: string[] }
  | { tipo: 'ESTABLECER_FILTROS'; payload: FiltrosCuentas }
  | { tipo: 'ESTABLECER_CARGANDO'; payload: boolean }
  | { tipo: 'ESTABLECER_ERROR'; payload: string | null };

// Estado del contexto de cuentas
export interface EstadoCuentas {
  cuentas: CuentaServicio[];
  cuentasFiltradas: CuentaServicio[];
  filtros: FiltrosCuentas;
  cargando: boolean;
  error: string | null;
}

// Estado inicial
const estadoInicial: EstadoCuentas = {
  cuentas: [],
  cuentasFiltradas: [],
  filtros: {},
  cargando: false,
  error: null
};

// Función para aplicar filtros a las cuentas
const aplicarFiltros = (cuentas: CuentaServicio[], filtros: FiltrosCuentas): CuentaServicio[] => {
  return cuentas.filter(cuenta => {
    if (filtros.mes !== undefined && cuenta.mes !== filtros.mes) return false;
    if (filtros.año !== undefined && cuenta.año !== filtros.año) return false;
    if (filtros.servicio !== undefined && cuenta.servicio !== filtros.servicio) return false;
    if (filtros.pagada !== undefined && cuenta.pagada !== filtros.pagada) return false;
    return true;
  });
};

// Reducer para manejar las acciones
const reducerCuentas = (estado: EstadoCuentas, accion: AccionCuentas): EstadoCuentas => {
  switch (accion.tipo) {
    case 'CARGAR_CUENTAS': {
      const cuentasCargadas = accion.payload;
      return {
        ...estado,
        cuentas: cuentasCargadas,
        cuentasFiltradas: aplicarFiltros(cuentasCargadas, estado.filtros),
        cargando: false,
        error: null
      };
    }

    case 'AGREGAR_CUENTA': {
      const cuentasConNueva = [...estado.cuentas, accion.payload];
      return {
        ...estado,
        cuentas: cuentasConNueva,
        cuentasFiltradas: aplicarFiltros(cuentasConNueva, estado.filtros),
        error: null
      };
    }

    case 'ACTUALIZAR_CUENTA': {
      const cuentasActualizadas = estado.cuentas.map(cuenta =>
        cuenta.id === accion.payload.id ? accion.payload.cuenta : cuenta
      );
      return {
        ...estado,
        cuentas: cuentasActualizadas,
        cuentasFiltradas: aplicarFiltros(cuentasActualizadas, estado.filtros),
        error: null
      };
    }

    case 'ELIMINAR_CUENTA': {
      const cuentasSinEliminada = estado.cuentas.filter(cuenta => cuenta.id !== accion.payload);
      return {
        ...estado,
        cuentas: cuentasSinEliminada,
        cuentasFiltradas: aplicarFiltros(cuentasSinEliminada, estado.filtros),
        error: null
      };
    }

    case 'ELIMINAR_CUENTAS': {
      const cuentasSinEliminadas = estado.cuentas.filter(cuenta => !accion.payload.includes(cuenta.id));
      return {
        ...estado,
        cuentas: cuentasSinEliminadas,
        cuentasFiltradas: aplicarFiltros(cuentasSinEliminadas, estado.filtros),
        error: null
      };
    }

    case 'ESTABLECER_FILTROS':
      return {
        ...estado,
        filtros: accion.payload,
        cuentasFiltradas: aplicarFiltros(estado.cuentas, accion.payload)
      };

    case 'ESTABLECER_CARGANDO':
      return {
        ...estado,
        cargando: accion.payload
      };

    case 'ESTABLECER_ERROR':
      return {
        ...estado,
        error: accion.payload,
        cargando: false
      };

    default:
      return estado;
  }
};

// Interfaz para las acciones del contexto
export interface AccionesCuentas {
  cargarCuentas: () => Promise<void>;
  agregarCuenta: (datosCuenta: Omit<CuentaServicio, 'id' | 'fechaCreacion' | 'fechaActualizacion'>) => Promise<CuentaServicio>;
  actualizarCuenta: (id: string, datosActualizados: Partial<Omit<CuentaServicio, 'id' | 'fechaCreacion'>>) => Promise<CuentaServicio>;
  eliminarCuenta: (id: string) => Promise<boolean>;
  eliminarCuentas: (ids: string[]) => Promise<number>;
  establecerFiltros: (filtros: FiltrosCuentas) => void;
  limpiarFiltros: () => void;
  obtenerCuentaPorId: (id: string) => CuentaServicio | undefined;
}

// Tipo del contexto completo
export interface ContextoCuentas extends EstadoCuentas, AccionesCuentas {}

// Crear el contexto
const CuentasContext = createContext<ContextoCuentas | undefined>(undefined);

// Props del provider
interface CuentasProviderProps {
  children: ReactNode;
}

// Provider del contexto
export const CuentasProvider: React.FC<CuentasProviderProps> = ({ children }) => {
  const [estado, dispatch] = useReducer(reducerCuentas, estadoInicial);

  // Cargar cuentas desde el backend.
  // IMPORTANTE: las cuentas viven en la base de datos (backend), NO en localStorage.
  // Antes aquí se ejecutaba una "recuperación de integridad" heredada de la época
  // en que se usaba localStorage; ante un fallo de validación borraba TODAS las
  // cuentas del backend. Eso causaba pérdida de datos, por lo que se eliminó.
  // La validación de integridad ahora solo registra advertencias, nunca borra datos.
  const cargarCuentas = async (): Promise<void> => {
    try {
      dispatch({ tipo: 'ESTABLECER_CARGANDO', payload: true });

      const cuentas = await servicioAlmacenamiento.obtenerCuentas();

      // Validación no destructiva: solo registra advertencias en consola/logs.
      const validacionCuentas = validarIntegridadCuentas(cuentas);
      if (validacionCuentas.invalidas > 0) {
        console.warn(`${validacionCuentas.invalidas} cuentas con posibles problemas de integridad (no se borra nada)`);
      }

      dispatch({ tipo: 'CARGAR_CUENTAS', payload: cuentas });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al cargar las cuentas';
      ManejadorErrores.registrarError(
        error instanceof Error ? error : new Error(mensaje),
        { contexto: 'cargarCuentas' },
        'high'
      );
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
    }
  };

  // Agregar nueva cuenta
  const agregarCuenta = async (datosCuenta: Omit<CuentaServicio, 'id' | 'fechaCreacion' | 'fechaActualizacion'>): Promise<CuentaServicio> => {
    try {
      const nuevaCuenta = await servicioAlmacenamiento.guardarCuenta(datosCuenta);
      // Recargar todas las cuentas para garantizar datos normalizados
      await cargarCuentas();
      return nuevaCuenta;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al agregar la cuenta';
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
      throw error;
    }
  };

  // Actualizar cuenta existente
  const actualizarCuenta = async (id: string, datosActualizados: Partial<Omit<CuentaServicio, 'id' | 'fechaCreacion'>>): Promise<CuentaServicio> => {
    try {
      const cuentaActualizada = await servicioAlmacenamiento.actualizarCuenta(id, datosActualizados);
      // Recargar todas las cuentas para garantizar datos normalizados
      await cargarCuentas();
      return cuentaActualizada;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al actualizar la cuenta';
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
      throw error;
    }
  };

  // Eliminar cuenta
  const eliminarCuenta = async (id: string): Promise<boolean> => {
    try {
      const eliminada = await servicioAlmacenamiento.eliminarCuenta(id);
      if (eliminada) {
        dispatch({ tipo: 'ELIMINAR_CUENTA', payload: id });
      }
      return eliminada;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al eliminar la cuenta';
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
      throw error;
    }
  };

  // Eliminar múltiples cuentas
  const eliminarCuentas = async (ids: string[]): Promise<number> => {
    try {
      const cuentasEliminadas = await servicioAlmacenamiento.eliminarCuentas(ids);
      if (cuentasEliminadas > 0) {
        dispatch({ tipo: 'ELIMINAR_CUENTAS', payload: ids });
      }
      return cuentasEliminadas;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al eliminar las cuentas';
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
      throw error;
    }
  };

  // Establecer filtros
  const establecerFiltros = useCallback((filtros: FiltrosCuentas): void => {
    dispatch({ tipo: 'ESTABLECER_FILTROS', payload: filtros });
  }, []);

  // Limpiar filtros
  const limpiarFiltros = useCallback((): void => {
    dispatch({ tipo: 'ESTABLECER_FILTROS', payload: {} });
  }, []);

  // Obtener cuenta por ID
  const obtenerCuentaPorId = (id: string): CuentaServicio | undefined => {
    return estado.cuentas.find(cuenta => cuenta.id === id);
  };

  // Cargar cuentas al montar el componente
  useEffect(() => {
    cargarCuentas();
  }, []);

  // Valor del contexto
  const valorContexto: ContextoCuentas = {
    // Estado
    ...estado,
    // Acciones
    cargarCuentas,
    agregarCuenta,
    actualizarCuenta,
    eliminarCuenta,
    eliminarCuentas,
    establecerFiltros,
    limpiarFiltros,
    obtenerCuentaPorId
  };

  return (
    <CuentasContext.Provider value={valorContexto}>
      {children}
    </CuentasContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useCuentas = (): ContextoCuentas => {
  const contexto = useContext(CuentasContext);
  
  if (contexto === undefined) {
    throw new Error('useCuentas debe ser usado dentro de un CuentasProvider');
  }
  
  return contexto;
};