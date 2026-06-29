import type { CategoriaSuper } from '../tipos/supermercado';

// Diccionario de palabras clave → categoría (productos chilenos comunes).
const PALABRAS_CATEGORIA: Record<string, CategoriaSuper> = {};

const registrar = (categoria: CategoriaSuper, palabras: string[]) => {
  palabras.forEach(p => {
    PALABRAS_CATEGORIA[p] = categoria;
  });
};

registrar('frutas_verduras', [
  'manzana', 'platano', 'plátano', 'naranja', 'palta', 'tomate', 'lechuga',
  'papa', 'papas', 'cebolla', 'zanahoria', 'limon', 'limón', 'palta', 'uva',
  'frutilla', 'pera', 'kiwi', 'apio', 'zapallo', 'choclo', 'palta', 'verdura',
  'fruta', 'espinaca', 'brocoli', 'brócoli', 'ajo', 'pepino', 'champinon', 'champiñon'
]);

registrar('lacteos', [
  'leche', 'queso', 'yogurt', 'yoghurt', 'mantequilla', 'margarina', 'crema',
  'quesillo', 'manjar', 'huevo', 'huevos'
]);

registrar('carnes', [
  'pollo', 'carne', 'vacuno', 'cerdo', 'pavo', 'pescado', 'salmon', 'salmón',
  'longaniza', 'vienesa', 'vienesas', 'jamon', 'jamón', 'molida', 'lomo',
  'pechuga', 'salchicha', 'chorizo', 'mariscos'
]);

registrar('panaderia', [
  'pan', 'marraqueta', 'hallulla', 'baguette', 'tortilla', 'galleta', 'galletas',
  'queque', 'torta', 'pastel', 'dobladita', 'completo'
]);

registrar('abarrotes', [
  'arroz', 'fideos', 'tallarines', 'azucar', 'azúcar', 'sal', 'aceite', 'harina',
  'lenteja', 'lentejas', 'poroto', 'porotos', 'garbanzo', 'atun', 'atún', 'conserva',
  'salsa', 'ketchup', 'mayonesa', 'cafe', 'café', 'te', 'té', 'cereal', 'mermelada',
  'galletas', 'bebida', 'jugo', 'agua', 'vino', 'cerveza', 'snack', 'papas fritas',
  'chocolate', 'dulce', 'caramelo'
]);

registrar('limpieza', [
  'detergente', 'cloro', 'lavaloza', 'jabon', 'jabón', 'shampoo', 'champu', 'champú',
  'papel', 'confort', 'toalla', 'servilleta', 'esponja', 'desinfectante', 'lavalozas',
  'suavizante', 'pasta', 'dental', 'desodorante', 'panal', 'pañal', 'panales', 'pañales',
  'toallitas', 'algodon', 'algodón', 'limpiador', 'escoba', 'bolsa'
]);

/**
 * Sugiere una categoría a partir del nombre del producto.
 * Devuelve 'otros' si no encuentra coincidencia.
 */
export const sugerirCategoria = (nombre: string): CategoriaSuper => {
  const texto = nombre.toLowerCase().trim();
  if (!texto) return 'otros';

  // Coincidencia por palabra completa o inclusión
  for (const palabra of Object.keys(PALABRAS_CATEGORIA)) {
    const regex = new RegExp(`\\b${palabra}`, 'i');
    if (regex.test(texto)) {
      return PALABRAS_CATEGORIA[palabra];
    }
  }

  return 'otros';
};
