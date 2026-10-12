# KUYARI: evolución del diseño

Conservar la marca, textos principales, rutas, navegación, productos, administración, Yape, cartas y pedidos. Crema `#faf4ef`, papel `#fffdfb`, vino `#4a1734`, acento `#882e52`; Playfair Display y DM Sans. La compra es una coordinación real por WhatsApp; no inventar precios, disponibilidad ni pago automático.

La portada muestra fotografías del catálogo activo. Las imágenes siguen siendo administrables. Jerarquía editorial, aire entre secciones y lectura cómoda en móvil. Los controles tienen foco visible y objetivos táctiles de 44–48 px. Efectos breves, con propiedades transform/opacity y respeto por movimiento reducido. No añadir dependencias.

| Antes | Después | Motivo |
| --- | --- | --- |
| Portada y categorías con imágenes referenciales | Portada y selección visual enlazadas al catálogo real | Mostrar lo que el negocio ofrece actualmente |
| Menú estrecho en tabletas | Menú adaptable con Escape, foco y sección activa | Facilitar el acceso con teclado y móvil |
| Secciones y tarjetas con igual énfasis | Más ritmo tipográfico y un recorrido de personalización | Guiar sin saturar |
| Precarga solamente al pasar el puntero | Precarga también por foco y toque | Reducir la espera al navegar con teclado y móvil |

## Recorrido cinematográfico

Elección del usuario: recorrido por un jardín realista, ordenador y móvil vertical nativo. Arquitectura A: cámara siempre hacia delante, sin retrocesos ni recortes de escritorio para móvil.

Propuesta de cuatro escenas: entrada al jardín KUYARI; taller de flores y cintas; mesa de cartas y recuerdos; regalo preparado junto a la salida. Mantener crema, vino, flores rosadas y detalles cálidos. Usar los productos del usuario como referencias, sin alterar sus fotografías ni sus marcas.

Antes de generar: comprobar conexión y créditos, consultar modelos y costes actuales, presentar presupuesto para 4 imágenes y las cadenas de vídeo de ambas orientaciones con 15% de margen, obtener autorización del coste. No sustituir el sitio por una plataforma de Higgsfield ni publicar un vídeo falso o una animación de fotografías como si fuera un recorrido cinematográfico.

La historia con imagen fija acompaña al recorrido cinematográfico integrado.


Higgsfield Plus conectado: saldo inicial 110, saldo final 74. El usuario autorizó continuar con vídeos tras cambiar su plan. Se generaron dos fotografías iniciales y ocho clips Seedance 2.0 Mini de cuatro segundos, cuatro horizontales y cuatro verticales nativos. Cada continuación utiliza el último fotograma real del tramo anterior; la escena final también referencia el Ramo Lirios y Tulipanes Rosa Pastel del catálogo. Coste total 36 créditos, dentro del presupuesto de hasta 42.

Cada cadena se sirve como un MP4 continuo con GOP corto. Se suavizan las diferencias de color de las uniones sin invertir el avance. Los carteles y vídeo móviles son nativos 9:16. El jardín se identifica como virtual y no pretende ser un establecimiento físico.

Corrección del 12 de octubre: el jardín reproduce el vídeo automáticamente al entrar en pantalla, sin depender del desplazamiento. Reproducir/pausar es visible, la primera imagen decodificada se muestra inmediatamente y el vídeo se transmite desde su archivo sin esperar una descarga completa. Se pausa fuera de pantalla y al ocultar la pestaña; una pausa del cliente se conserva al volver. Las etapas detienen el vídeo en la escena elegida para mantener estable su enlace. «Explorar con scroll» conserva el recorrido cinematográfico opcional. El modo normal ocupa una sola pantalla. Con movimiento reducido no se descarga vídeo hasta pulsar Reproducir. Hay reintento ante error y limpieza al navegar. Un acceso «Ver el jardín en vídeo» aparece desde la portada. Los saltos a anclas de una misma página ya no reconstruyen el contenido ni reinician el reproductor.

Validación: compilación TypeScript/Vercel, ESLint y diez pruebas de navegador; avance del tiempo sin desplazamiento en ordenador y móvil, pausa persistente, cartas, movimiento reducido con reproducción explícita, exploración por scroll, reintento de carga y cuatro flujos comerciales. Revisión en 1440, 1024, 390 y 320 px sin desbordamiento ni errores JavaScript. Se reutilizan los vídeos generados; no hubo consumo adicional de créditos.
