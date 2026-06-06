import api from './api';

export const calculadoraGastosAPI = {
  // Obtener la calculadora
  obtener: async () => {
    const response = await api.get('/calculadora-gastos');
    return response.data;
  },

  // Agregar un gasto
  agregarGasto: async (gasto: { titulo: string; monto: number; cantidad: number; mes?: number; año?: number }) => {
    const response = await api.post('/calculadora-gastos/gastos', gasto);
    return response.data;
  },

  // Eliminar un gasto específico
  eliminarGasto: async (gastoId: string) => {
    const response = await api.delete(`/calculadora-gastos/gastos/${gastoId}`);
    return response.data;
  },

  // Eliminar todos los gastos
  eliminarTodos: async () => {
    const response = await api.delete('/calculadora-gastos/gastos');
    return response.data;
  },
};
