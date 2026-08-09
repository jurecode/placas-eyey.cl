# publica.eyey.cl

Editor de placas de eyey: se escribe el titular, se pone la foto y se publica
en Instagram desde el navegador. Corre en el hosting propio, con PHP y MySQL.

Es el mismo sistema que usa Somos Puerto, con otra pieza gráfica. Lo que
cambia vive en `marca/`: el logo, los colores, las secciones y el nombre.

## Cómo se instala

1. Bajar `placas-eyey.zip` de la última versión publicada y descomprimirlo en
   la carpeta del dominio.
2. Copiar `api/config.ejemplo.php` como `api/config.php` y completar los datos
   de la base MySQL y la clave de acceso.
3. Dar permiso de escritura (755) a `fotos/` y `publicaciones/`.
4. Entrar al sitio, poner la clave, y cargar el token de Instagram desde el
   panel privado.

De ahí en adelante el botón «Actualizar el sitio» del panel baja la última
versión sola.

## Qué hay acá

- `index.html` / `editor.js` — el editor
- `placa.js` — herramientas de dibujo y el diseño de Somos Puerto
- `dibujo-eyey.js` — el diseño de este medio
- `marca/` — logo, colores y secciones. **No se sobrescribe al actualizar.**
- `api/` — la parte del servidor: base de datos, subidas y publicación
