# CLAUDE.md

Este archivo orienta a Claude Code (claude.ai/code) cuando trabaja con el código de este repositorio.

**Responde siempre al usuario en castellano.**

## Resumen

"Oficina" es un editor de documentos estático, que funciona solo en el navegador, para documentos corporativos e institucionales en español (con la cabecera de EASDO; por ejemplo, "RESOLUCIÓN GENERAL"). Está hecho con HTML y CSS sin frameworks y un único archivo de JavaScript sobre Editor.js. No hay paso de compilación, gestor de paquetes, linter ni pruebas. Todos los textos de la interfaz, avisos (toasts), `aria-label` y mensajes de consola están en español: los textos nuevos también deben ir en español.

## Puesta en marcha

Sirve la carpeta con cualquier servidor estático y abre `index.html`:

```powershell
py -3 -m http.server 8000    # o bien: python -m http.server 8000
```

Editor.js y sus complementos (`@editorjs/editorjs`, `header`, `paragraph`, `list`, `table`) se cargan desde jsDelivr con versiones fijas en `index.html`, así que hace falta conexión a Internet. `notas.html` (antes `localhost.html`) es una página auxiliar del usuario, reutilizada de un proyecto anterior ("Temporizador"), que sirve de acceso directo con las instrucciones para lanzar el servidor, enlaces a `localhost:8000` y al repositorio de GitHub, y los pasos de Git para subir cambios. No forma parte de la aplicación del editor.

No hay pruebas automáticas: comprueba los cambios a mano en el navegador, incluida la vista previa de impresión, porque la sección `@media print` de `css/styles.css` cambia el estilo de la página al imprimir.

## Arquitectura

EDITOR b1.6/
├── css/
│   └── styles.css
├── docs/
│   ├── INFORME FINAL-INSTRUCTOR DE LA IDENTIDAD COLABORADORA-CURSO ACADÉMICO 2024 - 2025.json
│   ├── RESOLUCIÓN GENERAL.json
│   └── Solicitud de Permiso.json
├── img/
│   ├── bocetos/          (bocetos e imágenes de trabajo, no se usan en la aplicación)
│   └── EASDO_cabecera_oficial.png
├── js/
│   └── editor.js
├── .gitattributes
├── CLAUDE.md
├── documentacion.html
├── index.html
├── notas.html
└── README.md

