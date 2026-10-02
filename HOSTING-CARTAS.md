# KUYARI en Vercel con cartas y regalos

El dominio de Vercel es independiente del sitio original de Sites. Conserva el diseño KUYARI e incluye el editor, doce universos animados, vista previa y QR en corazón.

## Almacenamiento permanente

La integración Turso conectada al proyecto proporciona `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`. Las credenciales permanecen en el servidor. El adaptador utiliza HTTPS y transacciones SQLite atómicas. No usa `/tmp` para guardar cartas, cuentas, pedidos ni fotografías.

Las fotos y videos se guardan por bloques binarios en la misma base persistente. Las fotos de las cartas mantienen el control por propietario, enlace o PIN. Solo las fotos publicadas en productos se sirven públicamente. Cada archivo admite hasta **3 MB**, con un máximo de diez por carta o producto. Los videos largos pueden añadirse con su enlace HTTPS.

El catálogo inicial contiene las doce propuestas referenciales originales, sin inventar precio ni stock: se consulta por **+51 930 951 679** y **+51 900 080 962**. La sección del 30 de septiembre se mantiene separada. Los pagos permanecen desactivados.

## Panel del propietario

Configura un `SETUP_TOKEN` secreto y aleatorio de al menos 32 caracteres en Vercel, redespliega y abre `/activar-admin`. El propietario establece su contraseña y después puede subir fotografías y gestionar productos desde `/admin`. La activación solo funciona una vez. Ningún secreto debe subirse al repositorio.

## Compilación y pruebas

`npm ci` y `npm run build` crean `public/` y el adaptador del servidor. `public/` se genera y se ignora en Git. `npm run lint` valida el código y `node --test tests/vercel.test.mjs` comprueba el contrato HTTP de Turso, los permisos de las fotos, el QR y la reversión de transacciones. El servidor local sigue disponible con `npm run dev` y su SQLite local.

Las políticas comerciales requieren completarse desde el panel antes de habilitar pedidos con reservas. Las consultas por WhatsApp y la creación de cartas funcionan de forma independiente.
