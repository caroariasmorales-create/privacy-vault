const { MongoClient } = require('mongodb');

/** @type {MongoClient|undefined} */
let cliente;

/** @type {import('mongodb').Db|undefined} */
let baseDatos;

/**
 * Conecta con MongoDB Atlas usando MONGODB_URI y selecciona la base privacy_vault.
 * Si falta la URI o falla la conexión, muestra un error claro y detiene el proceso.
 */
async function conectar() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    console.error(
      'Error: MONGODB_URI no está definida. Configúrala en el archivo .env antes de iniciar.'
    );
    process.exit(1);
  }

  try {
    cliente = new MongoClient(uri);
    await cliente.connect();
    // Ping para confirmar que la conexión es usable
    await cliente.db('admin').command({ ping: 1 });
    baseDatos = cliente.db('privacy_vault');
    console.log('Conexión a MongoDB establecida (base de datos: privacy_vault).');
  } catch (error) {
    // Diagnóstico sin exponer la URI ni la contraseña
    const mensajeSeguro = sanitizarTextoError(error?.message, uri);

    console.error(
      'Error: no se pudo conectar a MongoDB. Revisa MONGODB_URI, la red y los permisos del cluster.'
    );
    console.error(`name: ${error?.name ?? 'desconocido'}`);
    console.error(`code: ${error?.code ?? 'desconocido'}`);
    console.error(`message: ${mensajeSeguro ?? 'desconocido'}`);
    process.exit(1);
  }
}

/**
 * Quita de un texto la URI de conexión y patrones usuario:contraseña
 * para poder registrar el mensaje de error con seguridad.
 * @param {string|undefined} texto - Mensaje original del error.
 * @param {string} uri - Cadena MONGODB_URI (nunca se imprime).
 * @returns {string|undefined}
 */
function sanitizarTextoError(texto, uri) {
  if (texto === undefined || texto === null) {
    return texto;
  }

  let seguro = String(texto);

  if (uri) {
    seguro = seguro.split(uri).join('[REDACTED]');
  }

  // mongodb://usuario:clave@host → oculta la clave
  seguro = seguro.replace(/\/\/([^/@]+):([^@]+)@/g, '//$1:[REDACTED]@');
  // Cualquier URI mongodb restante
  seguro = seguro.replace(/mongodb(\+srv)?:\/\/[^\s'"]+/gi, '[REDACTED_URI]');

  return seguro;
}

/**
 * Devuelve la instancia de la base de datos ya conectada.
 * @returns {import('mongodb').Db}
 */
function obtenerDb() {
  if (!baseDatos) {
    throw new Error('La base de datos no está conectada. Llama a conectar() primero.');
  }
  return baseDatos;
}

/**
 * Cierra la conexión con MongoDB de forma ordenada.
 */
async function desconectar() {
  if (cliente) {
    await cliente.close();
    cliente = undefined;
    baseDatos = undefined;
    console.log('Conexión a MongoDB cerrada.');
  }
}

module.exports = {
  conectar,
  obtenerDb,
  desconectar,
};
