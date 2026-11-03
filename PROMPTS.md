# Registro de prompts

Estos son los prompts que usamos en Cursor durante el Taller 2, en el orden en que los aplicamos. Los copiamos tal como los enviamos; solo agregamos una línea de contexto antes de cada uno.

## Fase 0 – Preparación del entorno

_Antes de escribir código preparamos la protección de credenciales y este mismo registro._

```text
Estoy iniciando un proyecto académico en Node.js: un Data Privacy Vault que anonimizará información personal identificable (PII). En este paso NO escribas código de la aplicación ni instales dependencias. Solo necesito preparar la protección de credenciales y el registro de prompts.

Crea únicamente estos archivos en la raíz del proyecto:

1. .gitignore que excluya: node_modules/, .env y cualquier .env.* excepto .env.example, archivos de log, y archivos del sistema operativo (por ejemplo Thumbs.db y .DS_Store).
2. .env.example con estas variables vacías y un comentario breve que explique cada una:
   PORT=3001
   MONGODB_URI=
   OPENAI_API_KEY=
3. .env con las mismas variables, con PORT=3001 y las demás vacías.
4. PROMPTS.md con un título y una sección "Prompts utilizados en el desarrollo", donde registraremos los prompts de cada actividad del taller. Como primera entrada, registra este mismo prompt textualmente bajo el subtítulo "Fase 0 – Preparación del entorno".

No modifiques package.json ni crees otros archivos. Al terminar, explícame en español qué hace cada archivo y por qué .env no debe subirse a GitHub.
```

## Actividad 1 – Endpoint anonymize

_Es el prompt del enunciado. Le agregamos al final unas reglas para que Cursor no tocara los archivos de seguridad ni se adelantara a las siguientes actividades._

```text
I am creating a Data Privacy Vault so that PII (Personally identifiable information) becomes anonymized using node.js.

I need to start with the first step: have an endpoint so that it receives a single string with a message that contains PII like names, emails and phone numbers and returns it anonymized replacing the whole name, email and phone with an alphanumeric token.

Please act as an experienced node.js developer and tell me step by step how would you do it. Ask me for information whenever you need it and use good coding practices and comments in the functions.

An example of the request can be:
curl -X POST http://localhost:3001/anonymize -H "Content-Type: application/json" -d '{"message":"oferta de trabajo para Dago Borda con email dborda@gmail.com y teléfono 3152319157"}'

The response to that request would be:
{
"anonymizedMessage": "oferta de trabajo para d7e8e0bf bd673df2 con email b09bde30 y teléfono dd195b6c"
}

Reglas adicionales para este paso:
- Responde y comenta el código en español.
- Usa Express y regex. Lee el puerto desde .env con dotenv (PORT=3001).
- Implementa solo el endpoint /anonymize; no implementes todavía deanonymize, base de datos ni OpenAI.
- No modifiques .gitignore, .env ni .env.example. En PROMPTS.md solo agrega este prompt textual bajo el subtítulo "Actividad 1 – Endpoint anonymize".
- Incluye validación básica de la entrada y manejo de errores con respuestas JSON claras.
- Al terminar, explícame qué archivos creaste, qué hace cada función y cómo funcionan las expresiones regulares que usaste.
```

## Actividad 1 – Endpoint deanonymize

_También es el prompt del enunciado. Los ajustes resuelven una inconsistencia: el ejemplo de anonymize usa tokens de 8 caracteres y el de deanonymize usa el formato `NAME_`, `EMAIL_` o `PHONE_` con 12 caracteres, que es el que adoptamos._

```text
Thanks. Now, let's implement the deanonymize endpoint where the calling should be like this:
curl -X POST http://localhost:3001/deanonymize -H "Content-Type: application/json" -d '{"anonymizedMessage":"oferta de trabajo para NAME_e1be92e2b3a5 con email EMAIL_8004719c6ea5 y telefono PHONE_40e83067b9cb"}'
and should return the original message:
{"message":"oferta de trabajo para Dago Borda con email dborda@gmail.com y teléfono 3152319157"}

Ajustes necesarios para este paso:
- Cambia el formato de los tokens al del ejemplo: prefijo NAME_, EMAIL_ o PHONE_ seguido de los primeros 12 caracteres hexadecimales del SHA-256 del valor original exacto (sin pasarlo a minúsculas). Ejemplo verificado: SHA-256 de "Dago Borda" empieza por e1be92e2b3a5.
- Un nombre completo de varias palabras con mayúscula inicial consecutivas (por ejemplo "Dago Borda") debe generar un solo token NAME_.
- Al anonimizar, guarda cada pareja token → valor original en un almacén en memoria dentro de un módulo separado (por ejemplo src/tokenStore.js), para poder reemplazarlo luego por una base de datos sin cambiar el resto del código.
- /deanonymize recibe anonymizedMessage, reemplaza cada token conocido por su valor original y responde { "message": "..." }. Si un token no existe en el almacén, déjalo sin cambios.
- Valida que anonymizedMessage sea un string no vacío y responde errores en JSON.
- No modifiques .gitignore, .env ni .env.example. En PROMPTS.md agrega este prompt textual bajo "Actividad 1 – Endpoint deanonymize".
- Responde en español y explícame qué cambiaste y por qué la desanonimización necesita guardar las parejas.
```

