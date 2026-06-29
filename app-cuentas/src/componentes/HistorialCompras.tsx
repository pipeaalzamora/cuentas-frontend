import React, { useState, useEffect, useCallback } from 'react';
import { supermercadoAPI } from '../servicios/supermercadoAPI';
import { formatearPesosChilenos } from '../utilidades/formatoChileno';
import './HistorialCompras.css';

interface ItemHistorico {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  categoria: string;
}

interface CompraHistorica {
  id: string;
  items: ItemHistorico[];
  total: number;
  mes: number;
  año: number;
  fechaCompra: string;
}

interface RespuestaHistorial {
  compras: CompraHistorica[];
  totalGastado: number;
  promedio: number;
  cantidad: number;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatearFecha = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
};

const HistorialCompras: React.FC = () => {
  const [datos, setDatos] = useState<RespuestaHistorial | null>(null);
  const [cargando, setCargando] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await supermercadoAPI.obtenerHistorial();
      setDatos(res);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Recargar cuando se finaliza una compra desde la lista (componente hermano)
  useEffect(() => {
    const handler = () => cargar();
    window.addEventListener('compra-finalizada', handler);
    return () => window.removeEventListener('compra-finalizada', handler);
  }, [cargar]);

  // Total gastado en super por mes (para mini-estadística)
  const porMes = (datos?.compras || []).reduce<Record<string, number>>((acc, compra) => {
    const clave = `${MESES[compra.mes - 1]} ${compra.año}`;
    acc[clave] = (acc[clave] || 0) + compra.total;
    return acc;
  }, {});

  if (cargando) {
    return <div className="historial__cargando">Cargando historial...</div>;
  }

  if (!datos || datos.cantidad === 0) {
    return (
      <div className="historial historial--vacio">
        <h3>Historial de compras</h3>
        <p>Aún no has finalizado ninguna compra. Cuando termines una compra en la lista del super, quedará archivada aquí.</p>
      </div>
    );
  }

  return (
    <div className="historial">
      <div className="historial__header">
        <h3>Historial de compras</h3>
        <span className="historial__contador">{datos.cantidad} compra{datos.cantidad > 1 ? 's' : ''}</span>
      </div>

      {/* Resumen */}
      <div className="historial__resumen">
        <div className="historial__resumen-item">
          <span className="historial__resumen-label">Total gastado</span>
          <span className="historial__resumen-valor">{formatearPesosChilenos(datos.totalGastado)}</span>
        </div>
        <div className="historial__resumen-item">
          <span className="historial__resumen-label">Promedio por compra</span>
          <span className="historial__resumen-valor">{formatearPesosChilenos(datos.promedio)}</span>
        </div>
      </div>

      {/* Gasto por mes */}
      {Object.keys(porMes).length > 0 && (
        <div className="historial__por-mes">
          <h4>Gasto en super por mes</h4>
          {Object.entries(porMes).map(([mes, total]) => (
            <div key={mes} className="historial__mes-fila">
              <span>{mes}</span>
              <strong>{formatearPesosChilenos(total)}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Lista de compras */}
      <div className="historial__lista">
        {datos.compras.map(compra => {
          const abierta = expandida === compra.id;
          return (
            <div key={compra.id} className="historial__compra">
              <button
                className="historial__compra-header"
                onClick={() => setExpandida(abierta ? null : compra.id)}
                aria-expanded={abierta}
              >
                <div className="historial__compra-info">
                  <span className="historial__compra-fecha">{formatearFecha(compra.fechaCompra)}</span>
                  <span className="historial__compra-items">{compra.items.length} producto{compra.items.length > 1 ? 's' : ''}</span>
                </div>
                <div className="historial__compra-derecha">
                  <span className="historial__compra-total">{formatearPesosChilenos(compra.total)}</span>
                  <span className={`historial__chevron ${abierta ? 'abierto' : ''}`}>▾</span>
                </div>
              </button>
              {abierta && (
                <div className="historial__detalle">
                  {compra.items.map(item => (
                    <div key={item.id} className="historial__detalle-item">
                      <span>{item.nombre} {item.cantidad > 1 && <em>x{item.cantidad}</em>}</span>
                      <span>{formatearPesosChilenos(item.precio * item.cantidad)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistorialCompras;
