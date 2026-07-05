import React, { useState } from 'react';
import { z } from 'zod';
import Input from './base/Input';
import Boton from './base/Boton';
import { useCuentas } from '../contextos/CuentasContext';
import useToast from '../utilidades/useToast';
import { esquemaFormularioCuenta } from '../tipos/esquemas';
import { obtenerNombreMes } from '../utilidades/formatoChileno';
import type { CuentaServicio, TipoServicio } from '../tipos';
import './FormularioCuenta.css';

interface Props {
  cuentaInicial?: CuentaServicio;
  enGuardar?: () => void;
  enCancelar?: () => void;
}

interface FormularioCuentaData {
  servicio: TipoServicio;
  monto: number;
  fechaVencimiento: Date;
  fechaEmision: Date;
  fechaCorte: Date;
  proximaFechaLectura: Date;
  mes: number;
  pagada: boolean;
}

interface ErroresFormulario {
  servicio?: string;
  monto?: string;
  fechaVencimiento?: string;
  fechaEmision?: string;
  fechaCorte?: string;
  proximaFechaLectura?: string;
  mes?: string;
  pagada?: string;
  general?: string;
}

const TIPOS_SERVICIO: Array<{ valor: TipoServicio; etiqueta: string }> = [
  { valor: 'luz', etiqueta: 'Electricidad' },
  { valor: 'agua', etiqueta: 'Agua Potable' },
  { valor: 'gas', etiqueta: 'Gas Natural' },
  { valor: 'internet', etiqueta: 'Internet/Telefonía' }
];

const MESES = Array.from({ length: 12 }, (_, i) => ({
  valor: i + 1,
  etiqueta: obtenerNombreMes(i + 1)
}));

