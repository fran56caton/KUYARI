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

Corrección del 12 de octubre, con el ajuste posterior solicitado por el usuario: reproducción automática silenciosa y en bucle mediante autoplay, loop, muted y playsinline nativos. El vídeo arranca sin interacción previa, también con movimiento reducido por instrucción explícita del propietario. Elegir Jardín, Flores, Cartas o Tu regalo ya no detiene el vídeo: el enlace y el texto seleccionados permanecen estables mientras continúa la cámara. Un primer intento interrumpido se reintenta automáticamente; también se recupera al volver a la pestaña o interactuar con cualquier parte de la página. La primera imagen decodificada se muestra inmediatamente y el archivo se transmite sin esperar una descarga completa. Se conserva pausa voluntaria, exploración por scroll opcional, reintento ante error y limpieza al navegar. Se pausa fuera de pantalla y al ocultar la pestaña; vuelve a reproducirse al regresar salvo pausa voluntaria. El modo normal ocupa una pantalla. Los demás efectos de interfaz siguen respetando movimiento reducido. Un acceso «Ver el jardín en vídeo» aparece desde la portada. Los saltos internos no reconstruyen la página ni reinician el reproductor.

Validación: compilación TypeScript/Vercel, ESLint, siete pruebas del jardín y cuatro flujos comerciales. Las nuevas comprobaciones de arranque usan CDP con userGesture:false y sin capturas de trazas que otorguen activación de usuario: reproducción con navigator.userActivation.hasBeenActive=false en ordenador y móvil, bucle automático, movimiento reducido, continuidad al elegir una etapa, pausa voluntaria, recuperación de un primer intento interrumpido y navegación. La composición visual anterior permanece. Se reutilizan los vídeos generados; no hubo consumo adicional de créditos.
