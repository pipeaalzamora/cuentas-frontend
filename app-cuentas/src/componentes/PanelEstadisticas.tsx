import React, { useState, useMemo, memo, useCallback } from 'react';
import { useCuentas } from '../contextos/CuentasContext';
import { servicioCalculosEstadisticas } from '../servicios/calculosEstadisticas';
import { 
  GraficoEvolucionMensual, 
  GraficoDistribucionServicios, 
  GraficoComparativoMensual 
} from './graficos';
import Tarjeta from './base/Tarjeta';
import Boton from './base/Boton';
import WidgetIndicadores from './WidgetIndicadores';
import { SkeletonEstadisticas, SkeletonGrafico } from './base/Skeleton';
import { useLoading } from '../utilidades/useLoading';
import { formatearPesosChilenos, obtenerNombreMes } from '../utilidades/formatoChileno';
import type { TipoServicio } from '../tipos';
import './PanelEstadisticas.css';

interface FiltrosPeriodo {
  año: number;
  mes?: number;
  mesInicio?: number;
  mesFin?: number;
}

const PanelEstadisticas: React.FC = () => {
  const { cuentas, cargando } = useCuentas();
  const añoActual = new Date().getFullYear();
  const mesActual = new Date().getMonth() + 1;

  const [filtros, setFiltros] = useState<FiltrosPeriodo>({
    año: añoActual,
    mes: mesActual
  });

  const [vistaComparativa, setVistaComparativa] = useState<'trimestre' | 'semestre' | 'año'>('trimestre');
  const { isLoading: calculandoEstadisticas } = useLoading();

  // Filtrar cuentas según los filtros seleccionados
  const cuentasFiltradas = useMemo(() => {
    if (filtros.mes) {
      return servicioCalculosEstadisticas.filtrarPorPeriodo(cuentas, filtros.año, filtros.mes);
    } else if (filtros.mesInicio && filtros.mesFin) {
      return servicioCalculosEstadisticas.filtrarPorPeriodo(
        cuentas, 
        filtros.año, 
        undefined, 
        filtros.mesInicio, 
        filtros.mesFin
      );
    } else {
      return servicioCalculosEstadisticas.filtrarPorPeriodo(cuentas, filtros.año);
    }
  }, [cuentas, filtros]);

  // Calcular estadísticas del período actual
  const estadisticasActuales = useMemo(() => {
    if (filtros.mes) {
      return servicioCalculosEstadisticas.calcularEstadisticasMensuales(cuentas, filtros.año, filtros.mes);
    } else {
      // Para períodos más largos, calcular estadísticas agregadas
      const totalGastos = servicioCalculosEstadisticas.calcularTotalGastos(cuentasFiltradas);
      const gastosPorServicio = servicioCalculosEstadisticas.calcularGastosPorServicio(cuentasFiltradas);
      const promedioMensual = servicioCalculosEstadisticas.calcularPromedioMensual(cuentas, filtros.año, mesActual);
      
      // Calcular comparativa con período anterior
      const añoAnterior = filtros.año - 1;
      const cuentasAñoAnterior = servicioCalculosEstadisticas.filtrarPorPeriodo(cuentas, añoAnterior);
      const totalAñoAnterior = servicioCalculosEstadisticas.calcularTotalGastos(cuentasAñoAnterior);
      const comparativaAnterior = totalAñoAnterior > 0 ? ((totalGastos - totalAñoAnterior) / totalAñoAnterior) * 100 : 0;

      return {
        mes: 0, // Indica que es un período completo
        año: filtros.año,
        totalGastos,
        gastosPorServicio,
        promedioMensual,
        comparativaAnterior
      };
    }
  }, [cuentas, cuentasFiltradas, filtros, mesActual]);

  // Calcular ranking de servicios
  const rankingServicios = useMemo(() => {
    return servicioCalculosEstadisticas.obtenerRankingServicios(cuentasFiltradas);
  }, [cuentasFiltradas]);

  // Calcular resumen rápido
  const resumenRapido = useMemo(() => {
    return servicioCalculosEstadisticas.calcularResumenRapido(cuentasFiltradas);
  }, [cuentasFiltradas]);

  // Generar meses para comparativa
  const mesesComparativa = useMemo(() => {
    const mesActualNum = mesActual;
    switch (vistaComparativa) {
      case 'trimestre':
        return [mesActualNum - 2, mesActualNum - 1, mesActualNum].filter(m => m > 0);
      case 'semestre':
        return Array.from({ length: 6 }, (_, i) => mesActualNum - 5 + i).filter(m => m > 0);
      case 'año':
        return Array.from({ length: 12 }, (_, i) => i + 1);
      default:
        return [mesActualNum];
    }
  }, [mesActual, vistaComparativa]);

  const handleCambioFiltro = useCallback((campo: keyof FiltrosPeriodo, valor: number | undefined) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor,
      // Limpiar otros filtros de período cuando se cambia uno
      ...(campo === 'mes' && valor ? { mesInicio: undefined, mesFin: undefined } : {}),
      ...(campo === 'mesInicio' || campo === 'mesFin' ? { mes: undefined } : {})
    }));
  }, []);

  const formatearMoneda = useCallback((monto: number): string => {
    return formatearPesosChilenos(monto);
  }, []);

  const formatearPorcentaje = useCallback((porcentaje: number): string => {
    const signo = porcentaje > 0 ? '+' : '';
    return `${signo}${porcentaje.toFixed(1)}%`;
  }, []);

  const obtenerColorComparativa = (porcentaje: number): string => {
    if (porcentaje > 0) return 'var(--color-error)';
    if (porcentaje < 0) return 'var(--color-exito)';
    return 'var(--color-texto)';
  };

  if (cargando || calculandoEstadisticas) {
    return (
      <div className="panel-estadisticas">
        <Tarjeta className="filtros-periodo">
          <h3>Filtros de Período</h3>
          <div className="filtros-grid">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ height: '60px', backgroundColor: 'var(--color-superficie-2)', borderRadius: '4px' }} />
            ))}
          </div>
        </Tarjeta>
        
        <SkeletonEstadisticas />
        
        <div className="graficos-principales">
          <Tarjeta className="grafico-card">
            <SkeletonGrafico height={350} />
          </Tarjeta>
          <Tarjeta className="grafico-card">
            <SkeletonGrafico height={350} />
          </Tarjeta>
        </div>
        
        <Tarjeta className="grafico-comparativo">
          <SkeletonGrafico height={400} />
        </Tarjeta>
      </div>
    );
  }

  return (
    <div className="panel-estadisticas">
      {/* Indicadores económicos (mindicador.cl) */}
      <WidgetIndicadores />

      {/* Filtros de período */}
      <Tarjeta className="filtros-periodo">
        <h3>Filtros de Período</h3>
        <div className="filtros-grid">
          <div className="filtro-grupo">
            <label htmlFor="año">Año:</label>
            <select
              id="año"
              value={filtros.año}
              onChange={(e) => handleCambioFiltro('año', parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => añoActual - 2 + i).map(año => (
                <option key={año} value={año}>{año}</option>
              ))}
            </select>
          </div>

          <div className="filtro-grupo">
            <label htmlFor="mes">Mes específico:</label>
            <select
              id="mes"
              value={filtros.mes || ''}
              onChange={(e) => handleCambioFiltro('mes', e.target.value ? parseInt(e.target.value) : undefined)}
            >
              <option value="">Todo el año</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                <option key={mes} value={mes}>
                  {obtenerNombreMes(mes)}
                </option>
              ))}
            </select>
          </div>

          <div className="filtro-grupo">
            <Boton
              variante={!filtros.mes ? 'primary' : 'outline'}
              onClick={() => setFiltros(prev => ({ ...prev, mes: undefined }))}
              tamaño="sm"
            >
              Ver año completo
            </Boton>
          </div>
        </div>
      </Tarjeta>

      {/* Métricas principales */}
      <MetricasPrincipales
        estadisticas={estadisticasActuales}
        resumen={resumenRapido}
        formatearMoneda={formatearMoneda}
        formatearPorcentaje={formatearPorcentaje}
        obtenerColorComparativa={obtenerColorComparativa}
      />

      {/* Gráficos principales */}
      <div className="graficos-principales">
        <Tarjeta className="grafico-card">
          <GraficoEvolucionMensual 
            cuentas={cuentas} 
            año={filtros.año}
            altura={350}
          />
        </Tarjeta>

        <Tarjeta className="grafico-card">
          <GraficoDistribucionServicios 
            cuentas={cuentasFiltradas}
            altura={350}
          />
        </Tarjeta>
      </div>

      {/* Gráfico comparativo */}
      <Tarjeta className="grafico-comparativo">
        <div className="comparativo-header">
          <h3>Comparativa Mensual</h3>
          <div className="vista-controles">
            <Boton
              variante={vistaComparativa === 'trimestre' ? 'primary' : 'outline'}
              onClick={() => setVistaComparativa('trimestre')}
              tamaño="sm"
            >
              Trimestre
            </Boton>
            <Boton
              variante={vistaComparativa === 'semestre' ? 'primary' : 'outline'}
              onClick={() => setVistaComparativa('semestre')}
              tamaño="sm"
            >
              Semestre
            </Boton>
            <Boton
              variante={vistaComparativa === 'año' ? 'primary' : 'outline'}
              onClick={() => setVistaComparativa('año')}
              tamaño="sm"
            >
              Año
            </Boton>
          </div>
        </div>
        <GraficoComparativoMensual
          cuentas={cuentas}
          año={filtros.año}
          meses={mesesComparativa}
          altura={400}
        />
      </Tarjeta>

      {/* Ranking de servicios */}
      <RankingServicios
        ranking={rankingServicios}
        formatearMoneda={formatearMoneda}
      />
    </div>
  );
};

