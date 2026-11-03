require('dotenv').config();

const { OpenAIService } = require('../src/openaiService');

/**
 * Script de prueba: un prompt corto contra OpenAIService.
 */
async function main() {
  const servicio = new OpenAIService();
  const respuesta = await servicio.generarRespuesta(
    'Responde en una sola frase: ¿qué es un Data Privacy Vault?'
  );

  console.log(respuesta);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
