import type { DesgloseSueldo, ResumenDesglose, ResumenConsolidado, CuentaReflejada, TipoGasto } from '../tipos/desglosador';
import type { CuentaServicio } from '../tipos';
import { desgloseSueldoAPI } from './desgloseSueldoAPI';

class ServicioDesglosadorSueldo {
  async obtenerDesgloses(): Promise<DesgloseSueldo[]> {
    try {
      const desgloses = await desgloseSueldoAPI.obtenerTodos();
      return desgloses.map((d: any) => ({
        ...d,
        id: d.id || d._id,
        fechaCreacion: new Date(d.fechaCreacion),
        gastos: d.gastos?.map((g: any) => ({
          ...g,
          fecha: new Date(g.fecha)
        })) || [],
        gastosBebe: d.gastosBebe?.map((g: any) => ({
          ...g,
          fecha: new Date(g.fecha)
        })) || [],
        gastosGenerales: d.gastosGenerales?.map((g: any) => ({
          ...g,
          fecha: new Date(g.fecha)
        })) || []
      }));
    } catch (error) {
      console.error('Error al obtener desgloses:', error);
      return [];
    }
  }

  async guardarDesglose(desglose: DesgloseSueldo): Promise<DesgloseSueldo> {
    try {
      // Verificar si ya existe
      const desgloses = await this.obtenerDesgloses();
      const existe = desgloses.some(d => d.id === desglose.id);
      
      if (existe) {
        return await desgloseSueldoAPI.actualizar(desglose.id, desglose);
      } else {
        return await desgloseSueldoAPI.crear(desglose);
      }
    } catch (error) {
      console.error('Error al guardar desglose:', error);
      throw error;
    }
  }

  async eliminarDesglose(id: string): Promise<void> {
    try {
      await desgloseSueldoAPI.eliminar(id);
    } catch (error) {
      console.error('Error al eliminar desglose:', error);
      throw error;
    }
  }

  calcularResumen(desglose: DesgloseSueldo): ResumenDesglose {
    const totalGastos = desglose.gastos.reduce((sum, g) => sum + g.monto, 0);
    
    const totalGastosBebe = (desglose.gastosBebe || []).reduce(
      (sum, g) => sum + (g.monto * g.cantidad), 0
    );
    
    const totalGastosGenerales = (desglose.gastosGenerales || []).reduce(
      (sum, g) => sum + (g.monto * g.cantidad), 0
    );
    
    const totalDescuentos = totalGastos + totalGastosBebe + totalGastosGenerales;
    const saldoRestante = desglose.sueldoInicial - totalDescuentos;
    
    const gastosPorTipo: Record<TipoGasto, number> = {
      pago: 0,
      compra: 0,
      suscripcion: 0,
      cuenta: 0,
      deuda: 0,
      otro: 0
    };
    
    desglose.gastos.forEach(g => {
      gastosPorTipo[g.tipo] += g.monto;
    });
    
    return {
      sueldoInicial: desglose.sueldoInicial,
      totalGastos,
      totalGastosBebe,
      totalGastosGenerales,
      totalDescuentos,
      saldoRestante,
      gastosPorTipo,
      porcentajeGastado: desglose.sueldoInicial > 0 ? (totalDescuentos / desglose.sueldoInicial) * 100 : 0
    };
  }

  /**
   * Calcula el resumen consolidado cruzando el desglose de sueldo con las cuentas
   * de servicios del mismo período y el total del carrito de supermercado.
   *
   * Las cuentas y el supermercado se reflejan como descuentos del sueldo SIN
   * duplicar datos: siguen viviendo en sus propios módulos, aquí solo se leen.
   */
  calcularResumenConsolidado(
    desglose: DesgloseSueldo,
    cuentas: CuentaServicio[],
    totalSupermercado: number
  ): ResumenConsolidado {
    const base = this.calcularResumen(desglose);

    // Cuentas del mismo mes/año del desglose
    const cuentasDelPeriodo = cuentas.filter(
      c => c.mes === desglose.mes && c.año === desglose.año
    );

    const cuentasReflejadas: CuentaReflejada[] = cuentasDelPeriodo.map(c => ({
      id: c.id,
      servicio: c.servicio,
      monto: c.monto,
      pagada: c.pagada,
      esFamiliar: c.esFamiliar,
      titular: c.titular
    }));

    const totalCuentas = cuentasReflejadas.reduce((sum, c) => sum + c.monto, 0);
    const totalSuper = Math.max(0, totalSupermercado);

    const totalDescuentosConsolidado = base.totalDescuentos + totalCuentas + totalSuper;
    const saldoDisponible = desglose.sueldoInicial - totalDescuentosConsolidado;
    const porcentajeGastadoConsolidado = desglose.sueldoInicial > 0
      ? (totalDescuentosConsolidado / desglose.sueldoInicial) * 100
      : 0;

    return {
      ...base,
      cuentasReflejadas,
      totalCuentas,
      totalSupermercado: totalSuper,
      totalDescuentosConsolidado,
      saldoDisponible,
      porcentajeGastadoConsolidado
    };
  }
}

export const servicioDesglosadorSueldo = new ServicioDesglosadorSueldo();
export { ServicioDesglosadorSueldo };
