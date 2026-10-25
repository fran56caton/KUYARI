# Pausa temporal de KUYARI

Solicitada por el propietario el 25 de octubre de 2026. Todas las rutas del despliegue, incluidos archivos, administración y API, responden 503 sin caché. Los pedidos y las cargas quedan bloqueados antes de leer el cuerpo de la petición o conectar con los datos. Se conserva el sitio completo, el catálogo, las cartas y los pedidos existentes.

Para reabrir cuando el propietario lo solicite:

1. Cambiar `maintenanceEnabled` a `false` en `server/maintenance.ts`.
2. Restaurar `rewrites: [{ "source": "/(.*)", "destination": "/api/index" }]` en lugar de `routes` en `vercel.json`, para recuperar el servicio normal de archivos estáticos.
3. Actualizar las pruebas de mantenimiento según el nuevo estado y publicar. No ejecutar semillas ni borrar almacenamiento.

El cierre se aplica al despliegue nuevo y a los dominios que lo sirven. No revoca copias que terceros ya hayan descargado ni despliegues históricos independientes.
