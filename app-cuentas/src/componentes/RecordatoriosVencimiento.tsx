import React, { useMemo, useState } from 'react';
import { useCuentas } from '../contextos/CuentasContext';
import { formatearPesosChilenos } from '../utilidades/formatoChileno';
import './RecordatoriosVencimiento.css';

const NOMBRE_SERVICIO: Record<string, string> = {
  luz: 'Luz',
  agua: 'Agua',
  gas: 'Gas',
  internet: 'Internet'
};

interface Props {
  /** Días hacia adelante a considerar como "por vencer" */
  dias?: number;
}

const diasEntre = (fecha: Date): number => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(fecha);
  objetivo.setHours(0, 0, 0, 0);
  return Math.round((objetivo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Panel de recordatorios in-app: muestra las cuentas no pagadas que vencen
 * pronto o ya están vencidas. No depende de servicios externos.
 */
const RecordatoriosVencimiento: React.FC<Props> = ({ dias = 7 }) => {
  const { cuentas, actualizarCuenta } = useCuentas();
  const [marcando, setMarcando] = useState<string | null>(null);

  const marcarPagada = async (id: string) => {
    setMarcando(id);
    try {
      await actualizarCuenta(id, { pagada: true });
    } catch (error) {
      console.error('Error al marcar como pagada:', error);
    } finally {
      setMarcando(null);
    }
  };

  const proximas = useMemo(() => {
    return cuentas
      .filter(c => !c.pagada && c.fechaVencimiento)
      .map(c => ({ cuenta: c, restantes: diasEntre(new Date(c.fechaVencimiento)) }))
      .filter(x => x.restantes <= dias)
      .sort((a, b) => a.restantes - b.restantes);
  }, [cuentas, dias]);

  if (proximas.length === 0) {
    return null;
  }

  return (
    <div className="recordatorios">
      <div className="recordatorios__header">
        <span className="recordatorios__icono" aria-hidden="true">🔔</span>
        <h3>Cuentas por vencer</h3>
        <span className="recordatorios__badge">{proximas.length}</span>
      </div>
      <div className="recordatorios__lista">
        {proximas.map(({ cuenta, restantes }) => {
          const vencida = restantes < 0;
          const hoy = restantes === 0;
          let etiqueta: string;
          if (vencida) etiqueta = `Vencida hace ${Math.abs(restantes)} día${Math.abs(restantes) > 1 ? 's' : ''}`;
          else if (hoy) etiqueta = 'Vence hoy';
          else etiqueta = `Vence en ${restantes} día${restantes > 1 ? 's' : ''}`;

          return (
            <div
              key={cuenta.id}
              className={`recordatorios__item ${vencida ? 'vencida' : hoy ? 'hoy' : ''}`}
            >
              <div className="recordatorios__item-info">
                <span className={`recordatorios__tag servicio-${cuenta.servicio}`}>
                  {NOMBRE_SERVICIO[cuenta.servicio] || cuenta.servicio}
                </span>
                <span className="recordatorios__cuando">{etiqueta}</span>
              </div>
              <div className="recordatorios__item-derecha">
                <span className="recordatorios__monto">{formatearPesosChilenos(cuenta.monto)}</span>
                <button
                  className="recordatorios__btn-pagar"
                  onClick={() => marcarPagada(cuenta.id)}
                  disabled={marcando === cuenta.id}
                  title="Marcar como pagada"
                >
                  {marcando === cuenta.id ? '...' : '✓ Pagar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecordatoriosVencimiento;
