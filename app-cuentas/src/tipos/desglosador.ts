// Tipos para el Desglosador de Sueldo

export type TipoGasto = 'pago' | 'compra' | 'suscripcion' | 'cuenta' | 'deuda' | 'otro';

export type CategoriaGasto =
  | 'basicos'
  | 'arriendo'
  | 'supermercado'
  | 'manutencion'
  | 'prestamos'
  | 'otro';

export const CATEGORIAS_GASTO: { id: CategoriaGasto; label: string }[] = [
  { id: 'basicos', label: 'Gastos básicos' },
  { id: 'arriendo', label: 'Arriendo' },
  { id: 'supermercado', label: 'Supermercado' },
  { id: 'manutencion', label: 'Manutención' },
  { id: 'prestamos', label: 'Préstamos' },
  { id: 'otro', label: 'Otro' }
];

export interface Gasto {
  id: string;
  descripcion: string;
  monto: number;
  tipo: TipoGasto;
  categoria?: CategoriaGasto;
  fecha: Date;
}

export interface GastoBebeRef {
  id: string;
  descripcion: string;
  monto: number;
  cantidad: number;
  tipo: string;
  fecha: Date;
  desgloseBebeId: string;
}

export interface GastoGeneralRef {
  id: string;
  titulo: string;
  monto: number;
  cantidad: number;
  fecha: Date;
}

export interface DesgloseSueldo {
  id: string;
  sueldoInicial: number;
  gastos: Gasto[];
  gastosBebe: GastoBebeRef[];
  gastosGenerales: GastoGeneralRef[];
  fechaCreacion: Date;
  mes: number;
  año: number;
  nombre?: string;
}

export interface ResumenDesglose {
  sueldoInicial: number;
  totalGastos: number;
  totalGastosBebe: number;
  totalGastosGenerales: number;
  totalDescuentos: number;
  saldoRestante: number;
  gastosPorTipo: Record<TipoGasto, number>;
  porcentajeGastado: number;
}

/** Cuenta de servicio reflejada (solo lectura) dentro del desglose de sueldo */
export interface CuentaReflejada {
  id: string;
  servicio: string;
  monto: number;
  pagada: boolean;
  esFamiliar?: boolean;
  titular?: string;
}

/**
 * Resumen consolidado que cruza el sueldo con las cuentas de servicios
 * y el carrito del supermercado del mismo período.
 */
export interface ResumenConsolidado extends ResumenDesglose {
  /** Cuentas (luz, agua, gas, internet) del mes reflejadas como descuento */
  cuentasReflejadas: CuentaReflejada[];
  totalCuentas: number;
  /** Total del carrito de supermercado reflejado como una sola línea */
  totalSupermercado: number;
  /** Total combinado: gastos manuales + bebé + generales + cuentas + super */
  totalDescuentosConsolidado: number;
  /** Saldo final disponible para gestionar libremente */
  saldoDisponible: number;
  porcentajeGastadoConsolidado: number;
}
