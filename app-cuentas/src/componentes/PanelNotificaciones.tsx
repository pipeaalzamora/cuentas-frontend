import React, { useState, useEffect } from 'react';
import { notificacionesAPI } from '../servicios/notificacionesAPI';
import type { PreferenciasNotificacion } from '../servicios/notificacionesAPI';
import './PanelNotificaciones.css';

const PanelNotificaciones: React.FC = () => {
  const [pref, setPref] = useState<PreferenciasNotificacion>({
    email: '',
    telefono: '',
    canalEmail: false,
    canalSMS: false,
    diasAntesVencimiento: 3
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    notificacionesAPI
      .obtenerPreferencias()
      .then(setPref)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const actualizar = (campos: Partial<PreferenciasNotificacion>) => {
    setPref(prev => ({ ...prev, ...campos }));
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      await notificacionesAPI.guardarPreferencias(pref);
      setMensaje({ tipo: 'ok', texto: 'Preferencias guardadas' });
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudieron guardar las preferencias' });
    } finally {
      setGuardando(false);
    }
  };

  const probar = async () => {
    setMensaje(null);
    try {
      const res = await notificacionesAPI.enviarPrueba();
      const detalles = Object.entries(res.resultados || {})
        .map(([canal, estado]) => `${canal}: ${estado}`)
        .join(' · ');
      setMensaje({ tipo: 'ok', texto: `Prueba enviada (${detalles})` });
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al enviar la prueba. Guarda primero y revisa que el canal tenga destino.' });
    }
  };

  if (cargando) {
    return <div className="panel-notif__cargando">Cargando preferencias...</div>;
  }

  return (
    <div className="panel-notif">
      <div className="panel-notif__header">
        <h3>Notificaciones</h3>
        <p>Recibe avisos cuando tus cuentas estén por vencer</p>
      </div>

      <div className="panel-notif__canales">
        {/* Email */}
        <label className="panel-notif__canal">
          <input
            type="checkbox"
            checked={pref.canalEmail}
            onChange={e => actualizar({ canalEmail: e.target.checked })}
          />
          <span className="panel-notif__canal-label">Email</span>
        </label>
        {pref.canalEmail && (
          <input
            type="email"
            className="panel-notif__input"
            placeholder="tucorreo@ejemplo.com"
            value={pref.email}
            onChange={e => actualizar({ email: e.target.value })}
          />
        )}

        {/* SMS */}
        <label className="panel-notif__canal">
          <input
            type="checkbox"
            checked={pref.canalSMS}
            onChange={e => actualizar({ canalSMS: e.target.checked })}
          />
          <span className="panel-notif__canal-label">SMS</span>
        </label>
        {pref.canalSMS && (
          <input
            type="tel"
            className="panel-notif__input"
            placeholder="+56912345678"
            value={pref.telefono}
            onChange={e => actualizar({ telefono: e.target.value })}
          />
        )}

        {/* Días de anticipación */}
        <div className="panel-notif__dias">
          <label htmlFor="dias-notif">Avisar con anticipación de</label>
          <select
            id="dias-notif"
            value={pref.diasAntesVencimiento}
            onChange={e => actualizar({ diasAntesVencimiento: parseInt(e.target.value) })}
          >
            {[1, 2, 3, 5, 7, 10].map(d => (
              <option key={d} value={d}>{d} día{d > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {mensaje && (
        <div className={`panel-notif__mensaje panel-notif__mensaje--${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="panel-notif__acciones">
        <button className="panel-notif__btn-guardar" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          className="panel-notif__btn-probar"
          onClick={probar}
          disabled={!pref.canalEmail && !pref.canalSMS}
        >
          Enviar prueba
        </button>
      </div>
    </div>
  );
};

export default PanelNotificaciones;
