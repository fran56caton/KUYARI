# Despliegue de KUYARI en Vercel

KUYARI incluye una adaptación serverless para Vercel en `api/index.ts`. La aplicación Express se exporta como handler y no abre un puerto con `listen()`.

## Variables mínimas

Configura en Vercel:

- `NODE_ENV=production`
- `APP_URL=https://TU-DOMINIO.vercel.app` (o tu dominio final)
- `TRUST_PROXY=true`
- `STORE_LIVE=false` durante las pruebas
- `ORDER_CHANNEL=whatsapp` durante las pruebas
- `BUSINESS_NAME=KUYARI`

En Vercel, KUYARI usa automáticamente `/tmp/kuyari.sqlite` si no se define `DB_PATH`.

## Importante: persistencia

El sistema actual usa SQLite local con `node:sqlite`. El filesystem de una función de Vercel no es almacenamiento persistente. Por eso la adaptación permite desplegar y probar la interfaz/API, pero **pedidos, sesiones, usuarios, catálogo modificado y otros datos escritos en SQLite pueden desaparecer entre ejecuciones o instancias**.

No actives `STORE_LIVE=true` ni pagos reales hasta migrar la base de datos a un servicio persistente compatible con Vercel.

Los archivos subidos tampoco deben depender del filesystem local en producción. Configura S3 mediante `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY` (y `S3_ENDPOINT` cuando corresponda).

## Producción

Para una tienda real en Vercel quedan dos requisitos:

1. migrar SQLite a una base persistente/remota;
2. configurar S3 y las variables de pagos/correo antes de activar la tienda.