- `index.html`: estructura de la aplicación (barra lateral y barra superior con Cargar/Imprimir/Guardar) y el `article.document-page`, que contiene la imagen fija de la cabecera, el campo `#documentHeading`, el `#documentTitle` editable (contenteditable), el contenedor de Editor.js `#editor` y el pie (`#footerReference` y la fecha, que se genera sola). En el HTML queda una barra de inserción comentada (botones `data-block`); `editor.js` sigue conectando cualquier botón `[data-block]` mediante `addBlock()`.
- `js/editor.js`: todo lo demás, en un único script global (sin módulos):
  - **Herramientas propias de Editor.js**: `SignatureTool` (`signature`), `DatosTool` (`datos`) y el ajuste de bloque `AddCellTune` (registrado como `addCell`, solo lo usa `datos` y llama a `block.call("addCell")`).
  - **Bloque `signature`**: de 1 a 3 firmas (`SIGNATURE_MAX`) en una cuadrícula de 3 columnas (`.firma-block`), con datos `{signatures: [{label, name}], date?}`. Las firmas se añaden o quitan de una en una desde el menú del bloque (`renderSettings()`), que también permite añadir o quitar una fecha (`.firma-date`) sobre la primera firma; `date` solo se guarda si la fecha está presente.
  - **Bloque `header`**: `HeaderTool` extiende el `Header` de `@editorjs/header@2.8.8`, solo con el nivel H2. Envuelve el h2 en `.ce-header-block` y añade debajo `.ce-header-translation`, una línea editable del mismo cuerpo y grosor 300 para el otro idioma (placeholder «TÍTOL»; el h2 tiene «TÍTULO»); ambas en mayúsculas con `text-transform`. Un encabezado nuevo (sin `text`) empieza bilingüe; el menú del bloque tiene «Monolingüe» (solo castellano, borra la segunda línea) y «Bilingüe», ambos con el icono de H2, en lugar de los niveles. `translation` solo se guarda en el modo bilingüe.
  - **Bloque `list`**: `ListTool` extiende el `List` de `@editorjs/list@1.9.0` y añade `columns` (1 a 3, `LIST_MAX_COLUMNS`; solo se guarda si es mayor que 1), que se cambia con «Añadir columna»/«Quitar columna» en el menú del bloque. `.cdx-list--columns` usa columnas CSS de tercios con el hueco de `.firma-grid` (con 2 columnas el tercer tercio queda libre gracias a un salto forzado final en `::after`, con `data-columns="2"`; sin él, el equilibrado de columnas partiría la primera: 9 → 4 · 1 · 4), así que cada columna tiene su propia altura. Un `MutationObserver` recalcula `ceil(elementos / columnas)` y marca con `data-column-start` (salto `break-before: column`) el elemento que abre cada columna, que se llena de arriba abajo (7 en 3 → 3 · 3 · 1); la numeración sigue el orden del DOM y continúa entre columnas.
  - **Bloque `datos`**: una cuadrícula CSS de 7 columnas (`.datos-grid` en el CSS) con celdas `{header, content, span}`; `span` se limita a valores de 1 a 6. Cada celda tiene su propio menú para cambiar el ancho y eliminarla. `updateRowStarts()` usa un `ResizeObserver` y `getBoundingClientRect` para marcar con `.is-row-start` la primera celda de cada fila visible (sirve para los bordes), así que hay que volver a ejecutarla tras cualquier cambio que afecte a la disposición.
  - **Título**: un div contenteditable (no un input) que admite saltos de línea y grosor de letra por selección (`500`/`300`) mediante `<span data-font-weight>`. Su HTML siempre pasa por `sanitizeTitleMarkup()`, que solo permite texto, `<br>` y esos span. La longitud máxima se controla a mano con `data-maxlength` en los manejadores de `beforeinput` y `paste`.
  - **Guardado**: guardado automático en `localStorage` con la clave `oficina-document-v1` a través de `storeDocument()`, con una espera de 650 ms sobre un `saveTimer` compartido. El mismo bloque de espera, guardado y error está duplicado en el `onChange` de Editor.js y en los manejadores de entrada del encabezado, el título y el pie.
  - **Paginación** (`paginateDocument()`, al final del archivo): el editor muestra el documento en hojas A4 separadas, igual que al imprimir. Los bloques que invadirían el pie reciben el atributo `data-page-break` y un margen `--page-break` que los lleva a la hoja siguiente; un bloque de encabezado se mueve junto con el bloque que lo sigue. `#pageLayer` dibuja las hojas y repite la cabecera y el pie (referencia, fecha y "PÁGINA X DE N") a partir de la página 2, mientras que la página 1 usa los elementos reales y editables. Al imprimir, esos mismos bloques reciben `break-before: page` y `--page-content-top`, porque Chrome recorta los márgenes en los saltos de página no forzados. Un manejador de `beforeprint` recalcula la disposición con el ancho A4 (`.is-printing`). La paginación se vuelve a ejecutar mediante un `ResizeObserver` y desde `onChange`. Los bloques nunca se dividen entre páginas, así que un bloque más alto que una página se superpondrá al pie.
  - **Cargar y guardar archivos** (`#loadButton`/`#loadFileInput` y `#saveButton`/`saveDocumentToFile()`): al guardar se abre el diálogo «Guardar como» (`showSaveFilePicker`) o, si no está disponible, se descarga un archivo JSON con el nombre del título; al cargar, el archivo pasa por `validateDocument()`, que rechaza cualquier bloque cuyo `type` no esté en `SUPPORTED_BLOCKS`.

### Formato JSON del documento

```json
{ "app": "Oficina", "version": 1, "title": "...", "titleMarkup": "...",
  "documentHeading": "...", "footerText": "...", "updatedAt": "fecha ISO",
  "blocks": [ /* bloques de Editor.js */ ] }
```

Un bloque `header` bilingüe añade `translation` a sus datos: `{text, level: 2, translation}`.

No se mantiene compatibilidad con formatos anteriores: los documentos guardados son de prueba y pueden dejar de abrirse bien al cambiar el formato. En `docs/` hay documentos guardados de ejemplo (junto a impresiones en PDF del resultado esperado) que sirven para probar la carga. Las limitaciones del diálogo de guardado están en `documentacion.html`.

### Añadir un tipo de bloque

Un tipo de bloque nuevo debe añadirse en todos estos sitios: la configuración `tools` de `new EditorJS(...)`, `SUPPORTED_BLOCKS` (si no, la carga lo rechaza), el mapa de datos por defecto de `addBlock()` y el `switch` de `countWords()` (si no, sus palabras no se cuentan). Añade sus estilos a `css/styles.css`, con reglas de impresión si hacen falta.

## Estilos

`css/styles.css` define variables de diseño en `:root` (`--ink`, `--navy`, `--line`, etc., además de la geometría de la página `--page-height`/`--page-margin-*`/`--page-gap`; `PAGE_HEIGHT_MM` en `editor.js` debe coincidir con `--page-height`). También sobrescribe clases de Editor.js (`.ce-*` y los popovers; el popover del grosor del título reutiliza el marcado de `ce-popover`) y tiene puntos de corte adaptables en 900px y 680px, además de una sección `@media print`. La fuente es Roboto Condensed, de Google Fonts.