## Actividad 2 – Persistencia con MongoDB

_Con este prompt pasamos las parejas token ↔ dato de la memoria a MongoDB Atlas._

```text
Ahora vamos con la Actividad 2: añade persistencia en MongoDB para almacenar las parejas [información privada, token].

Contexto: el proyecto ya tiene /anonymize y /deanonymize funcionando, con las parejas guardadas en memoria en src/tokenStore.js. La cadena de conexión de MongoDB Atlas ya está en .env como MONGODB_URI.

Requisitos:
- Usa el driver oficial "mongodb" para Node.js (instálalo con npm). No uses mongoose.
- Crea src/db.js para conectar con MONGODB_URI, usando la base de datos "privacy_vault". Si MONGODB_URI no existe o la conexión falla, muestra un error claro en consola y detén la aplicación.
- Reescribe src/tokenStore.js para que use la colección "tokens" en lugar del Map en memoria. Cada documento: { token, value, type ("NAME", "EMAIL" o "PHONE"), createdAt }.
- Crea un índice único sobre "token" y guarda con upsert ($setOnInsert) para evitar duplicados si el mismo dato se anonimiza varias veces.
- En deanonymize, busca todos los tokens del mensaje en una sola consulta ($in) y reemplaza los que existan; los que no existan se dejan igual.
- Ajusta src/anonymizer.js e index.js solo lo necesario para que las funciones sean async. El servidor debe conectarse a MongoDB antes de empezar a escuchar en el puerto y cerrar la conexión al detenerse con Ctrl+C.
- No cambies el formato de los tokens ni las expresiones regulares.
- No modifiques .gitignore ni .env. En .env.example no agregues valores reales. En PROMPTS.md agrega este prompt textual bajo "Actividad 2 – Persistencia con MongoDB".
- Nunca imprimas en consola la cadena de conexión ni los valores privados.
- No ejecutes el servidor; yo lo probaré.
- Responde en español y explícame qué archivos cambiaste, cómo se relaciona cada documento de MongoDB con su token y qué pasaría si se anonimiza dos veces el mismo dato.
```

## Actividad 2 – Diagnóstico del error de conexión

_El primer arranque con MongoDB falló con un mensaje genérico, así que le pedimos a Cursor que mostrara el error real._

```text
Al ejecutar npm start aparece "Error: no se pudo conectar a MongoDB" sin más detalle. Modifica únicamente src/db.js para que, cuando falle la conexión, imprima también error.name, error.code y error.message, sin imprimir nunca la cadena de conexión ni la contraseña. No cambies nada más y no ejecutes el servidor.
```

Con eso vimos que el error era `querySrv ENOTFOUND`: la cadena de conexión tenía una dirección de ejemplo en lugar de la de nuestro clúster. Al copiar la cadena correcta desde Atlas, el servidor conectó.

## Actividad 3 – Clase de conexión con OpenAI

_El enunciado habla de "text completion"; según la documentación vigente de OpenAI lo implementamos con la Responses API._

```text
Ahora vamos con la Actividad 3. Primer paso: créame una clase para conectarme con OpenAI y hacer un text completion.

Requisitos:
- Instala el SDK oficial "openai" con npm. El proyecto usa CommonJS (require).
- Crea src/openaiService.js con una clase OpenAIService que:
  - Lea OPENAI_API_KEY desde las variables de entorno y lance un error claro si no existe.
  - Use el modelo definido en la variable OPENAI_MODEL y, si no existe, "gpt-6-luna".
  - Tenga un método async generarRespuesta(prompt) que use la Responses API actual (client.responses.create con model e input) y devuelva response.output_text.
  - Limite la salida con max_output_tokens: 1000 para controlar costos.
  - Maneje errores de la API (llave inválida, sin saldo, límite de solicitudes) con mensajes claros en español, sin imprimir nunca la API key.
- Crea scripts/probarOpenAI.js: un script corto que cargue dotenv, use la clase con el prompt "Responde en una sola frase: ¿qué es un Data Privacy Vault?" e imprima la respuesta. Agrega en package.json el script "test:openai" para ejecutarlo.
- Agrega OPENAI_MODEL=gpt-6-luna en .env.example (sin valores secretos). No modifiques .env, .gitignore ni los archivos de anonimización, base de datos o rutas.
- En PROMPTS.md agrega este prompt textual bajo "Actividad 3 – Clase de conexión con OpenAI".
- No ejecutes nada; yo lo probaré.
- Responde en español y explícame qué hace la clase y por qué está separada del resto del código.
```