const FormularioCuentaAvanzado: React.FC<Props> = ({
  cuentaInicial,
  enGuardar,
  enCancelar
}) => {
  const { agregarCuenta, actualizarCuenta } = useCuentas();
  const { mostrarExito, mostrarError } = useToast();

  const esEdicion = Boolean(cuentaInicial);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [enviando, setEnviando] = useState(false);
  const [validacionTiempoReal, setValidacionTiempoReal] = useState(false);

  // Titularidad: cuenta propia o de un familiar (estado propio, fuera de la validación zod)
  const [esFamiliar, setEsFamiliar] = useState<boolean>(cuentaInicial?.esFamiliar || false);
  const [titular, setTitular] = useState<string>(cuentaInicial?.titular || '');

  // Estado del formulario
  const [datosFormulario, setDatosFormulario] = useState<FormularioCuentaData>(() => {
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const fechaVencimiento = new Date(fechaActual);
    fechaVencimiento.setDate(fechaActual.getDate() + 30);

    const fechaEmision = new Date(fechaActual);
    const fechaCorte = new Date(fechaActual);
    fechaCorte.setDate(fechaActual.getDate() + 15);

    const proximaFechaLectura = new Date(fechaActual);
    proximaFechaLectura.setMonth(fechaActual.getMonth() + 1);

    if (cuentaInicial) {
      const toDate = (val: Date | string | undefined | null): Date => {
        if (!val) return new Date();
        const d = val instanceof Date ? val : new Date(val);
        return isNaN(d.getTime()) ? new Date() : d;
      };
      return {
        servicio: cuentaInicial.servicio,
        monto: cuentaInicial.monto,
        fechaVencimiento: toDate(cuentaInicial.fechaVencimiento),
        fechaEmision: toDate(cuentaInicial.fechaEmision) || fechaEmision,
        fechaCorte: toDate(cuentaInicial.fechaCorte) || fechaCorte,
        proximaFechaLectura: toDate(cuentaInicial.proximaFechaLectura) || proximaFechaLectura,
        mes: cuentaInicial.mes,
        pagada: cuentaInicial.pagada
      };
    }

    return {
      servicio: 'luz',
      monto: 0,
      fechaVencimiento,
      fechaEmision,
      fechaCorte,
      proximaFechaLectura,
      mes: mesActual,
      pagada: false
    };
  });

  // Validar campo individual
  const validarCampo = (campo: keyof FormularioCuentaData, valor: unknown): string | undefined => {
    try {
      const esquemaCampo = esquemaFormularioCuenta.pick({ [campo]: true });
      esquemaCampo.parse({ [campo]: valor });
      return undefined;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.issues[0]?.message;
      }
      return 'Error de validación';
    }
  };

  // Validar todo el formulario
  const validarFormulario = (): boolean => {
    try {
      esquemaFormularioCuenta.parse(datosFormulario);
      setErrores({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const nuevosErrores: ErroresFormulario = {};
        error.issues.forEach((err: z.ZodIssue) => {
          const campo = err.path[0] as keyof ErroresFormulario;
          if (campo && campo in nuevosErrores) {
            nuevosErrores[campo] = err.message;
          }
        });
        setErrores(nuevosErrores);
      }
      return false;
    }
  };

  // Función para manejar fechas correctamente (evita problemas de zona horaria)
  const parsearFecha = (fechaString: string): Date => {
    const [año, mes, dia] = fechaString.split('-').map(Number);
    return new Date(año, mes - 1, dia); // mes - 1 porque Date usa 0-11 para meses
  };

  // Función para formatear monto con separadores de miles
  const formatearMonto = (valor: string): string => {
    // Remover todo excepto números
    const numeroLimpio = valor.replace(/\D/g, '');
    
    // Agregar separadores de miles
    return numeroLimpio.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Manejar cambios en los campos
  const manejarCambio = (campo: keyof FormularioCuentaData) => (
    evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    let valor: string | number | boolean | Date;

    if (evento.target.type === 'checkbox') {
      valor = (evento.target as HTMLInputElement).checked;
    } else if (evento.target.type === 'number' || campo === 'monto' || campo === 'mes') {
      // Para el campo monto, manejar el formato especial
      if (campo === 'monto') {
        const valorLimpio = evento.target.value.replace(/\D/g, '');
        valor = parseInt(valorLimpio) || 0;
        
        // Actualizar el valor mostrado con formato
        const inputElement = evento.target as HTMLInputElement;
        setTimeout(() => {
          inputElement.value = formatearMonto(valorLimpio);
        }, 0);
      } else if (campo === 'mes') {
        // Asegurar que mes sea número
        valor = parseInt(evento.target.value) || 1;
      } else {
        valor = parseFloat(evento.target.value) || 0;
      }
    } else if (evento.target.type === 'date') {
      valor = parsearFecha(evento.target.value);
    } else {
      valor = evento.target.value;
    }

    setDatosFormulario(prev => ({
      ...prev,
      [campo]: valor
    }));

    // Validación en tiempo real después del primer intento de envío
    if (validacionTiempoReal) {
      const errorCampo = validarCampo(campo, valor);
      setErrores(prev => ({
        ...prev,
        [campo]: errorCampo
      }));
    }
  };

  // Manejar envío del formulario
  const manejarEnvio = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setValidacionTiempoReal(true);

    if (!validarFormulario()) {
      mostrarError('Por favor, corrige los errores en el formulario');
      return;
    }

    setEnviando(true);
    setErrores({});

    try {
      if (esEdicion && cuentaInicial) {
        // Actualizar cuenta existente
        await actualizarCuenta(cuentaInicial.id, {
          ...datosFormulario,
          año: new Date().getFullYear(),
          esFamiliar,
          titular: esFamiliar ? titular.trim() : '',
          fechaActualizacion: new Date()
        });

        mostrarExito('Cuenta actualizada correctamente');
        enGuardar?.();
      } else {
        // Crear nueva cuenta
        const datosAdaptados = {
          ...datosFormulario,
          año: new Date().getFullYear(),
          saldoAnterior: 0,
          consumoActual: datosFormulario.monto,
          otrosCargos: 0,
          descuentos: 0,
          esFamiliar,
          titular: esFamiliar ? titular.trim() : ''
        };
        
        await agregarCuenta(datosAdaptados);
        mostrarExito('Cuenta registrada correctamente');
        enGuardar?.();
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al guardar la cuenta';
      mostrarError(mensaje);
      setErrores({ general: mensaje });
    } finally {
      setEnviando(false);
    }
  };

  // Formatear fecha para input date (evita problemas de zona horaria)
  const formatearFechaParaInput = (fecha: Date | undefined | null): string => {
    if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) {
      const hoy = new Date();
      return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    }
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  return (
    <form onSubmit={manejarEnvio} className="formulario-cuenta" noValidate>
      <div className="formulario-cuenta__header">
        <h2 className="formulario-cuenta__titulo">
          {esEdicion ? 'Editar Cuenta' : 'Registrar Nueva Cuenta'}
        </h2>
      </div>

      {errores.general && (
        <div className="formulario-cuenta__error-general" role="alert">
          {errores.general}
        </div>
      )}

      <div className="formulario-cuenta__campos">
        {/* Información Básica */}
        <div className="formulario-cuenta__seccion">
          <h3 className="formulario-cuenta__subtitulo">Información Básica</h3>

          <div className="formulario-cuenta__fila">
            {/* Tipo de Servicio */}
            <div className="formulario-cuenta__campo">
              <label htmlFor="servicio" className="formulario-cuenta__etiqueta">
                Tipo de Servicio *
              </label>
              <select
                id="servicio"
                value={datosFormulario.servicio}
                onChange={manejarCambio('servicio')}
                className={`formulario-cuenta__select ${errores.servicio ? 'formulario-cuenta__select--error' : ''}`}
                disabled={enviando}
              >
                {TIPOS_SERVICIO.map(tipo => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.etiqueta}
                  </option>
                ))}
              </select>
              {errores.servicio && (
                <span className="formulario-cuenta__error" role="alert">
                  {errores.servicio}
                </span>
              )}
            </div>

            {/* Mes */}
            <div className="formulario-cuenta__campo">
              <label htmlFor="mes" className="formulario-cuenta__etiqueta">
                Mes *
              </label>
              <select
                id="mes"
                value={datosFormulario.mes}
                onChange={manejarCambio('mes')}
                className={`formulario-cuenta__select ${errores.mes ? 'formulario-cuenta__select--error' : ''}`}
                disabled={enviando}
              >
                {MESES.map(mes => (
                  <option key={mes.valor} value={mes.valor}>
                    {mes.etiqueta}
                  </option>
                ))}
              </select>
              {errores.mes && (
                <span className="formulario-cuenta__error" role="alert">
                  {errores.mes}
                </span>
              )}
            </div>
          </div>

          {/* Monto */}
          <Input
            etiqueta="Monto Total (CLP) *"
            type="text"
            value={datosFormulario.monto ? formatearMonto(datosFormulario.monto.toString()) : ''}
            onChange={manejarCambio('monto')}
            error={errores.monto}
            disabled={enviando}
            placeholder="Ej: 50.000"
          />
        </div>

        {/* Fechas Importantes */}
        <div className="formulario-cuenta__seccion">
          <h3 className="formulario-cuenta__subtitulo">Fechas Importantes</h3>

          {/* Fecha de Vencimiento */}
          <Input
            etiqueta="Fecha de Vencimiento *"
            type="date"
            value={formatearFechaParaInput(datosFormulario.fechaVencimiento)}
            onChange={manejarCambio('fechaVencimiento')}
            error={errores.fechaVencimiento}
            disabled={enviando}
          />

          <div className="formulario-cuenta__fila">
            {/* Fecha de Emisión */}
            <Input
              etiqueta="Fecha de Emisión"
              type="date"
              value={formatearFechaParaInput(datosFormulario.fechaEmision)}
              onChange={manejarCambio('fechaEmision')}
              error={errores.fechaEmision}
              disabled={enviando}
            />

            {/* Fecha de Corte */}
            <Input
              etiqueta="Fecha de Corte"
              type="date"
              value={formatearFechaParaInput(datosFormulario.fechaCorte)}
              onChange={manejarCambio('fechaCorte')}
              error={errores.fechaCorte}
              disabled={enviando}
            />
          </div>

          {/* Próxima Fecha de Lectura */}
          <Input
            etiqueta="Próxima Fecha de Lectura"
            type="date"
            value={formatearFechaParaInput(datosFormulario.proximaFechaLectura)}
            onChange={manejarCambio('proximaFechaLectura')}
            error={errores.proximaFechaLectura}
            disabled={enviando}
          />
        </div>

        {/* Estado */}
        <div className="formulario-cuenta__seccion">
          <h3 className="formulario-cuenta__subtitulo">Estado</h3>

          <div className="formulario-cuenta__campo formulario-cuenta__campo--checkbox">
            <label className="formulario-cuenta__checkbox-label">
              <input
                type="checkbox"
                checked={datosFormulario.pagada}
                onChange={manejarCambio('pagada')}
                className="formulario-cuenta__checkbox"
                disabled={enviando}
              />
              <span className="formulario-cuenta__checkbox-texto">
                Cuenta pagada
              </span>
            </label>
          </div>

          {/* Titularidad: cuenta propia o de un familiar */}
          <div className="formulario-cuenta__campo formulario-cuenta__campo--checkbox">
            <label className="formulario-cuenta__checkbox-label">
              <input
                type="checkbox"
                checked={esFamiliar}
                onChange={(e) => setEsFamiliar(e.target.checked)}
                className="formulario-cuenta__checkbox"
                disabled={enviando}
              />
              <span className="formulario-cuenta__checkbox-texto">
                Esta cuenta es de un familiar
              </span>
            </label>
          </div>

          {esFamiliar && (
            <Input
              etiqueta="¿De quién? (opcional)"
              type="text"
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              disabled={enviando}
              placeholder="Ej: Tío Juan, Prima Ana"
            />
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="formulario-cuenta__acciones">
        {enCancelar && (
          <Boton
            type="button"
            variante="outline"
            onClick={enCancelar}
            disabled={enviando}
          >
            Cancelar
          </Boton>
        )}

        <Boton
          type="submit"
          variante="primary"
          cargando={enviando}
          disabled={enviando}
        >
          {esEdicion ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
        </Boton>
      </div>
    </form>
  );
};

export default FormularioCuentaAvanzado;