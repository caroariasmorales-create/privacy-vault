# Data Privacy Vault

Este repositorio es nuestra entrega del **Taller 2 de Inteligencia Artificial en Negocios Digitales** (Maestría en Gerencia de Tecnologías de la Información, Universidad de los Andes). Lo construimos con Cursor como asistente de programación, a partir del live demo de clase.

La idea es sencilla: antes de mandarle un texto a un modelo de lenguaje, el vault cambia los nombres, correos y teléfonos por tokens. El modelo trabaja solo con esos tokens y, cuando responde, el vault los vuelve a convertir en los datos originales. Así el proveedor externo no recibe la información personal que el vault alcanza a detectar.

## Qué buscábamos comprobar

Queríamos saber si es técnicamente viable poner una capa de privacidad entre los datos de una organización y un modelo como ChatGPT. En nuestro grupo esto tiene un caso concreto: categorizar solicitudes de postventa de Banco Andino, que llegan con datos de clientes.

## Tecnologías

- **Node.js** (CommonJS) y **Express** para el servicio HTTP.
- **MongoDB Atlas** con el driver oficial `mongodb` para guardar las parejas token ↔ dato original.
- **SDK oficial de OpenAI** con la Responses API (`client.responses.create`).
- **dotenv** para leer las credenciales desde `.env`.

## Requisitos previos

- Node.js y npm.
- Git.
- Una cuenta en MongoDB Atlas con un clúster y su cadena de conexión (nosotros usamos el nivel gratuito M0).
- Una API key de OpenAI con saldo disponible. La API se cobra aparte de ChatGPT.

## Instalación

```bash
git clone https://github.com/caroariasmorales-create/privacy-vault.git
cd privacy-vault
npm install
```

## Variables de entorno

Copia la plantilla y llena tus propios valores. El archivo `.env` está en `.gitignore`, así que nunca se sube al repositorio.

```bash
cp .env.example .env
```

En Windows (PowerShell) el equivalente es `Copy-Item .env.example .env`.

| Variable | Para qué sirve |
|----------|----------------|
| `PORT` | Puerto del servidor. Usamos `3001`. |
| `MONGODB_URI` | Cadena de conexión de tu clúster de Atlas (incluye usuario y contraseña). |
| `OPENAI_API_KEY` | Tu llave de la API de OpenAI. |
| `OPENAI_MODEL` | Modelo a usar. Si no se define, el código usa `gpt-6-luna`, el más económico que encontramos para tareas simples. |

## Cómo ejecutarlo

```bash
# Levanta el servidor: primero se conecta a MongoDB y luego escucha en el puerto
npm start

# Prueba solo la conexión con OpenAI, sin levantar el servidor
npm run test:openai
```

Si la conexión a MongoDB falla, el servidor muestra el código y el mensaje del error sin imprimir la cadena de conexión. Nos pasó con un `querySrv ENOTFOUND`, que resultó ser una cadena mal copiada.

## Endpoints

Todos responden en `http://localhost:3001`. Los ejemplos están escritos para PowerShell con `curl.exe`; en Linux o macOS basta con escribir `curl`.

### `POST /anonymize`

Recibe un mensaje, reemplaza los datos personales por tokens y guarda cada pareja en MongoDB.

```powershell
curl.exe -X POST http://localhost:3001/anonymize -H "Content-Type: application/json" -d '{"message":"oferta de trabajo para Dago Borda con email dborda@gmail.com y teléfono 3152319157"}'
```

Respuesta que obtuvimos:

```json
{"anonymizedMessage":"oferta de trabajo para NAME_e1be92e2b3a5 con email EMAIL_8004719c6ea5 y teléfono PHONE_40e83067b9cb"}
```

Cada token es el prefijo del tipo de dato más los primeros 12 caracteres del SHA-256 del valor original. Elegimos este formato porque coincide exactamente con el ejemplo del enunciado: calculamos el hash de "Dago Borda" y empieza por `e1be92e2b3a5`.

### `POST /deanonymize`

Recibe un texto con tokens y los cambia por los datos guardados en MongoDB. Si un token no existe, lo deja igual.

```powershell
curl.exe -X POST http://localhost:3001/deanonymize -H "Content-Type: application/json" -d '{"anonymizedMessage":"oferta de trabajo para NAME_e1be92e2b3a5 con email EMAIL_8004719c6ea5 y telefono PHONE_40e83067b9cb"}'
```

Respuesta que obtuvimos, incluso después de reiniciar el servidor:

```json
{"message":"oferta de trabajo para Dago Borda con email dborda@gmail.com y telefono 3152319157"}
```

"telefono" sale sin tilde porque así viene en el curl del enunciado. El vault solo cambia tokens; el resto del texto lo deja tal cual.

### `POST /secureChatGPT`

Junta todo lo anterior: anonimiza el prompt, se lo envía a OpenAI, desanonimiza la respuesta y se la devuelve al cliente.

```powershell
curl.exe -X POST http://localhost:3001/secureChatGPT -H "Content-Type: application/json" -d '{"prompt":"por favor redacta un correo breve para Dago Borda invitandolo a una entrevista de trabajo. Su email es dborda@gmail.com y su telefono es 3152319157. Incluye sus datos de contacto al final."}'
```

La respuesta llega como `{"response": "..."}` con el correo redactado por el modelo y los datos reales restaurados.

## Cómo circula la información en `/secureChatGPT`

1. El cliente envía un prompt que puede traer nombres, correos y teléfonos.
2. El vault los cambia por tokens y guarda cada pareja en MongoDB.
3. A OpenAI solo le llega el texto con tokens, junto con una instrucción de copiarlos exactamente igual.
4. OpenAI responde usando esos tokens.
5. El vault consulta MongoDB y devuelve cada token a su dato original.
6. El cliente recibe la respuesta final.

La consola del servidor imprime el prompt y la respuesta tal como viajan hacia y desde OpenAI, es decir, con tokens. Así se puede verificar qué salió del vault sin dejar datos personales en los registros.

## Limitaciones que encontramos

Esto es una prueba de concepto y no protege todo. Lo que vimos en nuestras propias pruebas:

- **La regex de nombres se equivoca con frecuencia.** Convierte en token cualquier palabra con mayúscula inicial. En nuestras pruebas tokenizó "Su", "Incluye", "Escribe" y "Bogota". El modelo tomó esos tokens como nombres de personas: firmó un correo como "Incluye" y escribió "de parte de Bogota".
- **Hay datos que se escapan.** Un teléfono escrito como `+57 315 231 9157` no fue detectado y le llegó a OpenAI sin anonimizar. La regex solo reconoce secuencias continuas de 7 a 15 dígitos.
- **MongoDB guarda los datos en texto claro.** Los protegen el usuario y la lista de IP de Atlas, pero la aplicación no los cifra.
- **Los tokens se pueden recalcular.** Son un SHA-256 sin clave secreta (no usamos HMAC), así que quien adivine un dato puede obtener su token.

Para usar algo así con datos reales de clientes habría que mejorar la detección (por ejemplo, con reconocimiento de entidades), cifrar lo que se guarda y medir con una muestra real cuántos datos se escapan.
