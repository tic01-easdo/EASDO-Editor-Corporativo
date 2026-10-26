# Oficina

Editor de documentos corporativos en español. La interfaz está hecha en HTML y CSS; Editor.js y sus herramientas proporcionan los bloques editables.

## Iniciar

Sirve esta carpeta con cualquier servidor web estático y abre `index.html`. Por ejemplo:

```powershell
python -m http.server 8000
```

Las bibliotecas Editor.js se cargan desde jsDelivr, así que el navegador necesita conexión a Internet.

## Funciones

- Inserción de texto, encabezados, listas, tablas, bloques de datos y bloques de firma.
- Bloques de datos con celdas configurables en una cuadrícula de siete columnas; cada celda tiene campos `header` y `content`.
- Guardado automático en el almacenamiento local del navegador.
- Importación y exportación de documentos JSON.
- Impresión del documento con una hoja de estilos optimizada.
- Diseño adaptable a pantallas pequeñas.

Los datos locales permanecen en el dispositivo y el navegador donde se creó el documento. Exporta una copia JSON para moverlo o conservar una copia de seguridad. La importación acepta documentos con bloques de Editor.js; no convierte automáticamente los archivos del prototipo anterior.
