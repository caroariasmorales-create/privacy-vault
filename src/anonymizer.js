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
 * Genera el token, lo persiste en MongoDB y lo devuelve.
 * @param {string} valor - PII original.
 * @param {'NAME'|'EMAIL'|'PHONE'} prefijo - Tipo de PII.
 * @returns {Promise<string>} Token persistido.
 */
async function tokenizarYGuardar(valor, prefijo) {
  const token = generarToken(valor, prefijo);
  await tokenStore.guardar(token, valor, prefijo);
  return token;
}

/**
 * Reemplaza coincidencias de una regex de forma asíncrona.
 * Primero resuelve los tokens únicos y luego aplica un replace síncrono.
 * @param {string} texto - Texto de entrada.
 * @param {RegExp} regex - Expresión regular con flag g.
 * @param {'NAME'|'EMAIL'|'PHONE'} tipo - Tipo de PII a tokenizar.
 * @returns {Promise<string>}
 */
async function reemplazarConTokens(texto, regex, tipo) {
  const coincidencias = [...texto.matchAll(regex)];
  if (coincidencias.length === 0) {
    return texto;
  }

  /** @type {Map<string, string>} */
  const mapa = new Map();

  for (const coincidencia of coincidencias) {
    const valor = coincidencia[0];
    if (!mapa.has(valor)) {
      mapa.set(valor, await tokenizarYGuardar(valor, tipo));
    }
  }

  // Reinicia lastIndex tras matchAll para que replace vuelva a recorrer el texto
  regex.lastIndex = 0;
  return texto.replace(regex, (valor) => mapa.get(valor));
}

/**
 * Detecta y reemplaza correos electrónicos por tokens EMAIL_.
 * @param {string} texto - Mensaje a procesar.
 * @returns {Promise<string>}
 */
async function anonimizarEmails(texto) {
  const regexEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  return reemplazarConTokens(texto, regexEmail, 'EMAIL');
}

/**
 * Detecta y reemplaza números telefónicos por tokens PHONE_.
 * @param {string} texto - Mensaje a procesar.
 * @returns {Promise<string>}
 */
async function anonimizarTelefonos(texto) {
  const regexTelefono = /\b\d{7,15}\b/g;
  return reemplazarConTokens(texto, regexTelefono, 'PHONE');
}

/**
 * Detecta y reemplaza nombres propios por un solo token NAME_ por grupo.
 * @param {string} texto - Mensaje a procesar.
 * @returns {Promise<string>}
 */
async function anonimizarNombres(texto) {
  const regexNombre =
    /\b[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+)*\b/g;
  return reemplazarConTokens(texto, regexNombre, 'NAME');
}

/**
 * Anonimiza PII en un mensaje y registra cada token en MongoDB.
 * Orden: emails → teléfonos → nombres.
 * @param {string} mensaje - Texto original con posible PII.
 * @returns {Promise<string>} Mensaje anonimizado.
 */
async function anonimizarMensaje(mensaje) {
  let resultado = mensaje;

  resultado = await anonimizarEmails(resultado);
  resultado = await anonimizarTelefonos(resultado);
  resultado = await anonimizarNombres(resultado);

  return resultado;
}

/**
 * Restaura los valores originales consultando todos los tokens en una sola query ($in).
 * Los tokens desconocidos se dejan sin cambios.
 * @param {string} mensajeAnonimo - Texto con tokens NAME_/EMAIL_/PHONE_.
 * @returns {Promise<string>} Mensaje desanonimizado.
 */
async function desanonimizarMensaje(mensajeAnonimo) {
  const regexToken = /\b(?:NAME|EMAIL|PHONE)_[a-f0-9]{12}\b/g;
  const tokens = [...mensajeAnonimo.matchAll(regexToken)].map((m) => m[0]);
  const mapa = await tokenStore.obtenerVarios(tokens);

  regexToken.lastIndex = 0;
  return mensajeAnonimo.replace(regexToken, (token) =>
    mapa.has(token) ? mapa.get(token) : token
  );
}

module.exports = {
  anonimizarMensaje,
  desanonimizarMensaje,
  generarToken,
};
