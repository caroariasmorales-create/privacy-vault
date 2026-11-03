const OpenAI = require('openai');

/**
 * Servicio de acceso a OpenAI (Responses API).
 * Encapsula el cliente, el modelo y el manejo de errores de la API.
 */
class OpenAIService {
  /**
   * Inicializa el cliente con OPENAI_API_KEY y el modelo configurado.
   * @throws {Error} Si OPENAI_API_KEY no está definida.
   */
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'OPENAI_API_KEY no está definida. Configúrala en el archivo .env antes de usar OpenAI.'
      );
    }

    this.modelo = process.env.OPENAI_MODEL || 'gpt-6-luna';
    this.cliente = new OpenAI({ apiKey });
  }

  /**
   * Genera una respuesta de texto a partir de un prompt.
   * Usa la Responses API actual (responses.create) y limita la salida.
   * @param {string} prompt - Instrucción o pregunta para el modelo.
   * @param {string} [instructions] - Instrucciones opcionales del sistema (Responses API).
   * @returns {Promise<string>} Texto generado (response.output_text).
   */
  async generarRespuesta(prompt, instructions) {
    try {
      const cuerpo = {
        model: this.modelo,
        input: prompt,
        max_output_tokens: 1000,
      };

      if (instructions) {
        cuerpo.instructions = instructions;
      }

      const response = await this.cliente.responses.create(cuerpo);

      return response.output_text;
    } catch (error) {
      throw this.#traducirError(error);
    }
  }

  /**
   * Convierte errores del SDK/API en mensajes claros en español.
   * Nunca incluye la API key en el mensaje.
   * @param {unknown} error - Error capturado de la llamada a OpenAI.
   * @returns {Error}
   */
  #traducirError(error) {
    if (error instanceof OpenAI.AuthenticationError) {
      return new Error(
        'La clave de API de OpenAI es inválida o no está autorizada.'
      );
    }

    if (error instanceof OpenAI.RateLimitError) {
      if (this.#esSinSaldo(error)) {
        return new Error(
          'La cuenta de OpenAI no tiene saldo o cuota suficiente para esta solicitud.'
        );
      }

      return new Error(
        'Se alcanzó el límite de solicitudes a OpenAI. Intenta de nuevo más tarde.'
      );
    }

    if (error instanceof OpenAI.APIError && this.#esSinSaldo(error)) {
      return new Error(
        'La cuenta de OpenAI no tiene saldo o cuota suficiente para esta solicitud.'
      );
    }

    if (error instanceof OpenAI.APIError) {
      return new Error(
        `Error de la API de OpenAI (HTTP ${error.status ?? 'desconocido'}).`
      );
    }

    return new Error('Ocurrió un error inesperado al llamar a OpenAI.');
  }

  /**
   * Detecta errores de cuota/saldo insuficientes.
   * @param {InstanceType<typeof OpenAI.APIError>} error
   * @returns {boolean}
   */
  #esSinSaldo(error) {
    const codigo = error.code || error.error?.code;
    const mensaje = String(error.message || error.error?.message || '').toLowerCase();

    return (
      codigo === 'insufficient_quota' ||
      mensaje.includes('insufficient_quota') ||
      mensaje.includes('insufficient quota') ||
      mensaje.includes('billing') ||
      mensaje.includes('exceeded your current quota')
    );
  }
}

module.exports = { OpenAIService };
