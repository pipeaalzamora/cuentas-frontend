import api from './api';

export const desgloseSueldoAPI = {
  // Obtener todos los desgloses
  obtenerTodos: async () => {
    const response = await api.get('/desglose-sueldo');
    return response.data;
  },

  // Obtener un desglose por ID
  obtenerPorId: async (id: string) => {
    const response = await api.get(`/desglose-sueldo/${id}`);
    return response.data;
  },

  // Obtener resumen consolidado (sueldo + cuentas del mes + supermercado)
  obtenerResumenConsolidado: async (id: string) => {
    const response = await api.get(`/desglose-sueldo/${id}/resumen-consolidado`);
    return response.data;
  },

  // Crear un desglose
  crear: async (desglose: { sueldoInicial: number; mes: number; año: number; nombre?: string }) => {
    const response = await api.post('/desglose-sueldo', desglose);
    return response.data;
  },

  // Actualizar un desglose
  actualizar: async (id: string, desglose: { sueldoInicial: number; mes: number; año: number; nombre?: string }) => {
    const response = await api.put(`/desglose-sueldo/${id}`, desglose);
    return response.data;
  },

  // Eliminar un desglose
  eliminar: async (id: string) => {
    const response = await api.delete(`/desglose-sueldo/${id}`);
    return response.data;
  },

  // Eliminar todos los desgloses
  eliminarTodos: async () => {
    const response = await api.delete('/desglose-sueldo');
    return response.data;
  },

  // Agregar un gasto
  agregarGasto: async (id: string, gasto: { descripcion: string; monto: number; tipo: string }) => {
    const response = await api.post(`/desglose-sueldo/${id}/gastos`, gasto);
    return response.data;
  },

  // Eliminar un gasto
  eliminarGasto: async (id: string, gastoId: string) => {
    const response = await api.delete(`/desglose-sueldo/${id}/gastos/${gastoId}`);
    return response.data;
  },
};
