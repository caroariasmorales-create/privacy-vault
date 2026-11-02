require('dotenv').config();

const express = require('express');
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
 * Recibe un mensaje con PII y responde con la versión anonimizada.
 * Body esperado: { "message": "texto con nombres, emails y teléfonos" }
 */
app.post('/anonymize', (req, res) => {
  try {
    const { message } = req.body ?? {};
    const validacion = validarStringNoVacio(message, 'message');

    if (!validacion.ok) {
      return res.status(validacion.status).json({ error: validacion.error });
    }

    const anonymizedMessage = anonimizarMensaje(message);

    return res.status(200).json({ anonymizedMessage });
  } catch (error) {
    console.error('Error al anonimizar el mensaje:', error);

    return res.status(500).json({
      error: 'Ocurrió un error interno al anonimizar el mensaje.',
    });
  }
});

/**
 * POST /deanonymize
 * Recibe un mensaje anonimizado y restaura el PII conocido desde el almacén.
 * Body esperado: { "anonymizedMessage": "texto con tokens NAME_/EMAIL_/PHONE_" }
 */
app.post('/deanonymize', (req, res) => {
  try {
    const { anonymizedMessage } = req.body ?? {};
    const validacion = validarStringNoVacio(anonymizedMessage, 'anonymizedMessage');

    if (!validacion.ok) {
      return res.status(validacion.status).json({ error: validacion.error });
    }

    const message = desanonimizarMensaje(anonymizedMessage);

    return res.status(200).json({ message });
  } catch (error) {
    console.error('Error al desanonimizar el mensaje:', error);

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

  console.error('Error no controlado:', err);
  return res.status(500).json({
    error: 'Ocurrió un error interno en el servidor.',
  });
});

app.listen(PORT, () => {
  console.log(`Privacy Vault escuchando en http://localhost:${PORT}`);
});
