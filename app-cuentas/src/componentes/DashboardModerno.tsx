import React, { useMemo } from 'react';
import { useCuentas } from '../contextos/CuentasContext';
import { servicioCalculosEstadisticas } from '../servicios/calculosEstadisticas';
import { TarjetaModerna } from './base/TarjetaModerna';
import { GraficoEvolucionMensual, GraficoDistribucionServicios } from './graficos';
import { formatearPesosChilenos } from '../utilidades/formatoChileno';
import { obtenerEstadisticasEstados } from '../utilidades/estadosCuentas';
import type { TipoServicio } from '../tipos';
import './DashboardModerno.css';

// SVG Icons
const IconoDinero = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9 9h4a2 2 0 0 1 0 4H9v2h6"/>
  </svg>
);
const IconoLista = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
  </svg>
);
const IconoGrafico = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconoAlerta = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconoAdvertencia = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconoTendencia = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconoTorta = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
);
const IconoRanking = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const iconosPorServicio: Record<TipoServicio, React.ReactNode> = {
  luz: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
    </svg>
  ),
  agua: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  ),
  gas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  ),
  internet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
};

const coloresPorServicio: Record<TipoServicio, { bg: string; color: string }> = {
  luz:      { bg: 'rgba(251, 191, 36, 0.12)',  color: '#FBBF24' },
  agua:     { bg: 'rgba(56, 189, 248, 0.12)',  color: '#38BDF8' },
  gas:      { bg: 'rgba(248, 113, 113, 0.12)', color: '#F87171' },
  internet: { bg: 'rgba(167, 139, 250, 0.12)', color: '#A78BFA' }
};

interface DashboardModernoProps {
  onNavegar?: (seccion: string) => void;
}

