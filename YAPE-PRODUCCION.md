# KUYARI: Yape y publicación actual

La web pública es https://kuyari.vercel.app/. Corre en Vercel y guarda cartas, pedidos y archivos en Turso. La instalación Node + SQLite de README es otra modalidad; no se requiere un volumen local de Vercel.

## Yape personal

La cuenta de cobro indicada por el propietario es 900 080 962, a nombre de MARIA CLIDA BERROSPI AQUINO. No se generó un QR ficticio; el comprador debe comprobar el destinatario dentro de Yape. El administrador puede subir el QR real desde el panel.

En /pagar-yape se muestran el número y las instrucciones. Los pedidos guardados deben confirmarse antes de reportar una operación. El comprador introduce el número de operación y su nombre; el servidor toma el importe del pedido, guarda el reporte y muestra «En revisión». Esto no aprueba el pago.

El administrador configura la cuenta y sube su QR real en Panel > Yape. Allí verifica el titular, importe y referencia en la app receptora, y aprueba o rechaza el reporte. Solo un administrador puede hacerlo. Al aprobar se registra el pago y se actualiza el seguimiento. Las referencias duplicadas están bloqueadas. Los regalos coordinados únicamente por WhatsApp reciben el comprobante por ese canal; no tienen confirmación automática en la web.

Yape personal no utiliza credenciales de Mercado Pago ni consulta automáticamente el saldo. No se solicitaron códigos de aprobación ni claves de Yape. Una futura pasarela automática requiere integrar y probar las credenciales del proveedor.

## Navegación

Los enlaces internos cambian de sección sin recargar el documento ni mostrar «Abriendo tu sección». Los módulos se preparan al pasar por los enlaces. Las cartas nuevas comienzan en 01 El universo. Se limpian las animaciones y sus observadores al abandonar el editor.

## Pendientes comerciales

Definir precios, stock real, distritos, tarifas, horarios, información comercial y políticas revisadas desde el panel. Los productos actuales de consulta no representan stock confirmado. SMTP y Mercado Pago no están habilitados. Hace falta acordar y comprobar una política de copias de seguridad independiente de Turso. Estos pendientes no se presentan como completados.

## Validación

Build y lint; pruebas de reportes Yape, rechazo y aprobación administrativa, importe del servidor, rechazo de aprobación sin verificación, referencia duplicada y privacidad de pedidos. Revisión de navegación y cartas en navegador. No se ejecutó un pago real ni se aprobó una operación financiera real durante las pruebas.
