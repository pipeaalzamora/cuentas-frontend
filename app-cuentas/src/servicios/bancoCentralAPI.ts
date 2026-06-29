import api from './api';

// Indicadores del Banco Central de Chile, servidos por nuestro backend
// (proxy autenticado a la API SIETE). Requiere credenciales configuradas en el backend.

export interface ObservacionIndicador {
  fecha: string;
  valor: number;
}

export interface RespuestaIPC {
  configurado: boolean;
  variacionMensual: ObservacionIndicador[];
  variacionAnual: ObservacionIndicador[];
  ultimoMensual: ObservacionIndicador | null;
  ultimoAnual: ObservacionIndicador | null;
}

export interface RespuestaInflacion {
  configurado: boolean;
  tasaInflacionAnual: number; // porcentaje, ej: 3.5
  tasaDecimal: number;        // ej: 0.035
  fuente: string;
  fecha: string;
}

export const bancoCentralAPI = {
  /** Indica si el backend tiene configuradas las credenciales del Banco Central */
  estado: async (): Promise<{ bancoCentralConfigurado: boolean }> => {
    try {
      const response = await api.get('/indicadores/estado');
      return response.data;
    } catch {
      return { bancoCentralConfigurado: false };
    }
  },

  /** Obtiene la serie de variación del IPC (mensual y anual) */
  obtenerIPC: async (desde?: string, hasta?: string): Promise<RespuestaIPC | null> => {
    try {
      const params = new URLSearchParams();
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      const response = await api.get(`/indicadores/ipc?${params.toString()}`);
      return response.data;
    } catch {
      return null;
    }
  },

  /** Obtiene la tasa de inflación anual oficial lista para proyecciones */
  obtenerInflacion: async (): Promise<RespuestaInflacion | null> => {
    try {
      const response = await api.get('/indicadores/inflacion');
      return response.data;
    } catch {
      return null;
    }
  },

  /** Obtiene el último valor de la UF (Banco Central) */
  obtenerUF: async (): Promise<{ configurado: boolean; valor: number; fecha: string } | null> => {
    try {
      const response = await api.get('/indicadores/uf');
      return response.data;
    } catch {
      return null;
    }
  },

  /** Consulta genérica de una serie del Banco Central por código */
  obtenerSerie: async (codigo: string, desde?: string, hasta?: string): Promise<ObservacionIndicador[]> => {
    try {
      const params = new URLSearchParams({ codigo });
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      const response = await api.get(`/indicadores/banco-central/serie?${params.toString()}`);
      return response.data?.observaciones || [];
    } catch {
      return [];
    }
  },
};
