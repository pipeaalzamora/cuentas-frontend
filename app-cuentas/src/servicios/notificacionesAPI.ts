import api from './api';

export interface PreferenciasNotificacion {
  email: string;
  telefono: string;
  canalEmail: boolean;
  canalSMS: boolean;
  diasAntesVencimiento: number;
}

export const notificacionesAPI = {
  // Obtener preferencias del usuario
  obtenerPreferencias: async (): Promise<PreferenciasNotificacion> => {
    const response = await api.get('/notificaciones/preferencias');
    const d = response.data;
    return {
      email: d.email || '',
      telefono: d.telefono || '',
      canalEmail: Boolean(d.canalEmail),
      canalSMS: Boolean(d.canalSMS),
      diasAntesVencimiento: d.diasAntesVencimiento ?? 3
    };
  },

  // Guardar preferencias
  guardarPreferencias: async (pref: PreferenciasNotificacion) => {
    const response = await api.put('/notificaciones/preferencias', pref);
    return response.data;
  },

  // Enviar notificación de prueba según los canales activos
  enviarPrueba: async () => {
    const response = await api.post('/notificaciones/prueba');
    return response.data;
  },
};
