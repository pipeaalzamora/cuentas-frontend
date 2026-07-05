// Tipos y interfaces para el Sistema de Gestión de Cuentas de Servicios

// Tipo para los servicios básicos disponibles
export type TipoServicio = 'luz' | 'agua' | 'gas' | 'internet';

// Interface principal para una cuenta de servicio
export interface CuentaServicio {
  id: string;
  servicio: TipoServicio;
  monto: number;
  fechaVencimiento: Date;
  mes: number;
  año: number;
  pagada: boolean;
  fechaCreacion: Date;
  fechaActualizacion?: Date;
  
  // Saldos y montos detallados
  saldoAnterior?: number;
  consumoActual?: number;
  montoTotal?: number; // saldoAnterior + consumoActual + otros cargos
  otrosCargos?: number;
  descuentos?: number;
  
  // Fechas adicionales del servicio
  fechaEmision?: Date;
  fechaLecturaAnterior?: Date;
  proximaFechaLectura?: Date;
  fechaCorte?: Date;
  
  // Estados adicionales
  tieneSaldoAnterior?: boolean;
  diasVencimiento?: number; // Días desde vencimiento (negativo si no vencida)
  enMora?: boolean;
  
  // Información adicional
  numeroFactura?: string;
  numeroMedidor?: string;
  lecturaAnterior?: number;
  lecturaActual?: number;
  consumoUnidades?: number; // kWh, m³, etc.
  unidadMedida?: string;
  
  // Notas y observaciones
  notas?: string;
  observaciones?: string;

  // Titularidad: si la cuenta es de un familiar (no propia)
  esFamiliar?: boolean;
  titular?: string; // nombre del familiar (ej: "Tío Juan"), vacío si es propia
}

// Interface para datos básicos del formulario (modo simple)
export interface CuentaServicioBasica {
  servicio: TipoServicio;
  monto: number;
  fechaVencimiento: Date;
  mes: number;
  año: number;
  pagada: boolean;
  observaciones?: string;
}

// Interface para datos completos del formulario (modo avanzado)
export interface CuentaServicioCompleta extends CuentaServicioBasica {
  saldoAnterior: number;
  consumoActual: number;
  otrosCargos: number;
  descuentos: number;
  fechaEmision: Date;
  fechaCorte: Date;
  fechaLectura: Date;
  proximaFechaLectura?: Date;
  lecturaAnterior?: number;
  lecturaActual?: number;
  consumoUnidades?: number;
  precioPorUnidad?: number;
  unidadMedida?: string;
  numeroFactura?: string;
  numeroCliente?: string;
}

// Interface para estadísticas mensuales calculadas
export interface EstadisticasMensuales {
  mes: number;
  año: number;
  totalGastos: number;
  gastosPorServicio: Record<TipoServicio, number>;
  promedioMensual: number;
  comparativaAnterior: number; // Porcentaje de cambio respecto al mes anterior
}

// Tipos para configuración de reportes
export type TipoReporte = 'mensual' | 'planilla' | 'anual';

export interface PeriodoReporte {
  mes?: number;
  año: number;
  mesInicio?: number;
  mesFin?: number;
}

export interface ConfiguracionReporte {
  tipo: TipoReporte;
  periodo: PeriodoReporte;
  incluirGraficos: boolean;
}

// Interface para configuración de usuario
export interface ConfiguracionUsuario {
  monedaDefault: string;
  recordatoriosActivos: boolean;
  temaOscuro: boolean;
}

// Interface para el almacenamiento local completo
export interface AlmacenamientoLocal {
  cuentas: CuentaServicio[];
  configuracion: ConfiguracionUsuario;
  version: string;
}

// Tipos para formularios y validación
export interface FormularioCuentaData {
  servicio: TipoServicio;
  monto: number;
  fechaVencimiento: Date;
  mes: number;
  año: number;
  pagada: boolean;
}

// Tipos para filtros y ordenamiento
export type CampoOrdenamiento = 'fechaVencimiento' | 'monto' | 'servicio' | 'fechaCreacion';
export type DireccionOrdenamiento = 'asc' | 'desc';

export interface FiltrosCuentas {
  mes?: number;
  año?: number;
  servicio?: TipoServicio;
  pagada?: boolean;
}

export interface OrdenamientoCuentas {
  campo: CampoOrdenamiento;
  direccion: DireccionOrdenamiento;
}

// Tipos para estados de la aplicación
export interface EstadoError {
  tieneError: boolean;
  mensajeError?: string;
  accionRecuperacion?: () => void;
}

// Tipos para notificaciones
export type TipoNotificacion = 'exito' | 'error' | 'advertencia' | 'info';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  duracion?: number;
}

// Re-exportar esquemas de validación
export * from './esquemas';

// Re-exportar tipos adicionales
export * from './eventos';
export * from './prediccion';
export * from './api';
export * from './desglosador';
export * from './desglosadorBebe';