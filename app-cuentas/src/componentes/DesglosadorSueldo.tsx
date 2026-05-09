import React, { useState, useEffect } from 'react';
import type { DesgloseSueldo, Gasto, TipoGasto } from '../tipos/desglosador';
import { servicioDesglosadorSueldo } from '../servicios/desglosadorSueldo';
import { desgloseSueldoAPI } from '../servicios/desgloseSueldoAPI';
import { servicioGeneradorPDF } from '../servicios/generadorPDF';
import { Boton, Input, Tarjeta, Modal } from './index';
import { usePeriodo } from '../contextos/PeriodoContext';
import '../estilos/botones-modernos.css';
import './DesglosadorSueldo.css';

const formatearPesosChilenos = (monto: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(monto);
};

const formatearNumeroConPuntos = (valor: string): string => {
  const numero = valor.replace(/\D/g, '');
  if (!numero) return '';
  return new Intl.NumberFormat('es-CL').format(parseInt(numero));
};

const limpiarNumero = (valor: string): string => {
  return valor.replace(/\D/g, '');
};

const DesglosadorSueldo: React.FC = () => {
  const { mes: mesGlobal, año: añoGlobal, cambiarPeriodo } = usePeriodo();
  const [desgloseActual, setDesgloseActual] = useState<DesgloseSueldo | null>(null);
  const [todosDesgloses, setTodosDesgloses] = useState<DesgloseSueldo[]>([]);
  const [sueldoInicial, setSueldoInicial] = useState<string>('');
  const [nombreDesglose, setNombreDesglose] = useState<string>('');
  const [mostrarFormGasto, setMostrarFormGasto] = useState(false);
  const [mostrarEditarSueldo, setMostrarEditarSueldo] = useState(false);
  const [mostrarConfirmacionEliminarTodos, setMostrarConfirmacionEliminarTodos] = useState(false);
  const [nuevoSueldo, setNuevoSueldo] = useState<string>('');
  const [gastoEditando, setGastoEditando] = useState<string | null>(null);
  
  // Form gasto propio
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState<TipoGasto>('otro');

  useEffect(() => {
    cargarDesgloses();
  }, []);

  useEffect(() => {
    if (todosDesgloses.length > 0) {
      cargarDesglosePorPeriodo(mesGlobal, añoGlobal);
    }
  }, [mesGlobal, añoGlobal, todosDesgloses.length]);

  const cargarDesgloses = async () => {
    try {
      const desgloses = await servicioDesglosadorSueldo.obtenerDesgloses();
      setTodosDesgloses(desgloses);
      cargarDesglosePorPeriodo(mesGlobal, añoGlobal, desgloses);
    } catch (error) {
      console.error('Error al cargar desgloses:', error);
    }
  };

  const cargarDesglosePorPeriodo = (mes: number, año: number, desgloses?: DesgloseSueldo[]) => {
    const listaDesgloses = desgloses || todosDesgloses;
    const desglose = listaDesgloses.find(d => d.mes === mes && d.año === año);
    
    if (desglose) {
      setDesgloseActual(desglose);
      setSueldoInicial(desglose.sueldoInicial.toString());
      setNombreDesglose(desglose.nombre || '');
    } else {
      setDesgloseActual(null);
    }
  };

  const iniciarDesglose = async () => {
    const sueldoLimpio = limpiarNumero(sueldoInicial);
    const sueldo = parseFloat(sueldoLimpio);
    if (isNaN(sueldo) || sueldo <= 0) return;

    const nuevoDesglose: any = {
      sueldoInicial: sueldo,
      mes: mesGlobal,
      año: añoGlobal,
      nombre: nombreDesglose || `Desglose ${mesGlobal}/${añoGlobal}`
    };

    try {
      const creado = await desgloseSueldoAPI.crear(nuevoDesglose);
      setDesgloseActual(creado.desglose || creado);
      await cargarDesgloses();
    } catch (error) {
      console.error('Error al iniciar desglose:', error);
    }
  };

  const agregarGasto = async () => {
    if (!desgloseActual || !descripcion || !monto) return;

    const montoLimpio = limpiarNumero(monto);
    const montoNum = parseFloat(montoLimpio);
    if (isNaN(montoNum) || montoNum <= 0) return;

    try {
      const nuevoGasto = {
        descripcion,
        monto: montoNum,
        tipo
      };

      await desgloseSueldoAPI.agregarGasto(desgloseActual.id, nuevoGasto);
      
      setDescripcion('');
      setMonto('');
      setTipo('otro');
      
      await cargarDesgloses();
      setMostrarFormGasto(false);
    } catch (error) {
      console.error('Error al agregar gasto:', error);
    }
  };

  const eliminarGasto = async (gastoId: string) => {
    if (!desgloseActual) return;

    try {
      await desgloseSueldoAPI.eliminarGasto(desgloseActual.id, gastoId);
      await cargarDesgloses();
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
    }
  };

  const iniciarEdicionGasto = (gasto: Gasto) => {
    setGastoEditando(gasto.id);
    setDescripcion(gasto.descripcion);
    setMonto(formatearNumeroConPuntos(gasto.monto.toString()));
    setTipo(gasto.tipo);
    setMostrarFormGasto(true);
  };

  const actualizarGasto = async () => {
    if (!desgloseActual || !gastoEditando || !descripcion || !monto) return;

    const montoLimpio = limpiarNumero(monto);
    const montoNum = parseFloat(montoLimpio);
    if (isNaN(montoNum) || montoNum <= 0) return;

    try {
      await desgloseSueldoAPI.eliminarGasto(desgloseActual.id, gastoEditando);
      
      const gastoActualizado = {
        descripcion,
        monto: montoNum,
        tipo
      };
      await desgloseSueldoAPI.agregarGasto(desgloseActual.id, gastoActualizado);
      
      await cargarDesgloses();
      
      setDescripcion('');
      setMonto('');
      setTipo('otro');
      setGastoEditando(null);
      setMostrarFormGasto(false);
    } catch (error) {
      console.error('Error al actualizar gasto:', error);
    }
  };

  const cancelarEdicion = () => {
    setDescripcion('');
    setMonto('');
    setTipo('otro');
    setGastoEditando(null);
    setMostrarFormGasto(false);
  };

  const generarPDF = () => {
    if (!desgloseActual) return;
    
    const resumen = servicioDesglosadorSueldo.calcularResumen(desgloseActual);
    servicioGeneradorPDF.generarReporteDesglose(desgloseActual, resumen);
  };

  const editarSueldo = async () => {
    if (!desgloseActual) return;
    
    const sueldoLimpio = limpiarNumero(nuevoSueldo);
    const sueldo = parseFloat(sueldoLimpio);
    if (isNaN(sueldo) || sueldo <= 0) return;

    const desgloseActualizado = {
      sueldoInicial: sueldo,
      mes: desgloseActual.mes,
      año: desgloseActual.año,
      nombre: desgloseActual.nombre
    };

    try {
      await desgloseSueldoAPI.actualizar(desgloseActual.id, desgloseActualizado);
      await cargarDesgloses();
      setMostrarEditarSueldo(false);
      setNuevoSueldo('');
    } catch (error) {
      console.error('Error al editar sueldo:', error);
    }
  };

  const eliminarTodosDesgloses = async () => {
    try {
      await desgloseSueldoAPI.eliminarTodos();
      setTodosDesgloses([]);
      setDesgloseActual(null);
      setMostrarConfirmacionEliminarTodos(false);
    } catch (error) {
      console.error('Error al eliminar todos los desgloses:', error);
    }
  };

  const cambiarDesglose = async (mes: number, año: number) => {
    cambiarPeriodo(mes, año);
    
    const desglose = todosDesgloses.find(d => d.mes === mes && d.año === año);
    if (desglose) {
      setDesgloseActual(desglose);
    } else {
      const nuevoDesglose = {
        sueldoInicial: desgloseActual?.sueldoInicial || 0,
        mes,
        año,
        nombre: `Desglose ${mes}/${año}`
      };
      try {
        const creado = await desgloseSueldoAPI.crear(nuevoDesglose);
        setDesgloseActual(creado);
        await cargarDesgloses();
      } catch (error) {
        console.error('Error al cambiar desglose:', error);
      }
    }
  };

  const generarOpcionesMeses = () => {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const añoActual = hoy.getFullYear();

    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Siempre incluir el mes actual
    const opciones: { mes: number; año: number; label: string; existe: boolean }[] = [
      {
        mes: mesActual,
        año: añoActual,
        label: `${meses[mesActual - 1]} ${añoActual}`,
        existe: todosDesgloses.some(d => d.mes === mesActual && d.año === añoActual),
      }
    ];

    // Agregar los desgloses ya existentes que no sean el mes actual
    todosDesgloses.forEach(d => {
      if (d.mes === mesActual && d.año === añoActual) return;
      const yaEsta = opciones.some(o => o.mes === d.mes && o.año === d.año);
      if (!yaEsta) {
        opciones.push({
          mes: d.mes,
          año: d.año,
          label: `${meses[d.mes - 1]} ${d.año}`,
          existe: true,
        });
      }
    });

    // Ordenar: más reciente primero
    opciones.sort((a, b) =>
      b.año !== a.año ? b.año - a.año : b.mes - a.mes
    );

    return opciones;
  };

  const resumen = desgloseActual ? servicioDesglosadorSueldo.calcularResumen(desgloseActual) : null;

  if (!desgloseActual) {
    return (
      <div className="desglosador-container">
        <Tarjeta>
          <h2>Desglosador de Sueldo</h2>
          <p>Ingresa tu sueldo para comenzar a registrar tus gastos</p>
          
          <div className="form-inicio">
            <Input
              type="text"
              value={nombreDesglose}
              onChange={(e) => setNombreDesglose(e.target.value)}
              placeholder="Nombre del desglose (opcional)"
              etiqueta="Nombre"
            />
            <Input
              type="text"
              value={sueldoInicial}
              onChange={(e) => {
                const limpio = limpiarNumero(e.target.value);
                setSueldoInicial(limpio ? formatearNumeroConPuntos(limpio) : '');
              }}
              placeholder="Ej: 1.500.000"
              etiqueta="Sueldo Inicial"
            />
            <Boton onClick={iniciarDesglose} variante="primary">
              Iniciar Desglose
            </Boton>
          </div>
        </Tarjeta>
      </div>
    );
  }

  return (
    <div className="desglosador-container">
      <Tarjeta>
        <div className="desglosador-header">
          <div className="header-info">
            <h2>{desgloseActual.nombre}</h2>
            <div className="selector-periodo">
              <select 
                value={`${desgloseActual.mes}-${desgloseActual.año}`}
                onChange={(e) => {
                  const [mes, año] = e.target.value.split('-').map(Number);
                  cambiarDesglose(mes, año);
                }}
                className="select-periodo"
              >
                {generarOpcionesMeses().map(opcion => (
                  <option 
                    key={`${opcion.mes}-${opcion.año}`} 
                    value={`${opcion.mes}-${opcion.año}`}
                  >
                    {opcion.label} {opcion.existe ? '✓' : '(nuevo)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="header-acciones">
            <button 
              onClick={() => setMostrarConfirmacionEliminarTodos(true)} 
              className="btn-moderno btn-moderno--eliminar btn-moderno--sm"
            >
              <span className="btn-moderno__icono">🗑️</span>
              <span>Eliminar Todos</span>
            </button>
            <button 
              onClick={() => {
                setNuevoSueldo(formatearNumeroConPuntos(desgloseActual.sueldoInicial.toString()));
                setMostrarEditarSueldo(true);
              }} 
              className="btn-moderno btn-moderno--editar btn-moderno--sm"
            >
              <span className="btn-moderno__icono">✏️</span>
              <span>Editar Sueldo</span>
            </button>
            <button 
              onClick={generarPDF} 
              className="btn-moderno btn-moderno--descargar btn-moderno--sm"
            >
              <span className="btn-moderno__icono">📄</span>
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>

        <div className="resumen-sueldo">
          <div className="resumen-item">
            <span className="label">Sueldo Inicial:</span>
            <span className="valor positivo">{formatearPesosChilenos(resumen?.sueldoInicial || 0)}</span>
          </div>
          <div className="resumen-item">
            <span className="label">Total Gastos:</span>
            <span className="valor negativo">-{formatearPesosChilenos(resumen?.totalGastos || 0)}</span>
          </div>
          <div className="resumen-item">
            <span className="label">Total Descuentos:</span>
            <span className="valor negativo">-{formatearPesosChilenos(resumen?.totalDescuentos || 0)}</span>
          </div>
          <div className="resumen-item destacado">
            <span className="label">Saldo Restante:</span>
            <span className={`valor ${(resumen?.saldoRestante || 0) >= 0 ? 'positivo' : 'negativo'}`}>
              {formatearPesosChilenos(resumen?.saldoRestante || 0)}
            </span>
          </div>
          <div className="resumen-item">
            <span className="label">Gastado:</span>
            <span className="valor">{resumen?.porcentajeGastado.toFixed(1)}%</span>
          </div>
        </div>

        <div className="barra-progreso">
          <div 
            className="barra-progreso-fill"
            style={{ width: `${Math.min(resumen?.porcentajeGastado || 0, 100)}%` }}
          />
        </div>

        <div className="acciones">
          <button 
            onClick={() => setMostrarFormGasto(true)} 
            className="btn-moderno btn-moderno--agregar"
          >
            <span className="btn-moderno__icono">+</span>
            <span>Agregar Gasto</span>
          </button>
        </div>

        <div className="lista-gastos">
          <h3>Gastos ({desgloseActual.gastos.length})</h3>
          {desgloseActual.gastos.length === 0 ? (
            <p className="sin-gastos">No hay gastos registrados</p>
          ) : (
            <div className="gastos-grid">
              {desgloseActual.gastos.map(gasto => (
                <div key={gasto.id} className="gasto-item">
                  <div className="gasto-info">
                    <span className={`gasto-tipo tipo-${gasto.tipo}`}>{gasto.tipo}</span>
                    <span className="gasto-descripcion">{gasto.descripcion}</span>
                    <span className="gasto-fecha">
                      {gasto.fecha.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="gasto-acciones">
                    <span className="gasto-monto">-{formatearPesosChilenos(gasto.monto)}</span>
                    <button 
                      className="btn-editar"
                      onClick={() => iniciarEdicionGasto(gasto)}
                      aria-label="Editar gasto"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-eliminar"
                      onClick={() => eliminarGasto(gasto.id)}
                      aria-label="Eliminar gasto"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Tarjeta>

      {mostrarFormGasto && (
        <Modal
          abierto={mostrarFormGasto}
          titulo={gastoEditando ? "Editar Gasto" : "Agregar Gasto"}
          onCerrar={cancelarEdicion}
        >
          <Modal.Body>
            <div className="form-gasto">
              <Input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción del gasto"
                etiqueta="Descripción"
              />
              <Input
                type="text"
                value={monto}
                onChange={(e) => {
                  const limpio = limpiarNumero(e.target.value);
                  setMonto(limpio ? formatearNumeroConPuntos(limpio) : '');
                }}
                placeholder="Ej: 50.000"
                etiqueta="Monto"
              />
              <select 
                value={tipo} 
                onChange={(e) => setTipo(e.target.value as TipoGasto)}
                className="select-tipo"
              >
                <option value="pago">Pago</option>
                <option value="compra">Compra</option>
                <option value="suscripcion">Suscripción</option>
                <option value="cuenta">Cuenta</option>
                <option value="deuda">Deuda</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Boton onClick={cancelarEdicion} variante="outline">
              Cancelar
            </Boton>
            <Boton onClick={gastoEditando ? actualizarGasto : agregarGasto} variante="primary">
              {gastoEditando ? "Actualizar" : "Agregar"}
            </Boton>
          </Modal.Footer>
        </Modal>
      )}

      {mostrarEditarSueldo && (
        <Modal
          abierto={mostrarEditarSueldo}
          titulo="Editar Sueldo Inicial"
          onCerrar={() => setMostrarEditarSueldo(false)}
        >
          <Modal.Body>
            <div className="form-gasto">
              <Input
                type="text"
                value={nuevoSueldo}
                onChange={(e) => {
                  const limpio = limpiarNumero(e.target.value);
                  setNuevoSueldo(limpio ? formatearNumeroConPuntos(limpio) : '');
                }}
                placeholder="Ej: 1.500.000"
                etiqueta="Sueldo Inicial"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Boton onClick={() => setMostrarEditarSueldo(false)} variante="outline">
              Cancelar
            </Boton>
            <Boton onClick={editarSueldo} variante="primary">
              Guardar
            </Boton>
          </Modal.Footer>
        </Modal>
      )}

      {mostrarConfirmacionEliminarTodos && (
        <Modal
          abierto={mostrarConfirmacionEliminarTodos}
          titulo="Eliminar Todos los Desgloses de Sueldo"
          onCerrar={() => setMostrarConfirmacionEliminarTodos(false)}
        >
          <Modal.Body>
            <p>¿Estás seguro de que deseas eliminar TODOS los desgloses de sueldo?</p>
            <p style={{ color: '#dc2626', marginTop: '1rem' }}>
              Esta acción no se puede deshacer y eliminará todos tus registros de sueldo.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Boton onClick={() => setMostrarConfirmacionEliminarTodos(false)} variante="outline">
              Cancelar
            </Boton>
            <Boton onClick={eliminarTodosDesgloses} variante="primary" style={{ backgroundColor: '#dc2626' }}>
              Eliminar Todos
            </Boton>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default DesglosadorSueldo;
