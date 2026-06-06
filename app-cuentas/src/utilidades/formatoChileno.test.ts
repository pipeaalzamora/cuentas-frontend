import { describe, expect, it } from 'vitest';
import {
  formatearFechaChilena,
  parsearMontoChileno,
  validarMontoChileno,
} from './formatoChileno';

describe('formatoChileno', () => {
  it('parsea montos chilenos con separadores de miles', () => {
    expect(parsearMontoChileno('$ 1.234.567')).toBe(1234567);
  });

  it('valida montos positivos', () => {
    expect(validarMontoChileno('$ 10.000')).toBe(true);
    expect(validarMontoChileno('$ 0')).toBe(false);
  });

  it('maneja fechas inválidas de forma defensiva', () => {
    expect(formatearFechaChilena(new Date('invalid'))).toBe('Fecha inválida');
  });
});
