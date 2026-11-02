const { obtenerDb } = require('./db');

const NOMBRE_COLECCION = 'tokens';

/**
 * Acceso a la colección "tokens".
 * @returns {import('mongodb').Collection}
 */
function coleccion() {
  return obtenerDb().collection(NOMBRE_COLECCION);
}

/**
 * Crea el índice único sobre "token" (idempotente si ya existe).
 */
async function asegurarIndices() {
  await coleccion().createIndex({ token: 1 }, { unique: true });
}

/**
 * Guarda la pareja token → valor con upsert.
 * Si el token ya existe, $setOnInsert no modifica el documento (evita duplicados).
 * @param {string} token - Token generado (p. ej. NAME_e1be92e2b3a5).
 * @param {string} value - Valor original de PII.
 * @param {'NAME'|'EMAIL'|'PHONE'} type - Tipo de dato privado.
 */
async function guardar(token, value, type) {
  await coleccion().updateOne(
    { token },
    {
      $setOnInsert: {
        token,
        value,
        type,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Busca varios tokens en una sola consulta y devuelve un mapa token → value.
 * @param {string[]} tokens - Lista de tokens encontrados en el mensaje.
 * @returns {Promise<Map<string, string>>}
 */
async function obtenerVarios(tokens) {
  const mapa = new Map();

  if (!tokens || tokens.length === 0) {
    return mapa;
  }

  const documentos = await coleccion()
    .find({ token: { $in: tokens } })
    .project({ token: 1, value: 1, _id: 0 })
    .toArray();

  for (const doc of documentos) {
    mapa.set(doc.token, doc.value);
  }

  return mapa;
}

module.exports = {
  asegurarIndices,
  guardar,
  obtenerVarios,
};
