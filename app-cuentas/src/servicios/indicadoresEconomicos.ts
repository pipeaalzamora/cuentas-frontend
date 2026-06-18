// Servicio de indicadores económicos de Chile (mindicador.cl)
// API pública y gratuita, sin autenticación: https://mindicador.cl/api
// Provee UF, UTM, dólar, euro, IPC, etc.

export interface Indicador {
  codigo: string;
  nombre: string;
  unidad_medida: string;
  fecha: string;
  valor: number;
}

export interface IndicadoresEconomicos {
  uf: Indicador | null;
  utm: Indicador | null;
  dolar: Indicador | null;
  euro: Indicador | null;
  ipc: Indicador | null;
  fechaConsulta: string;
}

const API_URL = 'https://mindicador.cl/api';
const CACHE_KEY = 'indicadores-economicos-cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

interface CacheEntry {
  datos: IndicadoresEconomicos;
  timestamp: number;
}

interface RespuestaMindicador {
  uf?: Indicador;
  utm?: Indicador;
  dolar?: Indicador;
  euro?: Indicador;
  ipc?: Indicador;
  [key: string]: Indicador | string | undefined;
}

class ServicioIndicadoresEconomicos {
  /**
   * Obtiene los indicadores económicos actuales.
   * Usa caché de localStorage (6h) para evitar llamadas excesivas.
   */
  async obtenerIndicadores(forzar = false): Promise<IndicadoresEconomicos> {
    if (!forzar) {
      const cache = this.leerCache();
      if (cache) return cache;
    }

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`Error API mindicador: ${response.status}`);

      const data: RespuestaMindicador = await response.json();

      const indicadores: IndicadoresEconomicos = {
        uf: (data.uf as Indicador) || null,
        utm: (data.utm as Indicador) || null,
        dolar: (data.dolar as Indicador) || null,
        euro: (data.euro as Indicador) || null,
        ipc: (data.ipc as Indicador) || null,
        fechaConsulta: new Date().toISOString()
      };

      this.guardarCache(indicadores);
      return indicadores;
    } catch (error) {
      console.error('Error al obtener indicadores económicos:', error);
      // Si falla, intentar devolver caché aunque esté vencido
      const cacheVencido = this.leerCache(true);
      if (cacheVencido) return cacheVencido;

      return {
        uf: null, utm: null, dolar: null, euro: null, ipc: null,
        fechaConsulta: new Date().toISOString()
      };
    }
  }

  /** Convierte un monto en pesos a UF según el valor actual */
  convertirAUF(montoPesos: number, valorUF: number): number {
    if (!valorUF || valorUF <= 0) return 0;
    return montoPesos / valorUF;
  }

  /** Convierte un monto en pesos a dólares según el valor actual */
  convertirADolar(montoPesos: number, valorDolar: number): number {
    if (!valorDolar || valorDolar <= 0) return 0;
    return montoPesos / valorDolar;
  }

  /**
   * Obtiene la serie histórica anual de un indicador (ej: ipc, uf, dolar).
   * Útil para proyecciones de inflación.
   */
  async obtenerSerie(codigo: string): Promise<Indicador[]> {
    try {
      const response = await fetch(`${API_URL}/${codigo}`);
      if (!response.ok) throw new Error(`Error API mindicador serie: ${response.status}`);
      const data = await response.json();
      return (data.serie as Indicador[]) || [];
    } catch (error) {
      console.error(`Error al obtener serie ${codigo}:`, error);
      return [];
    }
  }

  private leerCache(ignorarTTL = false): IndicadoresEconomicos | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const entry: CacheEntry = JSON.parse(raw);
      if (!ignorarTTL && Date.now() - entry.timestamp > CACHE_TTL_MS) {
        return null;
      }
      return entry.datos;
    } catch {
      return null;
    }
  }

  private guardarCache(datos: IndicadoresEconomicos): void {
    try {
      const entry: CacheEntry = { datos, timestamp: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (error) {
      console.error('Error al guardar caché de indicadores:', error);
    }
  }
}

export const servicioIndicadoresEconomicos = new ServicioIndicadoresEconomicos();