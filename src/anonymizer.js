const crypto = require('crypto');
const tokenStore = require('./tokenStore');

/**
 * Genera un token con prefijo y los primeros 12 hex del SHA-256
 * del valor original exacto (sin normalizar a minúsculas).
 * @param {string} valor - Texto original (nombre, email o teléfono).
 * @param {'NAME'|'EMAIL'|'PHONE'} prefijo - Tipo de PII.
 * @returns {string} Token con formato PREFIJO_xxxxxxxxxxxx.
 */
function generarToken(valor, prefijo) {
  const hash = crypto.createHash('sha256').update(valor).digest('hex');
  return `${prefijo}_${hash.substring(0, 12)}`;
}

/**
 * Genera el token, lo guarda en el almacén y lo devuelve.
 * @param {string} valor - PII original.
 * @param {'NAME'|'EMAIL'|'PHONE'} prefijo - Tipo de PII.
 * @returns {string} Token persistido en memoria.
 */
function tokenizarYGuardar(valor, prefijo) {
  const token = generarToken(valor, prefijo);
  tokenStore.guardar(token, valor);
  return token;
}

/**
 * Detecta y reemplaza correos electrónicos por tokens EMAIL_.
 * @param {string} texto - Mensaje a procesar.
 * @returns {string} Texto con emails anonimizados.
 */
function anonimizarEmails(texto) {
  // \b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b → usuario@dominio.tld
  const regexEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  return texto.replace(regexEmail, (email) => tokenizarYGuardar(email, 'EMAIL'));
}

/**
 * Detecta y reemplaza números telefónicos por tokens PHONE_.
 * @param {string} texto - Mensaje a procesar.
 * @returns {string} Texto con teléfonos anonimizados.
 */
function anonimizarTelefonos(texto) {
  // \b\d{7,15}\b → de 7 a 15 dígitos consecutivos
  const regexTelefono = /\b\d{7,15}\b/g;

  return texto.replace(regexTelefono, (telefono) =>
    tokenizarYGuardar(telefono, 'PHONE')
  );
}

/**
 * Detecta y reemplaza nombres propios por un solo token NAME_ por grupo.
 * Varias palabras consecutivas con mayúscula inicial cuentan como un nombre.
 * @param {string} texto - Mensaje a procesar.
 * @returns {string} Texto con nombres anonimizados.
 */
function anonimizarNombres(texto) {
  // Una o más palabras: Mayúscula + minúsculas (con acentos), separadas por espacio.
  // "Dago Borda" → una sola coincidencia → un solo NAME_…
  const regexNombre =
    /\b[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+)*\b/g;

  return texto.replace(regexNombre, (nombre) => tokenizarYGuardar(nombre, 'NAME'));
}

/**
 * Anonimiza PII en un mensaje y registra cada token en el almacén.
 * Orden: emails → teléfonos → nombres (evita falsos positivos).
 * @param {string} mensaje - Texto original con posible PII.
 * @returns {string} Mensaje anonimizado.
 */
function anonimizarMensaje(mensaje) {
  let resultado = mensaje;

  resultado = anonimizarEmails(resultado);
  resultado = anonimizarTelefonos(resultado);
  resultado = anonimizarNombres(resultado);

  return resultado;
}

/**
 * Restaura los valores originales a partir de tokens conocidos.
 * Los tokens que no estén en el almacén se dejan igual.
 * @param {string} mensajeAnonimo - Texto con tokens NAME_/EMAIL_/PHONE_.
 * @returns {string} Mensaje desanonimizado (parcial o total).
 */
function desanonimizarMensaje(mensajeAnonimo) {
  // NAME_|EMAIL_|PHONE_ seguido de exactamente 12 hexadecimales
  const regexToken = /\b(?:NAME|EMAIL|PHONE)_[a-f0-9]{12}\b/g;

  return mensajeAnonimo.replace(regexToken, (token) => {
    const original = tokenStore.obtener(token);
    return original !== undefined ? original : token;
  });
}

module.exports = {
  anonimizarMensaje,
  desanonimizarMensaje,
  generarToken,
};
