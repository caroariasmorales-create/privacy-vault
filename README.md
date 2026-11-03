# Data Privacy Vault

Proyecto académico del **Taller 2 de Inteligencia Artificial en Negocios Digitales** (MaIT – Universidad de los Andes).

Un *Data Privacy Vault* que recibe textos con información personal identificable (PII), la anonimiza con tokens, puede enviarla de forma segura a OpenAI y devolver la respuesta ya desanonimizada al cliente.

## Objetivo

Proteger nombres, correos electrónicos y teléfonos antes de que un modelo de lenguaje procese el texto: el vault sustituye el PII por tokens, persiste las parejas token ↔ valor, consulta al modelo solo con texto anonimizado y restaura los datos originales en la respuesta final.

## Tecnologías

- **Node.js** (CommonJS)
- **Express** — API HTTP
- **MongoDB Atlas** — persistencia con el **driver oficial** `mongodb` (sin Mongoose)
- **OpenAI SDK** — Responses API (`client.responses.create`)
- **dotenv** — variables de entorno

## Requisitos previos

- Node.js y npm instalados
- Cuenta en MongoDB Atlas (o instancia compatible) y cadena de conexión
- API key de OpenAI
- Git (para clonar el repositorio)

## Instalación

```bash
git clone <url-del-repositorio>
cd privacy-vault
npm install
```

## Configuración de variables de entorno

Copia el archivo de ejemplo y completa los valores reales en local (nunca subas `.env` al repositorio):

```bash
cp .env.example .env
```

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto HTTP del servidor (por ejemplo `3001`). |
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas. |
| `OPENAI_API_KEY` | Clave de API de OpenAI. |
| `OPENAI_MODEL` | Modelo a usar (en `.env.example` aparece `gpt-6-luna` como referencia). |

No incluyas secretos en commits, capturas ni documentación pública.

## Ejecución

```bash
# Servidor (conecta a MongoDB y escucha en PORT)
npm start

# Prueba rápida de la clase OpenAIService (sin levantar Express)
npm run test:openai
```

## Endpoints

Base local: `http://localhost:3001`

### 1. `POST /anonymize`

Anonimiza PII en un mensaje y guarda las parejas en MongoDB.

**Petición:**

```bash
curl -X POST http://localhost:3001/anonymize \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"oferta de trabajo para Dago Borda con email dborda@gmail.com y teléfono 3152319157\"}"
```

**Respuesta:**

```json
{
  "anonymizedMessage": "oferta de trabajo para NAME_e1be92e2b3a5 con email EMAIL_8004719c6ea5 y teléfono PHONE_40e83067b9cb"
}
```

### 2. `POST /deanonymize`

Restaura el texto original a partir de tokens conocidos en MongoDB. Los tokens desconocidos se dejan igual.

**Petición:**

```bash
curl -X POST http://localhost:3001/deanonymize \
  -H "Content-Type: application/json" \
  -d "{\"anonymizedMessage\":\"oferta de trabajo para NAME_e1be92e2b3a5 con email EMAIL_8004719c6ea5 y telefono PHONE_40e83067b9cb\"}"
```

**Respuesta:**

```json
{
  "message": "oferta de trabajo para Dago Borda con email dborda@gmail.com y teléfono 3152319157"
}
```

### 3. `POST /secureChatGPT`

Anonimiza el prompt, lo envía a OpenAI, desanonimiza la respuesta y la devuelve al cliente.

**Petición:**

```bash
curl -X POST http://localhost:3001/secureChatGPT \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"Escribe un mensaje corto de oferta laboral para Dago Borda (email dborda@gmail.com, teléfono 3152319157).\"}"
```

**Respuesta (forma):**

```json
{
  "response": "..."
}
```

La propiedad `response` contiene el texto del modelo ya desanonimizado (con el PII restaurado cuando los tokens existen en el vault).

## Flujo de `/secureChatGPT`

1. El **cliente** envía un `prompt` que puede contener PII.
2. El **vault** anonimiza el texto (`anonimizarMensaje`) y persiste token ↔ valor en **MongoDB**.
3. Solo el prompt **anonimizado** se envía a **OpenAI**, junto con instrucciones para no alterar los tokens (`NAME_…`, `EMAIL_…`, `PHONE_…`).
4. OpenAI responde (idealmente reutilizando esos tokens).
5. El vault **desanonimiza** la respuesta consultando MongoDB.
6. El cliente recibe `{ "response": "..." }` con los datos originales restaurados.

En la consola del servidor solo se registran el prompt y la respuesta **anonimizados**, nunca el texto original ni la respuesta final desanonimizada.

## Limitaciones conocidas

Resultados observados en pruebas reales de este taller:

- La **regex de nombres** tokeniza cualquier palabra con mayúscula inicial (`Su`, `Incluye`, `Escribe`, `Bogota`, etc.), no solo nombres de persona. Eso introduce tokens espurios y **degrada la calidad** de las respuestas del modelo.
- Un teléfono con formato internacional espaciado como `+57 315 231 9157` **no fue detectado** por la regex actual y **llegó sin anonimizar a OpenAI**.
- Los valores originales se almacenan en **texto claro** en MongoDB (sin cifrado en reposo a nivel de aplicación).
- Los tokens son un **SHA-256 truncado sin clave secreta** (no se usa HMAC): si alguien conoce el dato original, puede **recalcular** el mismo token.
