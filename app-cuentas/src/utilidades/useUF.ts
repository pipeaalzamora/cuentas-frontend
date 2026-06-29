import { useState, useEffect } from 'react';
import { bancoCentralAPI } from '../servicios/bancoCentralAPI';
import { servicioIndicadoresEconomicos } from '../servicios/indicadoresEconomicos';

interface EstadoUF {
  valorUF: number | null;
  cargando: boolean;
  /** Convierte un monto en pesos a UF formateado (ej: "2,45 UF") */
  formatearEnUF: (montoPesos: number) => string;
}

/**
 * Hook que obtiene el valor actual de la UF.
 * Prioriza el Banco Central (oficial); si no está configurado, usa mindicador.cl.
 */
export const useUF = (): EstadoUF => {
  const [valorUF, setValorUF] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      // 1. Intentar Banco Central
      const bc = await bancoCentralAPI.obtenerUF();
      if (activo && bc?.configurado && bc.valor > 0) {
        setValorUF(bc.valor);
        setCargando(false);
        return;
      }

      // 2. Fallback a mindicador.cl (siempre disponible, sin credenciales)
      const indicadores = await servicioIndicadoresEconomicos.obtenerIndicadores();
      if (activo) {
        setValorUF(indicadores.uf?.valor ?? null);
        setCargando(false);
      }
    };

    cargar();
    return () => {
      activo = false;
    };
  }, []);

  const formatearEnUF = (montoPesos: number): string => {
    if (!valorUF || valorUF <= 0) return '';
    const uf = montoPesos / valorUF;
    return `${new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(uf)} UF`;
  };

  return { valorUF, cargando, formatearEnUF };
};