## Actividad 3 – Endpoint secureChatGPT

_La primera parte repite los pasos del enunciado; los detalles técnicos son nuestros._

```text
Ahora haz un nuevo endpoint que se llame secureChatGPT. Este debe:
- Recibir un prompt que tenga información privada (nombres, teléfonos e emails)
- Anonimizarla usando las funciones ya implementadas
- Enviar el prompt a ChatGPT usando la clase OpenAIService creada en el paso anterior
- Recibir la respuesta y desanonimizarla
- Enviar la respuesta al cliente final

Detalles técnicos:
- Ruta: POST /secureChatGPT. Body: { "prompt": "..." }. Respuesta: { "response": "..." }.
- Reutiliza anonimizarMensaje y desanonimizarMensaje de src/anonymizer.js y la clase de src/openaiService.js. No dupliques lógica.
- Permite que generarRespuesta reciba unas instrucciones opcionales (parámetro instructions de la Responses API). Desde el endpoint envía: "El texto contiene tokens con el formato NAME_xxxxxxxxxxxx, EMAIL_xxxxxxxxxxxx y PHONE_xxxxxxxxxxxx que reemplazan datos personales. Cuando necesites referirte a esos datos, copia los tokens exactamente igual, sin modificarlos, traducirlos ni explicarlos."
- Imprime en la consola del servidor el prompt anonimizado que se envía a OpenAI y la respuesta anonimizada que llega, con etiquetas claras. Nunca imprimas el prompt original ni la respuesta final desanonimizada.
- Valida que prompt sea un string no vacío. Si falla OpenAI, responde con código 502 y un mensaje JSON claro.
- Crea la instancia de OpenAIService una sola vez al iniciar el servidor.
- No modifiques las expresiones regulares, el formato de tokens, la conexión a MongoDB, .env ni .gitignore.
- En PROMPTS.md agrega este prompt textual bajo "Actividad 3 – Endpoint secureChatGPT".
- No ejecutes el servidor.
- Responde en español y explícame paso a paso cómo circula la información entre el cliente, el vault, MongoDB y OpenAI.
```

## Actividad 3 – README

_La primera línea es la instrucción del enunciado. Cursor detectó en esta revisión que faltaba el prompt de diagnóstico de MongoDB y lo agregamos a mano._

```text
Pídele a cursor que le genere un archivo Readme.md con la descripción del proyecto y los pasos para instalarlo.

Crea README.md en la raíz, en español, con estas secciones: descripción del proyecto (Data Privacy Vault, Taller 2 de Inteligencia Artificial en Negocios Digitales, MaIT Uniandes), objetivo, tecnologías (Node.js, Express, MongoDB Atlas con el driver oficial, SDK de OpenAI con Responses API, dotenv), requisitos previos, instalación (git clone, npm install), configuración de variables de entorno (copiar .env.example a .env y explicar PORT, MONGODB_URI, OPENAI_API_KEY y OPENAI_MODEL, sin valores reales), ejecución (npm start y npm run test:openai), descripción de los tres endpoints con ejemplos curl y respuestas (usa los ejemplos de Dago Borda con los tokens NAME_e1be92e2b3a5, EMAIL_8004719c6ea5 y PHONE_40e83067b9cb), flujo de secureChatGPT, y una sección "Limitaciones conocidas" con estos resultados reales de nuestras pruebas: la regex de nombres tokeniza cualquier palabra con mayúscula inicial ("Su", "Incluye", "Escribe", "Bogota"), lo que degradó las respuestas del modelo; un teléfono con formato "+57 315 231 9157" no fue detectado y llegó sin anonimizar a OpenAI; los valores se guardan en texto claro en MongoDB; los tokens son hash SHA-256 sin clave secreta y pueden recalcularse si se conoce el dato.

Además, revisa PROMPTS.md: verifica que contenga, en orden cronológico, los prompts de Fase 0, Actividad 1 (anonymize y deanonymize), Actividad 2 (persistencia y el prompt de diagnóstico del error de conexión), Actividad 3 (clase OpenAI y secureChatGPT) y este prompt. Agrega este prompt bajo "Actividad 3 – README". Si falta alguno, dime cuál en lugar de inventarlo.

No modifiques código, .env ni .gitignore. No incluyas en ningún archivo la API key, la cadena de conexión ni contraseñas.
```
