import React, { useState, useMemo } from 'react';
import { useCuentas } from '../contextos/CuentasContext';
import { servicioCalculosEstadisticas } from '../servicios/calculosEstadisticas';
import { formatearPesosChilenos } from '../utilidades/formatoChileno';
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
    <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><path d="M22 2l-5 5"/><path d="M17 2h5v5"/>
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

const limpiarNumero = (v: string) => v.replace(/\D/g, '');
const formatearConPuntos = (v: string) => {
  const n = limpiarNumero(v);
  if (!n) return '';
  return new Intl.NumberFormat('es-CL').format(parseInt(n));
};

const CalculadorSuenos: React.FC = () => {
  const { cuentas } = useCuentas();

  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth() + 1;
  const añoActual = fechaActual.getFullYear();

  // Calcular gasto mensual promedio de los últimos 3 meses
  const gastoMensualPromedio = useMemo(() => {
    const meses = [0, 1, 2].map(offset => {
      let m = mesActual - offset;
      let a = añoActual;
      if (m <= 0) { m += 12; a -= 1; }
      return servicioCalculosEstadisticas.calcularEstadisticasMensuales(cuentas, a, m).totalGastos;
    });
    const total = meses.reduce((s, v) => s + v, 0);
    const mesesConDatos = meses.filter(v => v > 0).length;
    return mesesConDatos > 0 ? Math.round(total / mesesConDatos) : 0;
  }, [cuentas, mesActual, añoActual]);

  // Inputs
  const [nombreSueno, setNombreSueno] = useState('');
  const [precioBruto, setPrecioBruto] = useState('');
  const [sueldoBruto, setSueldoBruto] = useState('');
  const [porcentajeAhorro, setPorcentajeAhorro] = useState(30);
  const [calculado, setCalculado] = useState(false);

  const precio = parseInt(limpiarNumero(precioBruto)) || 0;
  const sueldo = parseInt(limpiarNumero(sueldoBruto)) || 0;
  const excedente = Math.max(0, sueldo - gastoMensualPromedio);
  const ahorroMensual = Math.round(excedente * (porcentajeAhorro / 100));
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

  const puedeCalcular = precio > 0 && sueldo > 0 && nombreSueno.trim().length > 0;

  return (
    <div className="calculador-suenos">
      {/* Header */}
      <div className="calculador-suenos__header">
        <div className="calculador-suenos__header-icon">
          <IconoEstrella />
        </div>
        <div>
          <h1>Calculador de Sueños</h1>
          <p>Descubre cuánto tiempo necesitas para alcanzar tu meta</p>
        </div>
      </div>

      <div className="calculador-suenos__grid">
        {/* Panel izquierdo - Inputs */}
        <div className="calculador-suenos__inputs">
          <div className="cs-seccion">
            <h3>
              <span className="cs-seccion__icon"><IconoMeta /></span>
              Tu Sueño
            </h3>
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
            <h3>
              <span className="cs-seccion__icon"><IconoSueldo /></span>
              Tu Sueldo Mensual
            </h3>
            <Input
              etiqueta="Sueldo neto (CLP)"
              type="text"
              value={sueldoBruto}
              onChange={e => setSueldoBruto(formatearConPuntos(e.target.value))}
              placeholder="Ej: 1.500.000"
            />
          </div>

          <div className="cs-seccion">
            <h3>
              <span className="cs-seccion__icon"><IconoGastos /></span>
              Tus Gastos
            </h3>
            <div className="cs-gasto-info">
              <span>Promedio mensual (últimos 3 meses)</span>
              <span className="cs-gasto-valor">{formatearPesosChilenos(gastoMensualPromedio)}</span>
            </div>
            {gastoMensualPromedio === 0 && (
              <p className="cs-aviso">No hay cuentas registradas. El cálculo usará $0 en gastos.</p>
            )}
          </div>

          <div className="cs-seccion">
            <h3>
              <span className="cs-seccion__icon"><IconoAhorro /></span>
              % del excedente a ahorrar
            </h3>
            <div className="cs-slider-container">
              <input
                type="range"
                min={5}
                max={100}
                step={5}
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

              {/* Stats grid */}
              <div className="cs-stats">
                <div className="cs-stat cs-stat--verde">
                  <div className="cs-stat__icon"><IconoSueldo /></div>
                  <div>
                    <span className="cs-stat__label">Excedente mensual</span>
                    <span className="cs-stat__valor">{formatearPesosChilenos(excedente)}</span>
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
                        ? '¡Ya puedes comprarlo!'
                        : años > 0
                          ? `${años} año${años > 1 ? 's' : ''} ${mesesRestantes > 0 ? `y ${mesesRestantes} mes${mesesRestantes > 1 ? 'es' : ''}` : ''}`
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

              {/* Barra de progreso visual */}
              <div className="cs-progreso">
                <div className="cs-progreso__header">
                  <span>Ahorro mensual vs precio total</span>
                  <span>{porcentajeProgreso.toFixed(1)}% por mes</span>
                </div>
                <div className="cs-progreso__barra">
                  <div
                    className="cs-progreso__fill"
                    style={{ width: `${porcentajeProgreso}%` }}
                  />
                </div>
              </div>

              {/* Desglose */}
              <div className="cs-desglose">
                <h4>Desglose del cálculo</h4>
                <div className="cs-desglose__fila">
                  <span>Sueldo neto</span>
                  <span className="verde">{formatearPesosChilenos(sueldo)}</span>
                </div>
                <div className="cs-desglose__fila">
                  <span>Gastos mensuales promedio</span>
                  <span className="rojo">- {formatearPesosChilenos(gastoMensualPromedio)}</span>
                </div>
                <div className="cs-desglose__fila cs-desglose__fila--total">
                  <span>Excedente disponible</span>
                  <span className="verde">{formatearPesosChilenos(excedente)}</span>
                </div>
                <div className="cs-desglose__fila">
                  <span>Ahorro ({porcentajeAhorro}% del excedente)</span>
                  <span className="amarillo">{formatearPesosChilenos(ahorroMensual)}</span>
                </div>
                <div className="cs-desglose__fila cs-desglose__fila--total">
                  <span>Meses necesarios</span>
                  <span>{mesesNecesarios}</span>
                </div>
              </div>

              {excedente <= 0 && (
                <div className="cs-alerta">
                  Tus gastos superan tu sueldo. Revisa tus cuentas o ajusta tu presupuesto.
                </div>
              )}
            </>
          ) : (
            <div className="cs-placeholder">
              <div className="cs-placeholder__icon"><IconoEstrella /></div>
              <h3>Tu resultado aparecerá aquí</h3>
              <p>Completa los datos y presiona "Calcular mi sueño"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalculadorSuenos;