// Interfaces para props de componentes memoizados
interface EstadisticasPeriodo {
  totalGastos: number;
  promedioMensual: number;
  comparativaAnterior: number;
}

interface ResumenCuentas {
  totalCuentas: number;
  cuentasPagadas: number;
  cuentasPendientes: number;
  servicioMasCaro?: {
    servicio: TipoServicio;
    total: number;
  } | null;
}

// Componente memoizado para métricas principales
const MetricasPrincipales = memo<{
  estadisticas: EstadisticasPeriodo;
  resumen: ResumenCuentas;
  formatearMoneda: (monto: number) => string;
  formatearPorcentaje: (porcentaje: number) => string;
  obtenerColorComparativa: (porcentaje: number) => string;
}>(({ estadisticas, resumen, formatearMoneda, formatearPorcentaje, obtenerColorComparativa }) => (
  <div className="metricas-principales">
    <Tarjeta className="metrica-card">
      <div className="metrica-contenido">
        <h4>Total del Período</h4>
        <div className="metrica-valor">{formatearMoneda(estadisticas.totalGastos)}</div>
        <div 
          className="metrica-comparativa"
          style={{ color: obtenerColorComparativa(estadisticas.comparativaAnterior) }}
        >
          {formatearPorcentaje(estadisticas.comparativaAnterior)} vs período anterior
        </div>
      </div>
    </Tarjeta>

    <Tarjeta className="metrica-card">
      <div className="metrica-contenido">
        <h4>Promedio Mensual</h4>
        <div className="metrica-valor">{formatearMoneda(estadisticas.promedioMensual)}</div>
        <div className="metrica-descripcion">Basado en últimos 12 meses</div>
      </div>
    </Tarjeta>

    <Tarjeta className="metrica-card">
      <div className="metrica-contenido">
        <h4>Total de Cuentas</h4>
        <div className="metrica-valor">{resumen.totalCuentas}</div>
        <div className="metrica-descripcion">
          {resumen.cuentasPagadas} pagadas, {resumen.cuentasPendientes} pendientes
        </div>
      </div>
    </Tarjeta>

    <Tarjeta className="metrica-card">
      <div className="metrica-contenido">
        <h4>Servicio Principal</h4>
        <div className="metrica-valor">
          {resumen.servicioMasCaro?.servicio.toUpperCase() || 'N/A'}
        </div>
        <div className="metrica-descripcion">
          {resumen.servicioMasCaro ? formatearMoneda(resumen.servicioMasCaro.total) : 'Sin datos'}
        </div>
      </div>
    </Tarjeta>
  </div>
));

