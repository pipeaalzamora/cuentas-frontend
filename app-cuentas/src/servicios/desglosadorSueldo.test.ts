import { describe, expect, it } from 'vitest';
import { ServicioDesglosadorSueldo } from './desglosadorSueldo';
import type { DesgloseSueldo } from '../tipos/desglosador';
import type { CuentaServicio } from '../tipos';

const servicio = new ServicioDesglosadorSueldo();

const crearDesglose = (overrides: Partial<DesgloseSueldo> = {}): DesgloseSueldo => ({
  id: 'd1',
  sueldoInicial: 2000000,
  gastos: [
    { id: 'g1', descripcion: 'Arriendo', monto: 500000, tipo: 'pago', fecha: new Date() },
  ],
  gastosBebe: [],
  gastosGenerales: [],
  fechaCreacion: new Date(),
  mes: 6,
  año: 2026,
  ...overrides,
});

const crearCuenta = (overrides: Partial<CuentaServicio> = {}): CuentaServicio => ({
  id: 'c1',
  servicio: 'luz',
  monto: 30000,
  mes: 6,
  año: 2026,
  pagada: false,
  fechaVencimiento: new Date('2026-06-20'),
  fechaCreacion: new Date(),
  ...overrides,
} as CuentaServicio);

describe('calcularResumenConsolidado', () => {
  it('resta gastos propios, cuentas del mes y supermercado del sueldo', () => {
    const desglose = crearDesglose();
    const cuentas = [
      crearCuenta({ id: 'c1', servicio: 'luz', monto: 30000 }),
      crearCuenta({ id: 'c2', servicio: 'agua', monto: 20000 }),
    ];
    const totalSuper = 100000;

    const r = servicio.calcularResumenConsolidado(desglose, cuentas, totalSuper);

    expect(r.totalGastos).toBe(500000);
    expect(r.totalCuentas).toBe(50000);
    expect(r.totalSupermercado).toBe(100000);
    // 2.000.000 - 500.000 - 50.000 - 100.000
    expect(r.saldoDisponible).toBe(1350000);
    expect(r.cuentasReflejadas).toHaveLength(2);
  });

  it('solo considera cuentas del mismo mes y año del desglose', () => {
    const desglose = crearDesglose({ mes: 6, año: 2026 });
    const cuentas = [
      crearCuenta({ id: 'c1', mes: 6, año: 2026, monto: 30000 }),
      crearCuenta({ id: 'c2', mes: 5, año: 2026, monto: 99999 }), // otro mes
    ];

    const r = servicio.calcularResumenConsolidado(desglose, cuentas, 0);

    expect(r.totalCuentas).toBe(30000);
    expect(r.cuentasReflejadas).toHaveLength(1);
  });

  it('ignora un total de supermercado negativo', () => {
    const r = servicio.calcularResumenConsolidado(crearDesglose(), [], -5000);
    expect(r.totalSupermercado).toBe(0);
  });

  it('calcula el porcentaje gastado consolidado', () => {
    const desglose = crearDesglose({ sueldoInicial: 1000000, gastos: [] });
    const cuentas = [crearCuenta({ monto: 250000 })];
    const r = servicio.calcularResumenConsolidado(desglose, cuentas, 250000);
    // (250.000 + 250.000) / 1.000.000 = 50%
    expect(r.porcentajeGastadoConsolidado).toBe(50);
  });
});
