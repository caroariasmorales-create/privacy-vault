# Registro de prompts

## Prompts utilizados en el desarrollo

### Fase 0 – Preparación del entorno

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

### Actividad 1 – Endpoint anonymize

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

### Actividad 1 – Endpoint deanonymize

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
