require('dotenv').config();

const express = require('express');
const { conectar, desconectar } = require('./src/db');
const tokenStore = require('./src/tokenStore');
const { anonimizarMensaje, desanonimizarMensaje } = require('./src/anonymizer');

const app = express();
const PORT = process.env.PORT || 3001;

// Permite recibir cuerpos JSON en las peticiones
app.use(express.json());

/**
 * Valida que un campo del body sea un string no vacío.
 * @param {*} valor - Valor recibido en el body.
 * @param {string} nombreCampo - Nombre del campo (para el mensaje de error).
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
function validarStringNoVacio(valor, nombreCampo) {
  if (valor === undefined || valor === null) {
    return {
      ok: false,
      status: 400,
      error: `El campo "${nombreCampo}" es obligatorio.`,
    };
  }

  if (typeof valor !== 'string') {
    return {
      ok: false,
      status: 400,
      error: `El campo "${nombreCampo}" debe ser una cadena de texto.`,
    };
  }

  if (valor.trim() === '') {
    return {
      ok: false,
      status: 400,
      error: `El campo "${nombreCampo}" no puede estar vacío.`,
    };
  }

  return { ok: true };
}

/**
 * POST /anonymize
 * Recibe un mensaje con PII, lo anonimiza y persiste las parejas en MongoDB.
 */
app.post('/anonymize', async (req, res) => {
  try {
    const { message } = req.body ?? {};
    const validacion = validarStringNoVacio(message, 'message');

    if (!validacion.ok) {
      return res.status(validacion.status).json({ error: validacion.error });
    }

    const anonymizedMessage = await anonimizarMensaje(message);

    return res.status(200).json({ anonymizedMessage });
  } catch (error) {
    console.error('Error al anonimizar el mensaje.');

    return res.status(500).json({
      error: 'Ocurrió un error interno al anonimizar el mensaje.',
    });
  }
});

/**
 * POST /deanonymize
 * Restaura el PII conocido leyendo los tokens desde MongoDB.
 */
app.post('/deanonymize', async (req, res) => {
  try {
    const { anonymizedMessage } = req.body ?? {};
    const validacion = validarStringNoVacio(anonymizedMessage, 'anonymizedMessage');

    if (!validacion.ok) {
      return res.status(validacion.status).json({ error: validacion.error });
    }

    const message = await desanonimizarMensaje(anonymizedMessage);

    return res.status(200).json({ message });
  } catch (error) {
    console.error('Error al desanonimizar el mensaje.');

    return res.status(500).json({
      error: 'Ocurrió un error interno al desanonimizar el mensaje.',
    });
  }
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

/**
 * Manejo centralizado de errores (p. ej. JSON mal formado en el body).
 */
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'El cuerpo de la petición no es un JSON válido.',
    });
  }

  console.error('Error no controlado en el servidor.');
  return res.status(500).json({
    error: 'Ocurrió un error interno en el servidor.',
  });
});

/**
 * Arranca la app: primero MongoDB e índices, luego el puerto HTTP.
 */
async function iniciar() {
  await conectar();
  await tokenStore.asegurarIndices();

  const servidor = app.listen(PORT, () => {
    console.log(`Privacy Vault escuchando en http://localhost:${PORT}`);
  });

  /**
   * Cierre ordenado al recibir Ctrl+C o SIGTERM.
   */
  const apagar = async (senal) => {
    console.log(`Señal ${senal} recibida. Cerrando aplicación...`);

    servidor.close(async () => {
      try {
        await desconectar();
      } finally {
        process.exit(0);
      }
    });
  };

  process.on('SIGINT', () => {
    apagar('SIGINT');
  });
  process.on('SIGTERM', () => {
    apagar('SIGTERM');
  });
}

iniciar().catch(() => {
  console.error('Error: la aplicación no pudo iniciarse.');
  process.exit(1);
});
