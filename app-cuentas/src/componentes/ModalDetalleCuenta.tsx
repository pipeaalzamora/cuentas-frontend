import React, { useEffect, useCallback } from 'react';
import type { CuentaServicio } from '../tipos';
import { formatearPesosChilenos, formatearFechaChilena, formatearMesAñoChileno } from '../utilidades/formatoChileno';
import './ModalDetalleCuenta.css';

interface ModalDetalleCuentaProps {
  cuenta: CuentaServicio | null;
  onCerrar: () => void;
  onEditar?: (cuenta: CuentaServicio) => void;
}

// --- SVG Icons ---
const IconoCerrar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconoEditar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconoLuz = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
  </svg>
);
const IconoAgua = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);
const IconoGas = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
const IconoInternet = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const IconoCalendario = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconoDinero = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v2m0 8v2M9 9h4a2 2 0 0 1 0 4H9v2h6" />
  </svg>
);
const IconoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconoReloj = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const ICONOS_SERVICIO: Record<string, React.ReactNode> = {
  luz:      <IconoLuz />,
  agua:     <IconoAgua />,
  gas:      <IconoGas />,
  internet: <IconoInternet />,
};

const COLORES_SERVICIO: Record<string, { color: string; bg: string }> = {
  luz:      { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
  agua:     { color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' },
  gas:      { color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
  internet: { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
};

const formatearFechaOpcional = (fecha: Date | string | undefined | null): string => {
  if (!fecha) return '—';
  try {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return '—';
    return formatearFechaChilena(d);
  } catch {
    return '—';
  }
};

interface FilaDetalleProps {
  icono: React.ReactNode;
  etiqueta: string;
  valor: React.ReactNode;
  destaca?: boolean;
}

const FilaDetalle: React.FC<FilaDetalleProps> = ({ icono, etiqueta, valor, destaca }) => (
  <div className={`modal-cuenta__fila${destaca ? ' modal-cuenta__fila--destaca' : ''}`}>
    <div className="modal-cuenta__fila-icono">{icono}</div>
    <div className="modal-cuenta__fila-contenido">
      <span className="modal-cuenta__fila-etiqueta">{etiqueta}</span>
      <span className="modal-cuenta__fila-valor">{valor}</span>
    </div>
  </div>
);

const ModalDetalleCuenta: React.FC<ModalDetalleCuentaProps> = ({ cuenta, onCerrar, onEditar }) => {
  // Cerrar con Escape
  const manejarTecla = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onCerrar();
  }, [onCerrar]);

  useEffect(() => {
    if (!cuenta) return;
    document.addEventListener('keydown', manejarTecla);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', manejarTecla);
      document.body.style.overflow = '';
    };
  }, [cuenta, manejarTecla]);

  if (!cuenta) return null;

  const colores = COLORES_SERVICIO[cuenta.servicio] ?? { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' };
  const icono = ICONOS_SERVICIO[cuenta.servicio] ?? <IconoDinero />;
  const servicioLabel = cuenta.servicio
    ? cuenta.servicio.charAt(0).toUpperCase() + cuenta.servicio.slice(1)
    : 'Servicio';

  const estadoLabel = cuenta.pagada ? 'Pagada' : 'Pendiente';
  const estadoClase = cuenta.pagada ? 'pagada' : 'pendiente';

  // Detectar si tiene datos avanzados
  const tieneDatosAvanzados =
    cuenta.fechaEmision ||
    cuenta.fechaCorte ||
    cuenta.proximaFechaLectura ||
    cuenta.saldoAnterior ||
    cuenta.consumoActual ||
    cuenta.otrosCargos ||
    cuenta.descuentos ||
    cuenta.numeroFactura ||
    cuenta.notas;

  return (
    <div
      className="modal-cuenta__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cuenta-titulo"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className="modal-cuenta__panel">
        {/* Header */}
        <div className="modal-cuenta__header">
          <div
            className="modal-cuenta__servicio-icono"
            style={{ background: colores.bg, color: colores.color }}
          >
            {icono}
          </div>
          <div className="modal-cuenta__header-info">
            <h2 id="modal-cuenta-titulo" className="modal-cuenta__titulo">
              {servicioLabel}
            </h2>
            <span className={`modal-cuenta__estado modal-cuenta__estado--${estadoClase}`}>
              {cuenta.pagada && <IconoCheck />}
              {estadoLabel}
            </span>
          </div>
          <button
            className="modal-cuenta__btn-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar detalle"
          >
            <IconoCerrar />
          </button>
        </div>

        {/* Monto destacado */}
        <div className="modal-cuenta__monto-hero" style={{ borderColor: colores.color + '33' }}>
          <span className="modal-cuenta__monto-label">Monto a pagar</span>
          <span className="modal-cuenta__monto-valor" style={{ color: colores.color }}>
            {formatearPesosChilenos(cuenta.monto)}
          </span>
        </div>

        {/* Sección principal */}
        <div className="modal-cuenta__seccion">
          <h3 className="modal-cuenta__seccion-titulo">Información general</h3>
          <div className="modal-cuenta__filas">
            <FilaDetalle
              icono={<IconoCalendario />}
              etiqueta="Vencimiento"
              valor={formatearFechaOpcional(cuenta.fechaVencimiento)}
              destaca
            />
            <FilaDetalle
              icono={<IconoReloj />}
              etiqueta="Período"
              valor={formatearMesAñoChileno(new Date(cuenta.año, cuenta.mes - 1, 1))}
            />
            <FilaDetalle
              icono={<IconoCalendario />}
              etiqueta="Fecha de creación"
              valor={formatearFechaOpcional(cuenta.fechaCreacion)}
            />
            {cuenta.notas && (
              <FilaDetalle
                icono={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                  </svg>
                }
                etiqueta="Notas"
                valor={cuenta.notas}
              />
            )}
          </div>
        </div>

        {/* Sección avanzada — solo si tiene datos */}
        {tieneDatosAvanzados && (
          <div className="modal-cuenta__seccion">
            <h3 className="modal-cuenta__seccion-titulo">Detalle de factura</h3>
            <div className="modal-cuenta__filas">
              {cuenta.fechaEmision && (
                <FilaDetalle
                  icono={<IconoCalendario />}
                  etiqueta="Fecha de emisión"
                  valor={formatearFechaOpcional(cuenta.fechaEmision)}
                />
              )}
              {cuenta.fechaCorte && (
                <FilaDetalle
                  icono={<IconoCalendario />}
                  etiqueta="Fecha de corte"
                  valor={formatearFechaOpcional(cuenta.fechaCorte)}
                  destaca
                />
              )}
              {cuenta.proximaFechaLectura && (
                <FilaDetalle
                  icono={<IconoReloj />}
                  etiqueta="Próxima lectura"
                  valor={formatearFechaOpcional(cuenta.proximaFechaLectura)}
                />
              )}
              {(cuenta.saldoAnterior !== undefined && cuenta.saldoAnterior > 0) && (
                <FilaDetalle
                  icono={<IconoDinero />}
                  etiqueta="Saldo anterior"
                  valor={formatearPesosChilenos(cuenta.saldoAnterior)}
                />
              )}
              {(cuenta.consumoActual !== undefined && cuenta.consumoActual > 0) && (
                <FilaDetalle
                  icono={<IconoDinero />}
                  etiqueta="Consumo actual"
                  valor={formatearPesosChilenos(cuenta.consumoActual)}
                />
              )}
              {(cuenta.otrosCargos !== undefined && cuenta.otrosCargos > 0) && (
                <FilaDetalle
                  icono={<IconoDinero />}
                  etiqueta="Otros cargos"
                  valor={formatearPesosChilenos(cuenta.otrosCargos)}
                />
              )}
              {(cuenta.descuentos !== undefined && cuenta.descuentos > 0) && (
                <FilaDetalle
                  icono={<IconoDinero />}
                  etiqueta="Descuentos"
                  valor={
                    <span style={{ color: '#00FF88' }}>
                      -{formatearPesosChilenos(cuenta.descuentos)}
                    </span>
                  }
                />
              )}
              {cuenta.numeroFactura && (
                <FilaDetalle
                  icono={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  }
                  etiqueta="N° Factura"
                  valor={cuenta.numeroFactura}
                />
              )}
            </div>
          </div>
        )}

        {/* Footer acciones */}
        {onEditar && (
          <div className="modal-cuenta__footer">
            <button
              className="modal-cuenta__btn-editar"
              onClick={() => { onEditar(cuenta); onCerrar(); }}
            >
              <IconoEditar />
              <span>Editar cuenta</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalDetalleCuenta;