export const DashboardModerno: React.FC<DashboardModernoProps> = ({ onNavegar: _onNavegar }) => {
  const { cuentas } = useCuentas();

  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth() + 1;
  const añoActual = fechaActual.getFullYear();

  const estadisticasMesActual = useMemo(() =>
    servicioCalculosEstadisticas.calcularEstadisticasMensuales(cuentas, añoActual, mesActual),
    [cuentas, añoActual, mesActual]
  );

  const resumenRapido = useMemo(() => {
    const cuentasMes = servicioCalculosEstadisticas.filtrarPorPeriodo(cuentas, añoActual, mesActual);
    return servicioCalculosEstadisticas.calcularResumenRapido(cuentasMes);
  }, [cuentas, añoActual, mesActual]);

  const estadisticasEstados = useMemo(() => obtenerEstadisticasEstados(cuentas), [cuentas]);

  const rankingServicios = useMemo(() => {
    const cuentasMes = servicioCalculosEstadisticas.filtrarPorPeriodo(cuentas, añoActual, mesActual);
    return servicioCalculosEstadisticas.obtenerRankingServicios(cuentasMes);
  }, [cuentas, añoActual, mesActual]);

  const nombreMes = new Date(añoActual, mesActual - 1).toLocaleDateString('es-CL', { month: 'long' });

  return (
    <div className="dashboard-moderno">
      {/* Header */}
      <div className="dashboard-moderno__header">
        <div className="dashboard-moderno__titulo">
          <h1>Dashboard</h1>
          <p className="dashboard-moderno__subtitulo">
            Resumen de {nombreMes} {añoActual}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-moderno__resumen">
        <TarjetaModerna variant="elevated" hover>
          <div className="tarjeta-stat">
            <div className="tarjeta-stat__icono" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
              <IconoDinero />
            </div>
            <div className="tarjeta-stat__contenido">
              <h4>Total del Mes</h4>
              <p className="tarjeta-stat__valor">{formatearPesosChilenos(estadisticasMesActual.totalGastos)}</p>
              {estadisticasMesActual.comparativaAnterior !== 0 && (
                <span className={`tarjeta-stat__cambio ${estadisticasMesActual.comparativaAnterior > 0 ? 'negativo' : 'positivo'}`}>
                  {estadisticasMesActual.comparativaAnterior > 0 ? '↑' : '↓'} {Math.abs(estadisticasMesActual.comparativaAnterior).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </TarjetaModerna>

        <TarjetaModerna variant="elevated" hover>
          <div className="tarjeta-stat">
            <div className="tarjeta-stat__icono" style={{ background: 'rgba(148,163,184,0.12)', color: '#94A3B8' }}>
              <IconoLista />
            </div>
            <div className="tarjeta-stat__contenido">
              <h4>Cuentas Registradas</h4>
              <p className="tarjeta-stat__valor">{resumenRapido.totalCuentas}</p>
              <span className="tarjeta-stat__detalle">
                {resumenRapido.cuentasPagadas} pagadas · {resumenRapido.cuentasPendientes} pendientes
              </span>
            </div>
          </div>
        </TarjetaModerna>

        <TarjetaModerna variant="elevated" hover>
          <div className="tarjeta-stat">
            <div className="tarjeta-stat__icono" style={{ background: 'rgba(234,179,8,0.12)', color: '#EAB308' }}>
              <IconoGrafico />
            </div>
            <div className="tarjeta-stat__contenido">
              <h4>Promedio Mensual</h4>
              <p className="tarjeta-stat__valor">{formatearPesosChilenos(estadisticasMesActual.promedioMensual)}</p>
              <span className="tarjeta-stat__detalle">Últimos 12 meses</span>
            </div>
          </div>
        </TarjetaModerna>

        {resumenRapido.servicioMasCaro && (
          <TarjetaModerna variant="elevated" hover>
            <div className="tarjeta-stat">
              <div
                className="tarjeta-stat__icono"
                style={{
                  background: coloresPorServicio[resumenRapido.servicioMasCaro.servicio].bg,
                  color: coloresPorServicio[resumenRapido.servicioMasCaro.servicio].color
                }}
              >
                {iconosPorServicio[resumenRapido.servicioMasCaro.servicio]}
              </div>
              <div className="tarjeta-stat__contenido">
                <h4>Servicio Más Caro</h4>
                <p className="tarjeta-stat__valor">{formatearPesosChilenos(resumenRapido.servicioMasCaro.total)}</p>
                <span className="tarjeta-stat__detalle">
                  {resumenRapido.servicioMasCaro.servicio.charAt(0).toUpperCase() + resumenRapido.servicioMasCaro.servicio.slice(1)}
                </span>
              </div>
            </div>
          </TarjetaModerna>
        )}
      </div>

      {/* Alertas */}
      {(estadisticasEstados.enMora > 0 || estadisticasEstados.vencidas > 0) && (
        <div className="dashboard-moderno__alertas">
          {estadisticasEstados.vencidas > 0 && (
            <TarjetaModerna variant="elevated" hover className="alerta-vencida">
              <div className="alerta-moderna">
                <div className="alerta-moderna__icono">
                  <IconoAlerta />
                </div>
                <div className="alerta-moderna__contenido">
                  <h4>Cuentas Vencidas</h4>
                  <p>{estadisticasEstados.vencidas} cuenta(s) · {formatearPesosChilenos(estadisticasEstados.montoTotalVencido)}</p>
                </div>
              </div>
            </TarjetaModerna>
          )}
          {estadisticasEstados.enMora > 0 && (
            <TarjetaModerna variant="elevated" hover className="alerta-mora">
              <div className="alerta-moderna">
                <div className="alerta-moderna__icono">
                  <IconoAdvertencia />
                </div>
                <div className="alerta-moderna__contenido">
                  <h4>Cuentas en Mora</h4>
                  <p>{estadisticasEstados.enMora} cuenta(s) · {formatearPesosChilenos(estadisticasEstados.montoTotalMora)}</p>
                </div>
              </div>
            </TarjetaModerna>
          )}
        </div>
      )}

      {/* Gráficos */}
      <div className="dashboard-moderno__graficos">
        <TarjetaModerna variant="elevated" hover>
          <TarjetaModerna.Header icon={<IconoTendencia />}>
            Evolución Mensual
          </TarjetaModerna.Header>
          <TarjetaModerna.Body>
            <GraficoEvolucionMensual cuentas={cuentas} año={añoActual} altura={280} />
          </TarjetaModerna.Body>
        </TarjetaModerna>

        <TarjetaModerna variant="elevated" hover>
          <TarjetaModerna.Header icon={<IconoTorta />}>
            Distribución por Servicio
          </TarjetaModerna.Header>
          <TarjetaModerna.Body>
            <GraficoDistribucionServicios
              cuentas={servicioCalculosEstadisticas.filtrarPorPeriodo(cuentas, añoActual, mesActual)}
              altura={280}
            />
          </TarjetaModerna.Body>
        </TarjetaModerna>
      </div>

      {/* Ranking */}
      {rankingServicios.length > 0 && (
        <TarjetaModerna variant="elevated" hover>
          <TarjetaModerna.Header icon={<IconoRanking />}>
            Gastos por Servicio · {nombreMes} {añoActual}
          </TarjetaModerna.Header>
          <TarjetaModerna.Body>
            <div className="ranking-servicios">
              {rankingServicios.map((servicio, index) => {
                const colores = coloresPorServicio[servicio.servicio];
                return (
                  <div key={servicio.servicio} className="ranking-item">
                    <div className="ranking-item__posicion">#{index + 1}</div>
                    <div className="ranking-item__icono" style={{ background: colores.bg, color: colores.color }}>
                      {iconosPorServicio[servicio.servicio]}
                    </div>
                    <div className="ranking-item__info">
                      <h4>{servicio.servicio.charAt(0).toUpperCase() + servicio.servicio.slice(1)}</h4>
                      <p>{servicio.cantidadCuentas} cuenta(s) · Promedio: {formatearPesosChilenos(servicio.promedioMonto)}</p>
                    </div>
                    <div className="ranking-item__monto">{formatearPesosChilenos(servicio.total)}</div>
                  </div>
                );
              })}
            </div>
          </TarjetaModerna.Body>
        </TarjetaModerna>
      )}
    </div>
  );
};

export default DashboardModerno;
