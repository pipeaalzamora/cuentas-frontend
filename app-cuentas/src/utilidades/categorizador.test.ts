import { describe, expect, it } from 'vitest';
import { sugerirCategoria } from './categorizador';

describe('sugerirCategoria', () => {
  it('clasifica frutas y verduras', () => {
    expect(sugerirCategoria('Tomate')).toBe('frutas_verduras');
    expect(sugerirCategoria('manzana roja')).toBe('frutas_verduras');
  });

  it('clasifica lácteos', () => {
    expect(sugerirCategoria('Leche entera')).toBe('lacteos');
    expect(sugerirCategoria('queso')).toBe('lacteos');
  });

  it('clasifica carnes', () => {
    expect(sugerirCategoria('Pollo entero')).toBe('carnes');
    expect(sugerirCategoria('carne molida')).toBe('carnes');
  });

  it('clasifica limpieza', () => {
    expect(sugerirCategoria('Detergente líquido')).toBe('limpieza');
    expect(sugerirCategoria('pañales')).toBe('limpieza');
  });

  it('devuelve otros cuando no reconoce', () => {
    expect(sugerirCategoria('xyz123')).toBe('otros');
    expect(sugerirCategoria('')).toBe('otros');
  });
});
