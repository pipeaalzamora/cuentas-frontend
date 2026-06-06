import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { ConfiguracionUsuario } from '../tipos';
import { servicioAlmacenamiento } from '../servicios/almacenamiento';

// Tipos para las acciones del reducer
export type AccionConfiguracion =
  | { tipo: 'CARGAR_CONFIGURACION'; payload: ConfiguracionUsuario }
  | { tipo: 'ACTUALIZAR_CONFIGURACION'; payload: Partial<ConfiguracionUsuario> }
  | { tipo: 'ALTERNAR_TEMA' }
  | { tipo: 'ALTERNAR_RECORDATORIOS' }
  | { tipo: 'ESTABLECER_MONEDA'; payload: string }
  | { tipo: 'ESTABLECER_CARGANDO'; payload: boolean }
  | { tipo: 'ESTABLECER_ERROR'; payload: string | null };

// Estado del contexto de configuración
export interface EstadoConfiguracion {
  configuracion: ConfiguracionUsuario;
  cargando: boolean;
  error: string | null;
}

// Configuración por defecto
const configuracionPorDefecto: ConfiguracionUsuario = {
  monedaDefault: '$',
  recordatoriosActivos: true,
  temaOscuro: false
};

// Estado inicial
const estadoInicial: EstadoConfiguracion = {
  configuracion: configuracionPorDefecto,
  cargando: false,
  error: null
};

// Reducer para manejar las acciones
const reducerConfiguracion = (estado: EstadoConfiguracion, accion: AccionConfiguracion): EstadoConfiguracion => {
  switch (accion.tipo) {
    case 'CARGAR_CONFIGURACION':
      return {
        ...estado,
        configuracion: accion.payload,
        cargando: false,
        error: null
      };

    case 'ACTUALIZAR_CONFIGURACION':
      return {
        ...estado,
        configuracion: {
          ...estado.configuracion,
          ...accion.payload
        },
        error: null
      };

    case 'ALTERNAR_TEMA':
      return {
        ...estado,
        configuracion: {
          ...estado.configuracion,
          temaOscuro: !estado.configuracion.temaOscuro
        },
        error: null
      };

    case 'ALTERNAR_RECORDATORIOS':
      return {
        ...estado,
        configuracion: {
          ...estado.configuracion,
          recordatoriosActivos: !estado.configuracion.recordatoriosActivos
        },
        error: null
      };

    case 'ESTABLECER_MONEDA':
      return {
        ...estado,
        configuracion: {
          ...estado.configuracion,
          monedaDefault: accion.payload
        },
        error: null
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
export interface AccionesConfiguracion {
  cargarConfiguracion: () => Promise<void>;
  actualizarConfiguracion: (nuevaConfiguracion: Partial<ConfiguracionUsuario>) => Promise<ConfiguracionUsuario>;
  alternarTema: () => Promise<void>;
  alternarRecordatorios: () => Promise<void>;
  establecerMoneda: (moneda: string) => Promise<void>;
  resetearConfiguracion: () => Promise<void>;
}

// Tipo del contexto completo
export interface ContextoConfiguracion extends EstadoConfiguracion, AccionesConfiguracion {}

// Crear el contexto
const ConfiguracionContext = createContext<ContextoConfiguracion | undefined>(undefined);

// Props del provider
interface ConfiguracionProviderProps {
  children: ReactNode;
}

// Provider del contexto
export const ConfiguracionProvider: React.FC<ConfiguracionProviderProps> = ({ children }) => {
  const [estado, dispatch] = useReducer(reducerConfiguracion, estadoInicial);

  // Aplicar tema al documento
  const aplicarTema = useCallback((temaOscuro: boolean): void => {
    const root = document.documentElement;
    if (temaOscuro) {
      root.classList.add('tema-oscuro');
    } else {
      root.classList.remove('tema-oscuro');
    }
  }, []);

  // Cargar configuración desde el almacenamiento
  const cargarConfiguracion = useCallback(async (): Promise<void> => {
    try {
      dispatch({ tipo: 'ESTABLECER_CARGANDO', payload: true });
      
      const configuracion = servicioAlmacenamiento.obtenerConfiguracion();
      dispatch({ tipo: 'CARGAR_CONFIGURACION', payload: configuracion });
      
      // Aplicar tema inmediatamente
      aplicarTema(configuracion.temaOscuro);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al cargar la configuración';
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
    }
  }, [aplicarTema]);

  // Actualizar configuración
  const actualizarConfiguracion = useCallback(async (nuevaConfiguracion: Partial<ConfiguracionUsuario>): Promise<ConfiguracionUsuario> => {
    try {
      const configuracionActualizada = servicioAlmacenamiento.actualizarConfiguracion(nuevaConfiguracion);
      dispatch({ tipo: 'ACTUALIZAR_CONFIGURACION', payload: nuevaConfiguracion });
      
      // Aplicar tema si cambió
      if (nuevaConfiguracion.temaOscuro !== undefined) {
        aplicarTema(nuevaConfiguracion.temaOscuro);
      }
      
      return configuracionActualizada;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al actualizar la configuración';
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
      throw error;
    }
  }, [aplicarTema]);

  // Alternar tema
  const alternarTema = useCallback(async (): Promise<void> => {
    try {
      const nuevoTema = !estado.configuracion.temaOscuro;
      await actualizarConfiguracion({ temaOscuro: nuevoTema });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al cambiar el tema';
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
      throw error;
    }
  }, [actualizarConfiguracion, estado.configuracion.temaOscuro]);

  // Alternar recordatorios
  const alternarRecordatorios = useCallback(async (): Promise<void> => {
    try {
      const nuevosRecordatorios = !estado.configuracion.recordatoriosActivos;
      await actualizarConfiguracion({ recordatoriosActivos: nuevosRecordatorios });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al cambiar los recordatorios';
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
      throw error;
    }
  }, [actualizarConfiguracion, estado.configuracion.recordatoriosActivos]);

  // Establecer moneda
  const establecerMoneda = useCallback(async (moneda: string): Promise<void> => {
    try {
      if (!moneda.trim()) {
        throw new Error('La moneda no puede estar vacía');
      }
      await actualizarConfiguracion({ monedaDefault: moneda.trim() });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al establecer la moneda';
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
      throw error;
    }
  }, [actualizarConfiguracion]);

  // Resetear configuración a valores por defecto
  const resetearConfiguracion = useCallback(async (): Promise<void> => {
    try {
      await actualizarConfiguracion(configuracionPorDefecto);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al resetear la configuración';
      dispatch({ tipo: 'ESTABLECER_ERROR', payload: mensaje });
      throw error;
    }
  }, [actualizarConfiguracion]);

  // Cargar configuración al montar el componente
  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  // Aplicar tema cuando cambie la configuración
  useEffect(() => {
    aplicarTema(estado.configuracion.temaOscuro);
  }, [aplicarTema, estado.configuracion.temaOscuro]);

  // Valor del contexto
  const valorContexto: ContextoConfiguracion = {
    // Estado
    ...estado,
    // Acciones
    cargarConfiguracion,
    actualizarConfiguracion,
    alternarTema,
    alternarRecordatorios,
    establecerMoneda,
    resetearConfiguracion
  };

  return (
    <ConfiguracionContext.Provider value={valorContexto}>
      {children}
    </ConfiguracionContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useConfiguracion = (): ContextoConfiguracion => {
  const contexto = useContext(ConfiguracionContext);
  
  if (contexto === undefined) {
    throw new Error('useConfiguracion debe ser usado dentro de un ConfiguracionProvider');
  }
  
  return contexto;
};
