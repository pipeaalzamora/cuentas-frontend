import React, { useState, useMemo, useEffect } from 'react';
import { servicioDesglosadorSueldo } from '../servicios/desglosadorSueldo';
import { formatearPesosChilenos } from '../utilidades/formatoChileno';
import type { DesgloseSueldo } from '../tipos/desglosador';
import Input from './base/Input';
import Boton from './base/Boton';
import './CalculadorSuenos.css';

const IconoEstrella = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconoMeta = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconoCalendario = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconoAhorro = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
  </svg>
);
const IconoSueldo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9 9h4a2 2 0 0 1 0 4H9v2h6"/>
  </svg>
);
const IconoGastos = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
  </svg>
);
const IconoInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const limpiarNumero = (v: string) => v.replace(/\D/g, '');
const formatearConPuntos = (v: string) => {
  const n = limpiarNumero(v);
  if (!n) return '';
  return new Intl.NumberFormat('es-CL').format(parseInt(n));
};

const CalculadorSuenos: React.FC = () => {
  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth() + 1;
  const añoActual = fechaActual.getFullYear();

  // Cargar desgloses de sueldo
  const [desgloses, setDesgloses] = useState<DesgloseSueldo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    servicioDesglosadorSueldo.obtenerDesgloses().then(d => {
      setDesgloses(d);
      setCargando(false);
    });
  }, []);

  // Tomar el desglose del mes actual (o el más reciente)
  const desgloseActual = useMemo(() => {
    const delMes = desgloses.find(d => d.mes === mesActual && d.año === añoActual);
    if (delMes) return delMes;
    // fallback: el más reciente
    return desgloses.sort((a, b) => {
      if (b.año !== a.año) return b.año - a.año;
      return b.mes - a.mes;
    })[0] ?? null;
  }, [desgloses, mesActual, añoActual]);

  // Calcular saldo restante desde el desglose
  const resumenSueldo = useMemo(() => {
    if (!desgloseActual) return null;
    return servicioDesglosadorSueldo.calcularResumen(desgloseActual);
  }, [desgloseActual]);

  const saldoRestante = resumenSueldo?.saldoRestante ?? 0;
  const sueldoInicial = resumenSueldo?.sueldoInicial ?? 0;
  const totalDescuentos = resumenSueldo?.totalDescuentos ?? 0;

  // Inputs
  const [nombreSueno, setNombreSueno] = useState('');
  const [precioBruto, setPrecioBruto] = useState('');
  const [porcentajeAhorro, setPorcentajeAhorro] = useState(30);
  const [calculado, setCalculado] = useState(false);

  const precio = parseInt(limpiarNumero(precioBruto)) || 0;
  const ahorroMensual = Math.round(Math.max(0, saldoRestante) * (porcentajeAhorro / 100));
  const mesesNecesarios = ahorroMensual > 0 ? Math.ceil(precio / ahorroMensual) : 0;
  const años = Math.floor(mesesNecesarios / 12);
  const mesesRestantes = mesesNecesarios % 12;

  const fechaLogro = useMemo(() => {
    if (mesesNecesarios <= 0) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + mesesNecesarios);
    return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  }, [mesesNecesarios]);

  const porcentajeProgreso = precio > 0 ? Math.min(100, (ahorroMensual / precio) * 100) : 0;
  const puedeCalcular = precio > 0 && saldoRestante > 0 && nombreSueno.trim().length > 0;

  const nombreMesDesglose = desgloseActual
    ? new Date(desgloseActual.año, desgloseActual.mes - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="calculador-suenos">
      <div className="calculador-suenos__header">
        <div className="calculador-suenos__header-icon">
          <IconoEstrella />
        </div>
        <div>
          <h1>Calculador de Sueños</h1>
          <p>Basado en tu saldo real de "Mi Sueldo"</p>
        </div>
      </div>

      {/* Banner de sueldo cargado */}
      {!cargando && (
        <div className={`cs-banner-sueldo ${desgloseActual ? 'cs-banner-sueldo--ok' : 'cs-banner-sueldo--warn'}`}>
          <span className="cs-banner-sueldo__icon">
            {desgloseActual ? <IconoSueldo /> : <IconoInfo />}
          </span>
          {desgloseActual ? (
            <span>
              Usando desglose de <strong>{nombreMesDesglose}</strong> —
              Sueldo: <strong>{formatearPesosChilenos(sueldoInicial)}</strong> ·
              Gastos: <strong>- {formatearPesosChilenos(totalDescuentos)}</strong> ·
              Saldo restante: <strong className="verde">{formatearPesosChilenos(saldoRestante)}</strong>
            </span>
          ) : (
            <span>No hay desglose de sueldo registrado. Ve a <strong>Mi Sueldo</strong> y agrega tu planilla primero.</span>
          )}
        </div>
      )}

      <div className="calculador-suenos__grid">
        {/* Panel izquierdo - Inputs */}
        <div className="calculador-suenos__inputs">
          <div className="cs-seccion">
            <h3><span className="cs-seccion__icon"><IconoMeta /></span>Tu Sueño</h3>
            <Input
              etiqueta="¿Qué quieres comprar?"
              type="text"
              value={nombreSueno}
              onChange={e => setNombreSueno(e.target.value)}
              placeholder="Ej: Tarjeta de video RTX 4080"
            />
            <Input
              etiqueta="Precio (CLP)"
              type="text"
              value={precioBruto}
              onChange={e => setPrecioBruto(formatearConPuntos(e.target.value))}
              placeholder="Ej: 2.000.000"
              icono={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9 9h4a2 2 0 0 1 0 4H9v2h6"/></svg>}
            />
          </div>

          <div className="cs-seccion">
            <h3><span className="cs-seccion__icon"><IconoGastos /></span>Tu saldo disponible</h3>
            <div className="cs-gasto-info">
              <span>Sueldo inicial</span>
              <span className="cs-gasto-valor">{formatearPesosChilenos(sueldoInicial)}</span>
            </div>
            <div className="cs-gasto-info">
              <span>Total gastos planilla</span>
              <span style={{ color: '#F87171', fontWeight: 700 }}>- {formatearPesosChilenos(totalDescuentos)}</span>
            </div>
            <div className="cs-gasto-info cs-gasto-info--destacado">
              <span>Saldo restante</span>
              <span className="cs-gasto-valor">{formatearPesosChilenos(saldoRestante)}</span>
            </div>
            {saldoRestante <= 0 && desgloseActual && (
              <p className="cs-aviso">Tu saldo restante es $0 o negativo. Revisa tu planilla en Mi Sueldo.</p>
            )}
          </div>

          <div className="cs-seccion">
            <h3><span className="cs-seccion__icon"><IconoAhorro /></span>% del saldo a ahorrar</h3>
            <div className="cs-slider-container">
              <input
                type="range" min={5} max={100} step={5}
                value={porcentajeAhorro}
                onChange={e => setPorcentajeAhorro(parseInt(e.target.value))}
                className="cs-slider"
              />
              <div className="cs-slider-labels">
                <span>5%</span>
                <span className="cs-slider-value">{porcentajeAhorro}%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="cs-gasto-info cs-gasto-info--destacado">
              <span>Ahorro mensual estimado</span>
              <span className="cs-gasto-valor">{formatearPesosChilenos(ahorroMensual)}</span>
            </div>
          </div>

          <Boton
            variante="primary"
            onClick={() => setCalculado(true)}
            disabled={!puedeCalcular}
            icono={<IconoMeta />}
          >
            Calcular mi sueño
          </Boton>
        </div>

        {/* Panel derecho - Resultado */}
        <div className={`calculador-suenos__resultado ${calculado && puedeCalcular ? 'visible' : ''}`}>
          {calculado && puedeCalcular ? (
            <>
              <div className="cs-resultado-header">
                <div className="cs-resultado-icon"><IconoEstrella /></div>
                <h2>{nombreSueno}</h2>
                <p className="cs-resultado-precio">{formatearPesosChilenos(precio)}</p>
              </div>

              <div className="cs-stats">
                <div className="cs-stat cs-stat--verde">
                  <div className="cs-stat__icon"><IconoSueldo /></div>
                  <div>
                    <span className="cs-stat__label">Saldo restante</span>
                    <span className="cs-stat__valor">{formatearPesosChilenos(saldoRestante)}</span>
                  </div>
                </div>
                <div className="cs-stat cs-stat--amarillo">
                  <div className="cs-stat__icon"><IconoAhorro /></div>
                  <div>
                    <span className="cs-stat__label">Ahorro mensual ({porcentajeAhorro}%)</span>
                    <span className="cs-stat__valor">{formatearPesosChilenos(ahorroMensual)}</span>
                  </div>
                </div>
                <div className="cs-stat cs-stat--azul">
                  <div className="cs-stat__icon"><IconoCalendario /></div>
                  <div>
                    <span className="cs-stat__label">Tiempo estimado</span>
                    <span className="cs-stat__valor">
                      {mesesNecesarios === 0
                        ? 'Ya puedes comprarlo'
                        : años > 0
                          ? `${años} año${años > 1 ? 's' : ''}${mesesRestantes > 0 ? ` y ${mesesRestantes} mes${mesesRestantes > 1 ? 'es' : ''}` : ''}`
                          : `${mesesNecesarios} mes${mesesNecesarios > 1 ? 'es' : ''}`
                      }
                    </span>
                  </div>
                </div>
                {fechaLogro && (
                  <div className="cs-stat cs-stat--morado">
                    <div className="cs-stat__icon"><IconoMeta /></div>
                    <div>
                      <span className="cs-stat__label">Lo tendrías en</span>
                      <span className="cs-stat__valor">{fechaLogro}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="cs-progreso">
                <div className="cs-progreso__header">
                  <span>Ahorro mensual vs precio total</span>
                  <span>{porcentajeProgreso.toFixed(1)}% por mes</span>
                </div>
                <div className="cs-progreso__barra">
                  <div className="cs-progreso__fill" style={{ width: `${porcentajeProgreso}%` }} />
                </div>
              </div>

              <div className="cs-desglose">
                <h4>Desglose del cálculo</h4>
                <div className="cs-desglose__fila">
                  <span>Sueldo inicial</span>
                  <span className="verde">{formatearPesosChilenos(sueldoInicial)}</span>
                </div>
                <div className="cs-desglose__fila">
                  <span>Gastos planilla</span>
                  <span className="rojo">- {formatearPesosChilenos(totalDescuentos)}</span>
                </div>
                <div className="cs-desglose__fila cs-desglose__fila--total">
                  <span>Saldo restante</span>
                  <span className="verde">{formatearPesosChilenos(saldoRestante)}</span>
                </div>
                <div className="cs-desglose__fila">
                  <span>Ahorro ({porcentajeAhorro}% del saldo)</span>
                  <span className="amarillo">{formatearPesosChilenos(ahorroMensual)}</span>
                </div>
                <div className="cs-desglose__fila cs-desglose__fila--total">
                  <span>Meses necesarios</span>
                  <span>{mesesNecesarios}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="cs-placeholder">
              <div className="cs-placeholder__icon"><IconoEstrella /></div>
              <h3>Tu resultado aparecerá aquí</h3>
              <p>
                {!desgloseActual
                  ? 'Primero agrega tu planilla en Mi Sueldo'
                  : 'Completa los datos y presiona "Calcular mi sueño"'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalculadorSuenos;
