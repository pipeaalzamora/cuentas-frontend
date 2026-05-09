// Tipos para la Lista del Supermercado

export type CategoriaSuper =
  | 'frutas_verduras'
  | 'lacteos'
  | 'carnes'
  | 'panaderia'
  | 'abarrotes'
  | 'limpieza'
  | 'otros';

export const CATEGORIAS_SUPER: { id: CategoriaSuper; label: string; emoji: string }[] = [
  { id: 'frutas_verduras', label: 'Frutas y Verduras', emoji: '🥦' },
  { id: 'lacteos',         label: 'Lácteos',           emoji: '🥛' },
  { id: 'carnes',          label: 'Carnes',             emoji: '🥩' },
  { id: 'panaderia',       label: 'Panadería',          emoji: '🍞' },
  { id: 'abarrotes',       label: 'Abarrotes',          emoji: '🥫' },
  { id: 'limpieza',        label: 'Limpieza',           emoji: '🧹' },
  { id: 'otros',           label: 'Otros',              emoji: '🛒' },
];

export interface ItemSuper {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  categoria: CategoriaSuper;
  comprado: boolean;
  fechaAgregado: string;
}

export interface PrecioMemoria {
  nombre: string;
  precio: number;
  updatedAt: string;
}

export interface ListaSupermercado {
  id: string;
  nombre: string;
  items: ItemSuper[];
  presupuestoLimite: number;
  memoriaPrecios: PrecioMemoria[];
  mes: number;
  año: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumenSuper {
  totalCarrito: number;
  totalComprado: number;
  itemsPendientes: number;
  itemsComprados: number;
  presupuestoLimite: number;
  porcentajePresupuesto: number;
  superaPresupuesto: boolean;
  saldoSueldo: {
    disponible: number;
    tieneSueldo: boolean;
    alcanza: boolean;
  };
}

export interface ItemSuperInput {
  nombre: string;
  precio: number;
  cantidad: number;
  categoria: CategoriaSuper;
}
