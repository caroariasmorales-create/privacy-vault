/**
 * Almacén en memoria de parejas token → valor original.
 * Está aislado en este módulo para poder sustituirlo después
 * por una base de datos sin cambiar anonymizer ni las rutas.
 */

/** @type {Map<string, string>} */
const almacen = new Map();

/**
 * Guarda (o actualiza) la asociación token → valor original.
 * @param {string} token - Token generado (p. ej. NAME_e1be92e2b3a5).
 * @param {string} valorOriginal - PII original que reemplazó el token.
 */
function guardar(token, valorOriginal) {
  almacen.set(token, valorOriginal);
}

/**
 * Recupera el valor original asociado a un token, si existe.
 * @param {string} token - Token a buscar.
 * @returns {string|undefined} Valor original o undefined si no está guardado.
 */
function obtener(token) {
  return almacen.get(token);
}

/**
 * Indica si el almacén conoce el token.
 * @param {string} token - Token a consultar.
 * @returns {boolean}
 */
function existe(token) {
  return almacen.has(token);
}

module.exports = {
  guardar,
  obtener,
  existe,
};
