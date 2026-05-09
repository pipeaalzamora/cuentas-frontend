import api from './api';
import type { ItemSuperInput } from '../tipos/supermercado';

export const supermercadoAPI = {
  // Obtener la lista activa (crea una si no existe)
  obtener: async () => {
    const response = await api.get('/supermercado');
    return response.data;
  },

  // Actualizar configuración de la lista (nombre, presupuesto)
  actualizarConfig: async (input: { nombre?: string; presupuestoLimite?: number; mes?: number; año?: number }) => {
    const response = await api.put('/supermercado', input);
    return response.data;
  },

  // Obtener resumen del carrito cruzado con sueldo
  obtenerResumen: async () => {
    const response = await api.get('/supermercado/resumen');
    return response.data;
  },

  // Obtener memoria de precios
  obtenerMemoriaPrecios: async () => {
    const response = await api.get('/supermercado/memoria-precios');
    return response.data;
  },

  // Agregar un item a la lista
  agregarItem: async (item: ItemSuperInput) => {
    const response = await api.post('/supermercado/items', item);
    return response.data;
  },

  // Actualizar un item (precio, cantidad, comprado, categoria)
  actualizarItem: async (
    itemId: string,
    campos: { precio?: number; cantidad?: number; comprado?: boolean; categoria?: string }
  ) => {
    const response = await api.put(`/supermercado/items/${itemId}`, campos);
    return response.data;
  },

  // Eliminar un item
  eliminarItem: async (itemId: string) => {
    const response = await api.delete(`/supermercado/items/${itemId}`);
    return response.data;
  },

  // Limpiar items comprados
  limpiarComprados: async () => {
    const response = await api.delete('/supermercado/items/comprados');
    return response.data;
  },

  // Vaciar toda la lista
  vaciarLista: async () => {
    const response = await api.delete('/supermercado/items');
    return response.data;
  },
};
