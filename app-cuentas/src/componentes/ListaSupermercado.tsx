import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ItemSuper, CategoriaSuper, PrecioMemoria, ResumenSuper } from '../tipos/supermercado';
import { CATEGORIAS_SUPER } from '../tipos/supermercado';
import { supermercadoAPI } from '../servicios/supermercadoAPI';
import { formatearPesosChilenos } from '../utilidades/formatoChileno';
import { sugerirCategoria } from '../utilidades/categorizador';
import './ListaSupermercado.css';

// --- SVG Icons ---
const IconoCarrito = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IconoMas = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconoMenos = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconoBasura = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IconoCompartir = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IconoSernac = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);
const IconoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconoConfig = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
  </svg>
);

const formatearNumero = (valor: string): string => {
  const numero = valor.replace(/\D/g, '');
  if (!numero) return '';
  return new Intl.NumberFormat('es-CL').format(parseInt(numero));
};

const limpiarNumero = (valor: string): number => {
  const limpio = valor.replace(/\D/g, '');
  return limpio ? parseInt(limpio) : 0;
};

const ListaSupermercado: React.FC = () => {
  const [items, setItems] = useState<ItemSuper[]>([]);
  const [memoriaPrecios, setMemoriaPrecios] = useState<PrecioMemoria[]>([]);
  const [resumen, setResumen] = useState<ResumenSuper | null>(null);
  const [presupuestoLimite, setPresupuestoLimite] = useState(0);
  const [cargando, setCargando] = useState(true);

  // Form nuevo item
  const [nombreInput, setNombreInput] = useState('');
  const [precioInput, setPrecioInput] = useState('');
  const [cantidadInput, setCantidadInput] = useState(1);
  const [categoriaInput, setCategoriaInput] = useState<CategoriaSuper>('otros');
  const [categoriaManual, setCategoriaManual] = useState(false);
  const [sugerencias, setSugerencias] = useState<PrecioMemoria[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Filtro por categoría
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaSuper | 'todos'>('todos');

  // Modal presupuesto
  const [mostrarModalPresupuesto, setMostrarModalPresupuesto] = useState(false);
  const [presupuestoInput, setPresupuestoInput] = useState('');

  // Feedback compartir
  const [copiado, setCopiado] = useState(false);

  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [dataLista, dataResumen] = await Promise.all([
        supermercadoAPI.obtener(),
        supermercadoAPI.obtenerResumen().catch(() => null),
      ]);

      setItems(dataLista.lista?.items || []);
      setMemoriaPrecios(dataLista.lista?.memoriaPrecios || []);
      setPresupuestoLimite(dataLista.lista?.presupuestoLimite || 0);

      if (dataResumen) {
        setResumen(dataResumen);
      }
    } catch (error) {
      console.error('Error al cargar lista:', error);
    } finally {
      setCargando(false);
    }
  };

  // Autocomplete: filtrar memoria de precios según lo que escribe el usuario
  const manejarCambioNombre = (valor: string) => {
    setNombreInput(valor);

    // Categorización automática: si el usuario no eligió categoría manualmente,
    // se sugiere una según el nombre del producto.
    if (!categoriaManual) {
      setCategoriaInput(sugerirCategoria(valor));
    }

    if (valor.length >= 2) {
      const filtradas = memoriaPrecios.filter(p =>
        p.nombre.toLowerCase().includes(valor.toLowerCase())
      );
      setSugerencias(filtradas.slice(0, 5));
      setMostrarSugerencias(filtradas.length > 0);
    } else {
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  };

  const seleccionarSugerencia = (sugerencia: PrecioMemoria) => {
    setNombreInput(sugerencia.nombre);
    setPrecioInput(formatearNumero(sugerencia.precio.toString()));
    if (!categoriaManual) {
      setCategoriaInput(sugerirCategoria(sugerencia.nombre));
    }
    setSugerencias([]);
    setMostrarSugerencias(false);
  };

  const agregarItem = async () => {
    if (!nombreInput.trim()) return;

    const precio = limpiarNumero(precioInput);

    try {
      const nuevoItem = await supermercadoAPI.agregarItem({
        nombre: nombreInput.trim(),
        precio,
        cantidad: cantidadInput,
        categoria: categoriaInput,
      });

      setItems(prev => [...prev, nuevoItem]);

      // Actualizar memoria local si tiene precio
      if (precio > 0) {
        setMemoriaPrecios(prev => {
          const existe = prev.findIndex(p => p.nombre.toLowerCase() === nombreInput.toLowerCase());
          if (existe >= 0) {
            const nueva = [...prev];
            nueva[existe] = { ...nueva[existe], precio, updatedAt: new Date().toISOString() };
            return nueva;
          }
          return [...prev, { nombre: nombreInput.trim(), precio, updatedAt: new Date().toISOString() }];
        });
      }

      // Reset form
      setNombreInput('');
      setPrecioInput('');
      setCantidadInput(1);
      setCategoriaInput('otros');
      setCategoriaManual(false);
      setSugerencias([]);
      setMostrarSugerencias(false);
      nombreRef.current?.focus();

      // Actualizar resumen
      actualizarResumenLocal();
    } catch (error) {
      console.error('Error al agregar item:', error);
    }
  };

  const toggleComprado = async (item: ItemSuper) => {
    try {
      await supermercadoAPI.actualizarItem(item.id, { comprado: !item.comprado });
      setItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, comprado: !i.comprado } : i)
      );
      actualizarResumenLocal();
    } catch (error) {
      console.error('Error al actualizar item:', error);
    }
  };

  const cambiarCantidad = async (item: ItemSuper, delta: number) => {
    const nuevaCantidad = Math.max(1, item.cantidad + delta);
    try {
      await supermercadoAPI.actualizarItem(item.id, { cantidad: nuevaCantidad });
      setItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, cantidad: nuevaCantidad } : i)
      );
      actualizarResumenLocal();
    } catch (error) {
      console.error('Error al cambiar cantidad:', error);
    }
  };

  // Permite escribir la cantidad directamente
  const fijarCantidad = async (item: ItemSuper, valor: string) => {
    const limpio = valor.replace(/\D/g, '');
    const nuevaCantidad = Math.max(1, parseInt(limpio || '1', 10));
    // Actualización optimista inmediata
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, cantidad: nuevaCantidad } : i));
    try {
      await supermercadoAPI.actualizarItem(item.id, { cantidad: nuevaCantidad });
      actualizarResumenLocal();
    } catch (error) {
      console.error('Error al fijar cantidad:', error);
    }
  };

  const eliminarItem = async (itemId: string) => {
    try {
      await supermercadoAPI.eliminarItem(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
      actualizarResumenLocal();
    } catch (error) {
      console.error('Error al eliminar item:', error);
    }
  };

  const limpiarComprados = async () => {
    try {
      await supermercadoAPI.limpiarComprados();
      setItems(prev => prev.filter(i => !i.comprado));
      actualizarResumenLocal();
    } catch (error) {
      console.error('Error al limpiar comprados:', error);
    }
  };

  const finalizarCompra = async () => {
    if (items.length === 0) return;
    if (!window.confirm('¿Finalizar la compra? El carrito se archivará en el historial y se vaciará.')) {
      return;
    }
    try {
      await supermercadoAPI.finalizarCompra();
      setItems([]);
      actualizarResumenLocal();
      // Notificar al historial (componente hermano) para que recargue
      window.dispatchEvent(new CustomEvent('compra-finalizada'));
    } catch (error) {
      console.error('Error al finalizar compra:', error);
    }
  };

  const guardarPresupuesto = async () => {
    const monto = limpiarNumero(presupuestoInput);
    try {
      await supermercadoAPI.actualizarConfig({ presupuestoLimite: monto });
      setPresupuestoLimite(monto);
      setMostrarModalPresupuesto(false);
      setPresupuestoInput('');
      await cargarDatos();
    } catch (error) {
      console.error('Error al guardar presupuesto:', error);
    }
  };

  const compartirLista = async () => {
    const itemsPendientes = items.filter(i => !i.comprado);
    const texto = itemsPendientes
      .map(i => `• ${i.nombre} x${i.cantidad}${i.precio > 0 ? ` — ${formatearPesosChilenos(i.precio * i.cantidad)}` : ''}`)
      .join('\n');

    const totalTexto = totalCarrito > 0 ? `\nTotal estimado: ${formatearPesosChilenos(totalCarrito)}` : '';
    const mensajeCompleto = `Lista del Super 🛒\n\n${texto}${totalTexto}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Lista del Super', text: mensajeCompleto });
      } catch {
        // Usuario canceló
      }
    } else {
      await navigator.clipboard.writeText(mensajeCompleto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  // Calcular totales localmente para respuesta inmediata
  const actualizarResumenLocal = () => {
    supermercadoAPI.obtenerResumen().then(setResumen).catch(() => {});
  };

  const totalCarrito = useMemo(
    () => items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
    [items]
  );

  const porcentajePresupuesto = presupuestoLimite > 0
    ? Math.min((totalCarrito / presupuestoLimite) * 100, 100)
    : 0;

  const superaPresupuesto = presupuestoLimite > 0 && totalCarrito > presupuestoLimite;

  const itemsFiltrados = useMemo(() => {
    if (categoriaFiltro === 'todos') return items;
    return items.filter(i => i.categoria === categoriaFiltro);
  }, [items, categoriaFiltro]);

  const itemsPorCategoria = useMemo(() => {
    const mapa: Record<string, ItemSuper[]> = {};
    itemsFiltrados.forEach(item => {
      if (!mapa[item.categoria]) mapa[item.categoria] = [];
      mapa[item.categoria].push(item);
    });
    return mapa;
  }, [itemsFiltrados]);

  if (cargando) {
    return (
      <div className="lista-super__cargando">
        <div className="lista-super__spinner" />
        <p>Cargando lista...</p>
      </div>
    );
  }

  return (
    <div className="lista-super">
      {/* Header */}
      <div className="lista-super__header">
        <div className="lista-super__titulo">
          <div className="lista-super__titulo-icono">
            <IconoCarrito />
          </div>
          <div>
            <h1>Lista del Super</h1>
            <p className="lista-super__subtitulo">
              {items.filter(i => !i.comprado).length} pendientes · {items.filter(i => i.comprado).length} comprados
            </p>
          </div>
        </div>
        <div className="lista-super__header-acciones">
          <button
            className="lista-super__btn-icono"
            onClick={() => window.open('https://www.observatoriodeprecios.cl/', '_blank')}
            title="Observatorio SERNAC de precios"
            aria-label="Ver precios en SERNAC"
          >
            <IconoSernac />
            <span>SERNAC</span>
          </button>
          <button
            className="lista-super__btn-icono"
            onClick={compartirLista}
            title="Compartir lista"
            aria-label="Compartir lista"
          >
            <IconoCompartir />
            <span>{copiado ? '¡Copiado!' : 'Compartir'}</span>
          </button>
          <button
            className="lista-super__btn-icono"
            onClick={() => {
              setPresupuestoInput(presupuestoLimite > 0 ? formatearNumero(presupuestoLimite.toString()) : '');
              setMostrarModalPresupuesto(true);
            }}
            title="Configurar presupuesto"
            aria-label="Configurar presupuesto"
          >
            <IconoConfig />
            <span>Presupuesto</span>
          </button>
        </div>
      </div>

      {/* Barra de presupuesto */}
      {presupuestoLimite > 0 && (
        <div className="lista-super__presupuesto-card">
          <div className="lista-super__presupuesto-info">
            <span className="lista-super__presupuesto-label">Presupuesto</span>
            <span className={`lista-super__presupuesto-total ${superaPresupuesto ? 'excedido' : ''}`}>
              {formatearPesosChilenos(totalCarrito)} / {formatearPesosChilenos(presupuestoLimite)}
            </span>
          </div>
          <div className="lista-super__barra-fondo">
            <div
              className={`lista-super__barra-fill ${superaPresupuesto ? 'excedido' : porcentajePresupuesto > 80 ? 'advertencia' : ''}`}
              style={{ width: `${porcentajePresupuesto}%` }}
            />
          </div>
          {superaPresupuesto && (
            <p className="lista-super__excedido-msg">
              Excediste el presupuesto en {formatearPesosChilenos(totalCarrito - presupuestoLimite)}
            </p>
          )}
        </div>
      )}

      {/* Cruce con sueldo */}
      {resumen?.saldoSueldo.tieneSueldo && (
        <div className={`lista-super__sueldo-card ${resumen.saldoSueldo.alcanza ? 'alcanza' : 'no-alcanza'}`}>
          <div className="lista-super__sueldo-icono">
            {resumen.saldoSueldo.alcanza ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
          </div>
          <div className="lista-super__sueldo-texto">
            <strong>Saldo disponible del mes: {formatearPesosChilenos(resumen.saldoSueldo.disponible)}</strong>
            <span>
              {resumen.saldoSueldo.alcanza
                ? `Te sobran ${formatearPesosChilenos(resumen.saldoSueldo.disponible - totalCarrito)} después del super`
                : `Te faltan ${formatearPesosChilenos(totalCarrito - resumen.saldoSueldo.disponible)} para cubrir el carrito`}
            </span>
          </div>
        </div>
      )}

      {/* Formulario agregar item */}
      <div className="lista-super__form-card">
        <h3 className="lista-super__form-titulo">Agregar producto</h3>
        <div className="lista-super__form">
          {/* Nombre con autocomplete */}
          <div className="lista-super__input-wrapper" style={{ position: 'relative' }}>
            <input
              ref={nombreRef}
              type="text"
              className="lista-super__input"
              placeholder="Nombre del producto"
              value={nombreInput}
              onChange={e => manejarCambioNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarItem()}
              onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
              aria-label="Nombre del producto"
              aria-autocomplete="list"
              aria-expanded={mostrarSugerencias}
            />
            {mostrarSugerencias && sugerencias.length > 0 && (
              <ul className="lista-super__autocomplete" role="listbox">
                {sugerencias.map(s => (
                  <li
                    key={s.nombre}
                    className="lista-super__autocomplete-item"
                    role="option"
                    onMouseDown={() => seleccionarSugerencia(s)}
                  >
                    <span className="lista-super__autocomplete-nombre">{s.nombre}</span>
                    <span className="lista-super__autocomplete-precio">{formatearPesosChilenos(s.precio)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <input
            type="text"
            className="lista-super__input lista-super__input--precio"
            placeholder="Precio (opcional)"
            value={precioInput}
            onChange={e => {
              const limpio = e.target.value.replace(/\D/g, '');
              setPrecioInput(limpio ? formatearNumero(limpio) : '');
            }}
            onKeyDown={e => e.key === 'Enter' && agregarItem()}
            aria-label="Precio del producto"
          />

          <select
            className="lista-super__select"
            value={categoriaInput}
            onChange={e => {
              setCategoriaInput(e.target.value as CategoriaSuper);
              setCategoriaManual(true);
            }}
            aria-label="Categoría del producto"
          >
            {CATEGORIAS_SUPER.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>

          <button
            className="lista-super__btn-agregar"
            onClick={agregarItem}
            disabled={!nombreInput.trim()}
            aria-label="Agregar producto a la lista"
          >
            <IconoMas />
            <span>Agregar</span>
          </button>
        </div>
      </div>

      {/* Tabs de categorías */}
      <div className="lista-super__tabs" role="tablist" aria-label="Filtrar por categoría">
        <button
          className={`lista-super__tab ${categoriaFiltro === 'todos' ? 'activo' : ''}`}
          onClick={() => setCategoriaFiltro('todos')}
          role="tab"
          aria-selected={categoriaFiltro === 'todos'}
        >
          Todos ({items.length})
        </button>
        {CATEGORIAS_SUPER.filter(cat => items.some(i => i.categoria === cat.id)).map(cat => (
          <button
            key={cat.id}
            className={`lista-super__tab ${categoriaFiltro === cat.id ? 'activo' : ''}`}
            onClick={() => setCategoriaFiltro(cat.id)}
            role="tab"
            aria-selected={categoriaFiltro === cat.id}
          >
            {cat.label} ({items.filter(i => i.categoria === cat.id).length})
          </button>
        ))}
      </div>

      {/* Lista de items */}
      {items.length === 0 ? (
        <div className="lista-super__vacia">
          <div className="lista-super__vacia-icono"><IconoCarrito /></div>
          <p>Tu lista está vacía</p>
          <span>Agrega productos usando el formulario de arriba</span>
        </div>
      ) : (
        <div className="lista-super__items">
          {Object.entries(itemsPorCategoria).map(([categoria, itemsCat]) => {
            const catInfo = CATEGORIAS_SUPER.find(c => c.id === categoria);
            const totalCat = itemsCat.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
            return (
              <div key={categoria} className="lista-super__grupo">
                <h4 className="lista-super__grupo-titulo">
                  <span>{catInfo?.label || categoria}</span>
                  {totalCat > 0 && (
                    <span className="lista-super__grupo-total">{formatearPesosChilenos(totalCat)}</span>
                  )}
                </h4>
                {itemsCat.map(item => (
                  <div
                    key={item.id}
                    className={`lista-super__item ${item.comprado ? 'comprado' : ''}`}
                  >
                    {/* Checkbox */}
                    <button
                      className={`lista-super__check ${item.comprado ? 'marcado' : ''}`}
                      onClick={() => toggleComprado(item)}
                      aria-label={item.comprado ? 'Marcar como pendiente' : 'Marcar como comprado'}
                      aria-pressed={item.comprado}
                    >
                      {item.comprado && <IconoCheck />}
                    </button>

                    {/* Info */}
                    <div className="lista-super__item-info">
                      <span className="lista-super__item-nombre">{item.nombre}</span>
                      {item.precio > 0 && (
                        <span className="lista-super__item-precio">
                          {formatearPesosChilenos(item.precio)} c/u
                          {item.cantidad > 1 && (
                            <span className="lista-super__item-subtotal">
                              {' '}= {formatearPesosChilenos(item.precio * item.cantidad)}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Controles cantidad */}
                    <div className="lista-super__cantidad">
                      <button
                        className="lista-super__btn-cantidad"
                        onClick={() => cambiarCantidad(item, -1)}
                        disabled={item.cantidad <= 1}
                        aria-label="Reducir cantidad"
                      >
                        <IconoMenos />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="lista-super__cantidad-input"
                        value={item.cantidad}
                        onChange={e => fijarCantidad(item, e.target.value)}
                        aria-label={`Cantidad de ${item.nombre}`}
                      />
                      <button
                        className="lista-super__btn-cantidad"
                        onClick={() => cambiarCantidad(item, 1)}
                        aria-label="Aumentar cantidad"
                      >
                        <IconoMas />
                      </button>
                    </div>

                    {/* Eliminar */}
                    <button
                      className="lista-super__btn-eliminar"
                      onClick={() => eliminarItem(item.id)}
                      aria-label={`Eliminar ${item.nombre}`}
                    >
                      <IconoBasura />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer con total y acciones */}
      {items.length > 0 && (
        <div className="lista-super__footer">
          <div className="lista-super__total">
            <span>Total estimado</span>
            <strong className={superaPresupuesto ? 'excedido' : ''}>
              {formatearPesosChilenos(totalCarrito)}
            </strong>
          </div>
          <div className="lista-super__footer-acciones">
            {items.some(i => i.comprado) && (
              <button
                className="lista-super__btn-limpiar"
                onClick={limpiarComprados}
              >
                Limpiar comprados
              </button>
            )}
            <button
              className="lista-super__btn-finalizar"
              onClick={finalizarCompra}
            >
              Finalizar compra
            </button>
          </div>
        </div>
      )}

      {/* Modal presupuesto */}
      {mostrarModalPresupuesto && (
        <div className="lista-super__modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-presupuesto-titulo">
          <div className="lista-super__modal">
            <h3 id="modal-presupuesto-titulo">Definir presupuesto</h3>
            <p>Establece un límite para tu compra del super</p>
            <input
              type="text"
              className="lista-super__input"
              placeholder="Ej: 80.000"
              value={presupuestoInput}
              onChange={e => {
                const limpio = e.target.value.replace(/\D/g, '');
                setPresupuestoInput(limpio ? formatearNumero(limpio) : '');
              }}
              onKeyDown={e => e.key === 'Enter' && guardarPresupuesto()}
              autoFocus
              aria-label="Monto del presupuesto"
            />
            <div className="lista-super__modal-acciones">
              <button
                className="lista-super__btn-cancelar"
                onClick={() => setMostrarModalPresupuesto(false)}
              >
                Cancelar
              </button>
              <button
                className="lista-super__btn-guardar"
                onClick={guardarPresupuesto}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaSupermercado;
