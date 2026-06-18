import React, { useState, useEffect } from 'react';
import { servicioIndicadoresEconomicos } from '../servicios/indicadoresEconomicos';
import type { IndicadoresEconomicos } from '../servicios/indicadoresEconomicos';
import { bancoCentralAPI } from '../servicios/bancoCentralAPI';
import type { RespuestaIPC } from '../servicios/bancoCentralAPI';
import './WidgetIndicadores.css';

const formatearPesos = (valor: number): string =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);

const WidgetIndicadores: React.FC = () => {
  const [indicadores, setIndicadores] = useState<IndicadoresEconomicos | null>(null);
  const [ipcBC, setIpcBC] = useState<RespuestaIPC | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    Promise.all([
      servicioIndicadoresEconomicos.obtenerIndicadores(),
      bancoCentralAPI.obtenerIPC().catch(() => null)
    ])
      .then(([data, ipc]) => {
        if (activo) {
          setIndicadores(data);
          if (ipc?.configurado) setIpcBC(ipc);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  if (cargando) {
    return (
      <div className="widget-indicadores widget-indicadores--cargando">
        <div className="widget-indicadores__spinner" />
        <span>Cargando indicadores...</span>
      </div>
    );
  }

  if (!indicadores || (!indicadores.uf && !indicadores.dolar)) {
    return null;
  }

  const items = [
    { label: 'UF', valor: indicadores.uf?.valor, formato: formatearPesos },
    { label: 'UTM', valor: indicadores.utm?.valor, formato: formatearPesos },
    { label: 'Dólar', valor: indicadores.dolar?.valor, formato: formatearPesos },
    { label: 'Euro', valor: indicadores.euro?.valor, formato: formatearPesos },
    {
      label: 'IPC',
      valor: indicadores.ipc?.valor,
      formato: (v: number) => `${v.toFixed(1)}%`
    }
  ].filter(i => i.valor != null);

  // IPC oficial del Banco Central (anual y mensual) si está configurado
  const ipcAnual = ipcBC?.ultimoAnual?.valor;
  const ipcMensual = ipcBC?.ultimoMensual?.valor;

  return (
    <div className="widget-indicadores">
      <div className="widget-indicadores__header">
        <h3>Indicadores Económicos</h3>
        <span className="widget-indicadores__fuente">
          mindicador.cl{ipcBC ? ' · Banco Central' : ''}
        </span>
      </div>
      <div className="widget-indicadores__grid">
        {items.map(item => (
          <div key={item.label} className="widget-indicadores__item">
            <span className="widget-indicadores__label">{item.label}</span>
            <span className="widget-indicadores__valor">
              {item.formato(item.valor as number)}
            </span>
          </div>
        ))}
        {ipcAnual != null && (
          <div className="widget-indicadores__item">
            <span className="widget-indicadores__label">IPC 12 meses</span>
            <span className="widget-indicadores__valor">{ipcAnual.toFixed(1)}%</span>
          </div>
        )}
        {ipcMensual != null && (
          <div className="widget-indicadores__item">
            <span className="widget-indicadores__label">IPC mensual</span>
            <span className="widget-indicadores__valor">{ipcMensual.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetIndicadores;