MetricasPrincipales.displayName = 'MetricasPrincipales';

interface RankingServicio {
  servicio: TipoServicio;
  total: number;
  porcentaje: number;
  cantidadCuentas: number;
  promedioMonto: number;
}

const SVG_SERVICIO: Record<string, React.ReactNode> = {
  luz: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.74V17h8v-2.26A7 7 0 0012 2z"/>
    </svg>
  ),
  agua: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6 9 4 13 4 16a8 8 0 0016 0c0-3-2-7-8-14z"/>
    </svg>
  ),
  gas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"/>
      <path d="M12 12c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z"/>
    </svg>
  ),
  internet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>
    </svg>
  ),
};

// Componente memoizado para ranking de servicios
const RankingServicios = memo<{
  ranking: RankingServicio[];
  formatearMoneda: (monto: number) => string;
}>(({ ranking, formatearMoneda }) => {
  const getPosicionClass = (index: number) => {
    if (index === 0) return 'ranking-posicion ranking-posicion--1';
    if (index === 1) return 'ranking-posicion ranking-posicion--2';
    if (index === 2) return 'ranking-posicion ranking-posicion--3';
    return 'ranking-posicion ranking-posicion--default';
  };

  return (
    <Tarjeta className="ranking-servicios">
      <div className="ranking-header">
        <span className="ranking-header-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M17 3H7l-2 7h12l-2-7z"/>
            <path d="M5 10c0 3.87 3.13 7 7 7s7-3.13 7-7"/>
          </svg>
        </span>
        <h3>Ranking de Servicios</h3>
        <span className="ranking-subtitle">Por gasto total</span>
      </div>
      <div className="ranking-lista">
        {ranking.map((item, index) => (
          <div key={item.servicio} className="ranking-item">
            <div className={getPosicionClass(index)}>
              {index + 1}
            </div>
            <div className="ranking-icono" style={{ color: getColorServicio(item.servicio) }}>
              {SVG_SERVICIO[item.servicio] ?? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="9"/>
                </svg>
              )}
            </div>
            <div className="ranking-info">
              <div className="ranking-servicio">
                {item.servicio.charAt(0).toUpperCase() + item.servicio.slice(1)}
              </div>
              <div className="ranking-detalles">
                {formatearMoneda(item.total)}
                <span className="ranking-porcentaje">({item.porcentaje.toFixed(1)}%)</span>
              </div>
              <div className="ranking-cuentas">
                {item.cantidadCuentas} cuentas · Promedio: {formatearMoneda(item.promedioMonto)}
              </div>
            </div>
            <div className="ranking-barra">
              <div
                className="ranking-progreso"
                style={{ width: `${item.porcentaje}%`, background: getColorServicio(item.servicio) }}
              />
            </div>
          </div>
        ))}
      </div>
    </Tarjeta>
  );
});

RankingServicios.displayName = 'RankingServicios';

// Función auxiliar para obtener color del servicio
const getColorServicio = (servicio: TipoServicio): string => {
  const colores: Record<TipoServicio, string> = {
    luz: '#FFD700',
    agua: '#38BDF8',
    gas: '#FF3B3B',
    internet: '#00FF88'
  };
  return colores[servicio] ?? '#00FF88';
};

export default memo(PanelEstadisticas);