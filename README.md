# KUYARI — Tu historia, hecha sorpresa

Versión local con catálogo administrable, fotos persistentes y pedidos por WhatsApp. Conserva los recursos de marca originales. Requiere Node.js 24 LTS.

## Abrir y administrar

1. Ejecuta ABRIR-KUYARI.cmd. Inicia el servidor local y abre la guía privada.
2. En la guía, pulsa Activar mi panel y elige tu nombre, correo y contraseña. El enlace solo permite crear al primer administrador.
3. En Productos → Subir nuevo producto, carga hasta 10 fotos, elige la portada y define precio, stock, variantes y personalizaciones.
4. Oculta los productos de muestra cuando hayas cargado tu inventario real. Revisa Entregas: la zona y tarifa iniciales son ejemplos.
5. En Pedidos, confirma la disponibilidad después de conversar con el cliente. Avanza a preparación, listo, enviado y entregado. Confirmar no registra un pago.

No publiques ni compartas GUIA-PRIVADA.html, .env, data/ ni copias de la base de datos.

## Pedido por WhatsApp

El comprador configura su regalo, completa destinatario, dirección, fecha y horario, revisa el total y guarda el pedido. Luego puede elegir:

- Atención principal: +51 930 951 679.
- Atención alternativa: +51 900 080 962.

El enlace abre WhatsApp con el resumen y código del pedido. El comprador debe enviarlo. La web no envía mensajes automáticamente, no confirma entregas por abrir el enlace y no realiza cobros. El detalle completo queda en el panel. Las solicitudes sin confirmar reservan stock por 24 horas y luego vencen.

## Qué funciona

Catálogo con filtros, fichas y galerías, asistente de regalos, Studio, carrito guardado, cotización del servidor, stock, pedidos sin cuenta y con cuenta, seguimiento, administración con roles, imágenes optimizadas, recuerdos y QR con acceso por enlace/PIN/privado, cupones, zonas, categorías y políticas editables.

Las fotos se comprueban por su contenido y se convierten a WebP de hasta 1800 px. Los datos se guardan en SQLite y los archivos en data/uploads. Reiniciar no los borra. No elimines data/.

## Desarrollo

    npm ci
    npm run build
    npm run migrate
    node scripts/local-setup.mjs
    npm start

Abre http://localhost:3000. npm run seed:demo crea datos de muestra únicamente en desarrollo sin sobrescribir productos existentes.

    npm run check

Incluye ESLint, TypeScript estricto, pruebas de API, comercio, seguridad, fotos y recorridos de navegador con Edge en Windows. En otros sistemas instala Chromium para Playwright. Las pruebas usan una base aislada, no el inventario del negocio.

## Publicación actual y modalidades de instalación

La web pública ya está en https://kuyari.vercel.app/. Utiliza Vercel y almacenamiento permanente en Turso para cartas, pedidos y archivos. Incluye cobro por Yape personal al 900 080 962, a nombre de MARIA CLIDA BERROSPI AQUINO; los reportes de operaciones se verifican manualmente desde el panel. Consulta YAPE-PRODUCCION.md. Falta completar el catálogo real, las zonas, la información comercial, las políticas revisadas y un procedimiento comprobado de copias de seguridad.

La coordinación del pedido sigue por WhatsApp (ORDER_CHANNEL=whatsapp). Yape se paga desde la app del comprador y se verifica en la cuenta receptora; no hay confirmación automática ni acceso al saldo de Yape. Mercado Pago está preparado pero requiere credenciales y pruebas antes de habilitarlo. SMTP no está configurado: no se envían notificaciones ni recuperación por email. El seguimiento dentro de la web funciona.

Para instalar la modalidad local Node + SQLite, usa .env.example, ejecuta las migraciones y configura NODE_ENV=production, APP_URL=https://..., DB_PATH=data/kuyari.sqlite y STORE_LIVE=true cuando el catálogo, las zonas y las políticas estén listos. Esa modalidad necesita HTTPS y un volumen persistente para SQLite y archivos; un solo proceso Node opera la base. El flujo Yape documentado corresponde al adaptador cloud publicado en Vercel.

## Copias de seguridad

En la modalidad local, detén el servidor antes de copiar data/ completa y .env a un lugar privado; conserva código y package-lock.json. Restaura con el servidor detenido. No copies únicamente .sqlite mientras funciona: puede haber escrituras en su WAL. En la web Vercel, los datos están en Turso; una copia de la carpeta local no incluye esos datos. Se debe configurar y comprobar la exportación y restauración del almacenamiento remoto.

## Edición azul — 30 de septiembre

La portada original, la identidad de KUYARI y todas sus secciones se conservan. Un apartado adicional después del catálogo principal enlaza a /30-de-septiembre, que presenta seis propuestas: Ramo Azul Infinito, Mini ramo Cielo, Ramo A toda velocidad, Tu carrito favorito, Box Ruta Azul y Dúo Flores & Motor. Sus imágenes son representaciones generadas por IA; no documentan inventario real.

En Productos puedes editar cualquiera de ellas, subir fotos reales y cambiar las opciones. Mientras esté marcada «Consultar precio y disponibilidad por WhatsApp», se muestra sin importe ni unidades disponibles y no puede cobrarse desde el carrito. El cliente configura presentación, tonos, cantidad, fecha deseada, dedicatoria y presupuesto, y elige uno de los dos números para enviar su consulta. La web no envía el mensaje automáticamente ni confirma la entrega.

Cuando tengas precio y stock, desmarca esa casilla y completa ambos. El regalo entonces utilizará el flujo normal de pedido. La fecha y el formato de la colección son una campaña comercial; no se presenta como una efeméride oficial.

Para incorporar la colección en otra instalación después de compilar:

    node --env-file-if-exists=.env scripts/seed-september.mjs

El script no sobrescribe productos existentes. La migración 003 conserva el catálogo previo. La ficha de generación visual está en ARTE-SEPTIEMBRE.md. No se instaló ni utilizó Higgsfield, según la última indicación; se utilizó generación de imágenes integrada.
