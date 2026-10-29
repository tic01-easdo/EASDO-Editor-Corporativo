"use strict";

const STORAGE_KEY = "oficina-document-v1";
const DEFAULT_TITLE = "RESOLUCIÓN";
const DEFAULT_TITLE_FONT_WEIGHT = "500";
const TITLE_FONT_WEIGHTS = new Set(["500", "300"]);
const DEFAULT_DOCUMENT_HEADING = "ESCUELA DE ARTE Y SUPERIOR DE DISEÑO DE ORIHUELA";
const DEFAULT_FOOTER_TEXT = "SAIC-PX-XX_ANEXO X_VX_10/06/2024 NOMBRE ACLARATORIO DEL DOCUMENTO";
const SUPPORTED_BLOCKS = new Set(["paragraph", "header", "list", "table", "datos", "signature"]);
const PAGE_HEIGHT_MM = 297;
const PAGE_FOOTER_SPACE_MM = 6;
const SIGNATURE_MAX = 3;
const SIGNATURE_DEFAULT_LABEL = "FIRMADO / SIGNAT";

class AddCellTune {
    static get isTune() {
        return true;
    }

    constructor({ block }) {
        this.block = block;
    }

    render() {
        return {
            icon: '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M8 4v8M4 8h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
            label: "Crear celda",
            onActivate: () => {
                this.block.call("addCell");
                this.block.dispatchChange();
            }
        };
    }
}

class SignatureTool {
    static get toolbox() {
        return {
            title: "Firma",
            icon: '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M3 15c2-1.5 2.5-7 4-7 1.7 0-.2 6 1.2 6 1.2 0 1.5-3.2 2.7-3.2 1.1 0 .7 2.2 2 2.2 1 0 1.7-.5 2.8-1.3M3 18h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
        };
    }

    constructor({ data, block }) {
        const value = data || {};
        const signatures = Array.isArray(value.signatures) ? value.signatures : [];
        this.signatures = signatures.slice(0, SIGNATURE_MAX).map(signature => {
            const item = signature && typeof signature === "object" ? signature : {};
            return {
                label: typeof item.label === "string" ? item.label : SIGNATURE_DEFAULT_LABEL,
                name: typeof item.name === "string" ? item.name : ""
            };
        });
        if (!this.signatures.length) {
            this.signatures.push({ label: SIGNATURE_DEFAULT_LABEL, name: "" });
        }
        this.date = typeof value.date === "string" ? value.date : null;
        this.block = block;
    }

    render() {
        const wrapper = document.createElement("div");
        wrapper.className = "firma-block";

        const grid = document.createElement("div");
        grid.className = "firma-grid";

        wrapper.append(grid);
        this.wrapper = wrapper;
        this.grid = grid;
        this.dateField = null;
        if (this.date !== null) {
            this.addDate(this.date);
        }
        this.signatures.forEach(signature => this.appendSignature(signature));
        return wrapper;
    }

    renderSettings() {
        const count = this.grid.children.length;
        return [
            this.dateField
                ? {
                    icon: '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
                    title: "Quitar fecha",
                    closeOnActivate: true,
                    onActivate: () => {
                        this.dateField.remove();
                        this.dateField = null;
                        this.block.dispatchChange();
                    }
                }
                : {
                    icon: '<svg width="12" height="12" viewBox="0 0 16 16"><rect x="2.5" y="3.5" width="11" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
                    title: "Añadir fecha",
                    closeOnActivate: true,
                    onActivate: () => {
                        this.addDate(formatSignatureDate(new Date()));
                        this.dateField.querySelector(".firma-date-value").focus();
                        this.block.dispatchChange();
                    }
                },
            {
                icon: '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M8 4v8M4 8h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
                title: "Añadir firma",
                isDisabled: count >= SIGNATURE_MAX,
                closeOnActivate: true,
                onActivate: () => {
                    this.addSignature();
                    this.block.dispatchChange();
                }
            },
            {
                icon: '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
                title: "Quitar última firma",
                isDisabled: count <= 1,
                closeOnActivate: true,
                onActivate: () => {
                    this.grid.lastElementChild.remove();
                    this.block.dispatchChange();
                }
            }
        ];
    }

    addSignature() {
        if (this.grid.children.length >= SIGNATURE_MAX) {
            return;
        }
        this.appendSignature({ label: SIGNATURE_DEFAULT_LABEL, name: "" });
        this.grid.lastElementChild.querySelector(".firma-name").focus();
    }

    addDate(value) {
        const field = document.createElement("div");
        field.className = "firma-date";

        const label = document.createElement("div");
        label.className = "firma-date-label";
        label.textContent = "FECHA / DATA";

        const date = document.createElement("div");
        date.className = "firma-date-value";
        date.contentEditable = "true";
        date.setAttribute("role", "textbox");
        date.setAttribute("aria-label", "Fecha de la firma");
        date.dataset.placeholder = "DD / MM / AAAA";
        date.textContent = value;

        field.append(label, date);
        this.wrapper.prepend(field);
        this.dateField = field;
    }

    appendSignature(signature) {
        const number = this.grid.children.length + 1;
        const item = document.createElement("div");
        item.className = "firma";

        const label = document.createElement("div");
        label.className = "firma-label";
        label.contentEditable = "true";
        label.setAttribute("role", "textbox");
        label.setAttribute("aria-label", `Encabezado de la firma ${number}`);
        label.dataset.placeholder = SIGNATURE_DEFAULT_LABEL;
        label.textContent = signature.label;

        const name = document.createElement("div");
        name.className = "firma-name";
        name.contentEditable = "true";
        name.setAttribute("role", "textbox");
        name.setAttribute("aria-label", `Nombre de la firma ${number}`);
        name.dataset.placeholder = "NOMBRE Y APELLIDOS";
        name.textContent = signature.name;

        const space = document.createElement("div");
        space.className = "firma-space";

        item.append(label, name, space);
        this.grid.append(item);
    }

    save() {
        const data = {
            signatures: Array.from(this.grid.children, item => ({
                label: item.querySelector(".firma-label").textContent.trim(),
                name: item.querySelector(".firma-name").textContent.trim()
            }))
        };
        if (this.dateField) {
            data.date = this.dateField.querySelector(".firma-date-value").textContent.trim();
        }
        return data;
    }
}

const LIST_MAX_COLUMNS = 3;

// Lista repartida en 1 a 3 columnas (dato columns). Se llenan de arriba abajo con
// ceil(elementos / columnas) filas, así que con 7 elementos en 3 columnas quedan 3 · 3 · 1.
// El CSS usa siempre 3 columnas; con 2, un salto final (data-columns) deja vacía la tercera.
class ListTool extends List {
    constructor(options) {
        super(options);
        const columns = Number(options.data && options.data.columns);
        this.columns = Number.isInteger(columns) ? Math.min(Math.max(columns, 1), LIST_MAX_COLUMNS) : 1;
        this.block = options.block;
    }

    render() {
        const wrapper = super.render();
        this.observeColumns();
        return wrapper;
    }

    // Cambiar entre viñetas y numerada sustituye el ul/ol por uno nuevo.
    toggleTune(style) {
        super.toggleTune(style);
        this.observeColumns();
    }

    observeColumns() {
        if (this.columnObserver) {
            this.columnObserver.disconnect();
        }
        this.columnObserver = new MutationObserver(() => this.updateColumns());
        this.columnObserver.observe(this._elements.wrapper, { childList: true });
        this.updateColumns();
    }

    updateColumns() {
        const wrapper = this._elements.wrapper;
        wrapper.classList.toggle("cdx-list--columns", this.columns > 1);
        if (this.columns > 1) {
            wrapper.dataset.columns = this.columns;
        } else {
            delete wrapper.dataset.columns;
        }
        // Se recorre la lista entera: al pulsar Intro, el navegador copia los atributos del li anterior.
        const items = wrapper.querySelectorAll(`.${this.CSS.item}`);
        const rows = Math.max(Math.ceil(items.length / this.columns), 1);
        items.forEach((item, index) => {
            item.toggleAttribute("data-column-start", this.columns > 1 && index > 0 && index % rows === 0);
        });
    }

    renderSettings() {
        return [
            ...super.renderSettings(),
            {
                icon: '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M8 4v8M4 8h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
                title: "Añadir columna",
                isDisabled: this.columns >= LIST_MAX_COLUMNS,
                closeOnActivate: true,
                onActivate: () => {
                    this.columns += 1;
                    this.updateColumns();
                    this.block.dispatchChange();
                }
            },
            {
                icon: '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
                title: "Quitar columna",
                isDisabled: this.columns <= 1,
                closeOnActivate: true,
                onActivate: () => {
                    this.columns -= 1;
                    this.updateColumns();
                    this.block.dispatchChange();
                }
            }
        ];
    }

    save() {
        const data = { ...super.save() };
        if (this.columns > 1) {
            data.columns = this.columns;
        }
        return data;
    }
}

// Encabezado H2 con una segunda línea opcional en otro idioma (dato translation), que se activa
// con «Bilingüe» en el menú del bloque. Al desactivarlo, la segunda línea se borra.
class HeaderTool extends Header {
    constructor(options) {
        super(options);
        const translation = options.data && options.data.translation;
        this.translation = typeof translation === "string" ? translation : null;
        this.block = options.block;
    }

    static get sanitize() {
        return { ...super.sanitize, translation: {} };
    }

    render() {
        this.wrapper = document.createElement("div");
        this.wrapper.className = "ce-header-block";
        this.wrapper.append(super.render());
        if (this.translation !== null) {
            this.addTranslation(this.translation);
        }
        return this.wrapper;
    }

    addTranslation(value = "") {
        const line = document.createElement("div");
        line.className = "ce-header-translation";
        line.contentEditable = this.readOnly ? "false" : "true";
        line.setAttribute("role", "textbox");
        line.setAttribute("aria-label", "Traducción del encabezado");
        line.dataset.placeholder = "Valencià";
        line.innerHTML = value;
        this.wrapper.append(line);
        this.wrapper.classList.add("is-bilingual");
        this.translationLine = line;
    }

    removeTranslation() {
        this.translationLine.remove();
        this.translationLine = null;
        this.wrapper.classList.remove("is-bilingual");
    }

    renderSettings() {
        const bilingual = Boolean(this.translationLine);
        return [
            {
                icon: super.renderSettings()[0].icon,
                label: "Encabezado",
                isActive: !bilingual,
                closeOnActivate: true,
                onActivate: () => {
                    if (this.translationLine) {
                        this.removeTranslation();
                        this.block.dispatchChange();
                    }
                }
            },
            {
                icon: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M6 8h12M6 16h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
                label: "Bilingüe",
                isActive: bilingual,
                closeOnActivate: true,
                onActivate: () => {
                    if (!this.translationLine) {
                        this.addTranslation();
                        this.translationLine.focus();
                        this.block.dispatchChange();
                    }
                }
            }
        ];
    }

    // Header guarda el innerHTML del elemento que recibe, que aquí sería el contenedor.
    save() {
        const data = super.save(this._element);
        if (this.translationLine) {
            data.translation = this.translationLine.innerHTML;
        }
        return data;
    }
}

// Stretch/Collapse no tienen efecto: el CSS ya quita el max-width a todos los bloques.
// Se ocultan del menú de la tabla; para recuperarlas, pon TABLE_SHOW_STRETCH a true.
const TABLE_SHOW_STRETCH = false;
const TABLE_MAX_COLUMNS = 10;
const TABLE_COLUMN_STEP = 5;
const TABLE_COLUMN_MIN = 5;

// Anchos de columna en porcentaje (colWidths). Sin colWidths, las columnas se reparten por igual.
// Los bordes se arrastran desde .tc-col-resizers, que se superpone a la tabla en .tc-wrap.
class TableTool extends Table {
    constructor(options) {
        super(options);
        const widths = options.data && options.data.colWidths;
        this.colWidths = Array.isArray(widths) && widths.every(width => Number(width) > 0)
            ? widths.map(Number)
            : null;
    }

    render() {
        const container = super.render();
        const table = this.table;
        if (this.colWidths && this.colWidths.length !== table.numberOfColumns) {
            this.colWidths = null;
        }

        const addColumn = table.addColumn.bind(table);
        table.addColumn = (...args) => {
            const count = table.numberOfColumns;
            addColumn(...args);
            if (table.numberOfColumns !== count) {
                this.colWidths = null;
                this.updateColumnWidths();
            }
        };

        // La columna eliminada cede su ancho a la de la derecha (o a la de la izquierda si es la última).
        const deleteColumn = table.deleteColumn.bind(table);
        table.deleteColumn = index => {
            if (this.colWidths && this.colWidths.length > 1) {
                const neighbor = index < this.colWidths.length ? index : index - 2;
                this.colWidths[neighbor] += this.colWidths[index - 1];
                this.colWidths.splice(index - 1, 1);
            }
            deleteColumn(index);
            this.updateColumnWidths();
        };

        // El icono de columna de la librería se coloca suponiendo columnas iguales y una tabla
        // que deja libre la columna de «añadir columna»; aquí la tabla ocupa todo el ancho.
        const updateToolboxesPosition = table.updateToolboxesPosition.bind(table);
        table.updateToolboxesPosition = (...args) => {
            updateToolboxesPosition(...args);
            const column = table.hoveredColumn;
            const widths = this.currentWidths();
            if (!table.isColumnMenuShowing && column > 0 && column <= widths.length) {
                const center = this.columnEdges(widths)[column - 1] + widths[column - 1] / 2;
                table.toolboxColumn.element.style.left = `${center}%`;
            }
        };

        if (!this.readOnly) {
            this.resizers = document.createElement("div");
            this.resizers.className = "tc-col-resizers";
            table.getWrapper().appendChild(this.resizers);
        }
        this.updateColumnWidths();
        return container;
    }

    renderSettings() {
        const settings = super.renderSettings();
        settings.push({
            icon: '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M2.5 3.5h11v9h-11zM6.2 3.5v9M9.8 3.5v9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
            title: "Igualar columnas",
            isDisabled: !this.colWidths,
            closeOnActivate: true,
            onActivate: () => {
                this.colWidths = null;
                this.updateColumnWidths();
                this.block.dispatchChange();
            }
        });
        if (TABLE_SHOW_STRETCH) {
            return settings;
        }
        const stretchLabels = [this.api.i18n.t("Stretch"), this.api.i18n.t("Collapse")];
        return settings.filter(item => !stretchLabels.includes(item.label));
    }

    onPaste(event) {
        this.colWidths = null;
        super.onPaste(event);
    }

    save() {
        const data = super.save();
        if (this.colWidths) {
            data.colWidths = this.colWidths.map(width => Math.round(width * 100) / 100);
        }
        return data;
    }

    currentWidths() {
        const count = this.table.numberOfColumns;
        return this.colWidths || Array.from({ length: count }, () => 100 / count);
    }

    // Posición izquierda (en %) de cada columna.
    columnEdges(widths = this.currentWidths()) {
        let left = 0;
        return widths.map(width => {
            const edge = left;
            left += width;
            return edge;
        });
    }

    updateColumnWidths() {
        this.applyColumnTemplate(this.colWidths);
        this.renderResizers();
    }

    applyColumnTemplate(widths) {
        const table = this.table.table;
        if (widths) {
            table.style.setProperty("--table-columns", widths.map(width => `minmax(0, ${width}fr)`).join(" "));
        } else {
            table.style.removeProperty("--table-columns");
        }
    }

    renderResizers() {
        if (!this.resizers) {
            return;
        }
        const widths = this.currentWidths();
        const edges = this.columnEdges(widths);
        this.resizers.replaceChildren();
        for (let index = 1; index < widths.length; index++) {
            const handle = document.createElement("div");
            handle.className = "tc-col-resizer";
            handle.style.left = `${edges[index]}%`;
            handle.addEventListener("pointerdown", event => this.startResize(event, index - 1));
            this.resizers.appendChild(handle);
        }
    }

    // Arrastra el borde derecho de la columna `index`: solo cambian esa columna y la siguiente,
    // y el borde se ajusta a múltiplos de TABLE_COLUMN_STEP.
    startResize(event, index) {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        const widths = this.currentWidths().slice();
        const start = this.columnEdges(widths)[index];
        const end = start + widths[index] + widths[index + 1];
        const min = Math.ceil((start + TABLE_COLUMN_MIN) / TABLE_COLUMN_STEP) * TABLE_COLUMN_STEP;
        const max = Math.floor((end - TABLE_COLUMN_MIN) / TABLE_COLUMN_STEP) * TABLE_COLUMN_STEP;
        if (min > max) {
            return;
        }

        const handle = event.currentTarget;
        const rect = this.table.table.getBoundingClientRect();
        const label = document.createElement("div");
        label.className = "tc-col-resizer-label";
        handle.classList.add("is-dragging");
        handle.appendChild(label);
        handle.setPointerCapture(event.pointerId);
        let changed = false;
        const updateLabel = () => {
            label.textContent = `${Math.round(widths[index])} % | ${Math.round(widths[index + 1])} %`;
        };

        const move = moveEvent => {
            const position = (moveEvent.clientX - rect.left) / rect.width * 100;
            const edge = Math.min(max, Math.max(min, Math.round(position / TABLE_COLUMN_STEP) * TABLE_COLUMN_STEP));
            if (Math.abs(edge - (start + widths[index])) > 0.001) {
                widths[index] = edge - start;
                widths[index + 1] = end - edge;
                this.colWidths = widths.slice();
                changed = true;
                this.applyColumnTemplate(widths);
                handle.style.left = `${edge}%`;
            }
            updateLabel();
        };

        const stop = () => {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
            this.renderResizers();
            if (changed) {
                this.block.dispatchChange();
            }
        };

        updateLabel();
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", stop);
        handle.addEventListener("pointercancel", stop);
    }
}

function formatSignatureDate(date) {
    const pad = number => String(number).padStart(2, "0");
    return `${pad(date.getDate())} / ${pad(date.getMonth() + 1)} / ${date.getFullYear()}`;
}

class DatosTool {
    static get toolbox() {
        return {
            title: "Datos",
            icon: '<svg width="18" height="18" viewBox="0 0 20 20"><rect x="2.5" y="4" width="15" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.6 8h10.8M4.6 12h10.8M6 4v12M10 4v12M14 4v12" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>'
        };
    }

    constructor({ data }) {
        this.cells = Array.isArray(data && data.cells)
            ? data.cells.map(cell => {
                const value = cell && typeof cell === "object" ? cell : {};
                return {
                    header: typeof value.header === "string" ? value.header : "",
                    content: typeof value.content === "string" ? value.content : "",
                    span: Math.min(6, Math.max(1, Math.floor(Number(value.span) || 1)))
                };
            })
            : Array.from({ length: 7 }, () => ({ header: "", content: "", span: 1 }));
        this.activeMenu = null;
        this.handleOutsidePointer = event => {
            if (this.activeMenu &&
                !this.activeMenu.menu.contains(event.target) &&
                !this.activeMenu.toggle.contains(event.target)) {
                this.closeMenu();
            }
        };
        this.handleEscape = event => {
            const activeMenu = this.activeMenu;
            if (event.key === "Escape" && activeMenu) {
                this.closeMenu();
                activeMenu.toggle.focus();
            }
        };
    }

    render() {
        const wrapper = document.createElement("div");
        wrapper.className = "datos-block";

        const grid = document.createElement("div");
        grid.className = "datos-grid";
        this.grid = grid;
        this.gridResizeObserver = new ResizeObserver(() => this.updateRowStarts());
        this.gridResizeObserver.observe(grid);

        this.cells.forEach(cell => this.appendCell(cell));

        wrapper.append(grid);
        return wrapper;
    }

    addCell() {
        const cell = { header: "", content: "", span: 1 };
        this.cells.push(cell);
        this.appendCell(cell);
        this.grid.lastElementChild.querySelector(".datos-cell-header").focus();
    }

    appendCell(cell) {
        const field = document.createElement("div");
        field.className = "datos-cell";

        const controls = document.createElement("div");
        controls.className = "datos-cell-controls";

        const cellNumber = this.grid.children.length + 1;
        const toggle = document.createElement("button");
        toggle.className = "datos-cell-menu-toggle";
        toggle.type = "button";
        toggle.setAttribute("aria-label", `Opciones de la celda ${cellNumber}`);
        toggle.setAttribute("aria-haspopup", "true");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2.6" d="M9.41 9.66H9.4"></path><path stroke="currentColor" stroke-linecap="round" stroke-width="2.6" d="M14.6 9.66H14.59"></path><path stroke="currentColor" stroke-linecap="round" stroke-width="2.6" d="M9.31 14.36H9.3"></path><path stroke="currentColor" stroke-linecap="round" stroke-width="2.6" d="M14.6 14.36H14.59"></path></svg>';

        const menu = document.createElement("div");
        menu.className = "datos-cell-menu";
        menu.setAttribute("role", "group");
        menu.setAttribute("aria-label", `Ancho de la celda ${cellNumber}`);
        menu.hidden = true;

        const widths = document.createElement("div");
        widths.className = "datos-cell-widths";
        for (let span = 1; span <= 6; span += 1) {
            const option = document.createElement("button");
            option.className = "datos-cell-width";
            option.type = "button";
            option.textContent = String(span);
            option.setAttribute("aria-label", `${span} ${span === 1 ? "columna" : "columnas"}`);
            option.addEventListener("click", () => {
                cell.span = span;
                this.updateCellSize(field, cell);
                this.closeMenu();
                toggle.focus();
            });
            widths.append(option);
        }

        const deleteButton = document.createElement("button");
        deleteButton.className = "datos-cell-delete";
        deleteButton.type = "button";
        deleteButton.innerHTML = '<span aria-hidden="true">×</span><span>Eliminar celda</span>';
        deleteButton.setAttribute("aria-label", `Eliminar celda ${cellNumber}`);
        deleteButton.addEventListener("click", () => {
            const cellIndex = Array.from(this.grid.children).indexOf(field);
            const nextField = field.nextElementSibling || field.previousElementSibling;
            this.cells.splice(cellIndex, 1);
            this.closeMenu();
            field.remove();
            this.updateRowStarts();
            this.updateCellLabels();
            if (nextField) {
                nextField.querySelector(".datos-cell-menu-toggle").focus();
            } else {
                this.grid.closest(".ce-block").querySelector(".ce-toolbar__settings-btn").focus();
            }
        });
        menu.append(widths, deleteButton);
        toggle.addEventListener("click", () => {
            if (this.activeMenu && this.activeMenu.toggle === toggle) {
                this.closeMenu();
                return;
            }

            this.closeMenu();
            menu.hidden = false;
            menu.classList.add("datos-cell-menu--opened");
            toggle.setAttribute("aria-expanded", "true");
            this.activeMenu = { menu, toggle };
            document.addEventListener("pointerdown", this.handleOutsidePointer);
            document.addEventListener("keydown", this.handleEscape, true);
        });

        const header = this.createCellField("header", cell.header, cellNumber);
        const content = this.createCellField("content", cell.content, cellNumber);

        controls.append(toggle, menu);
        field.append(controls, header, content);
        this.grid.append(field);
        this.updateCellSize(field, cell);
    }

    createCellField(type, value, cellNumber) {
        const field = document.createElement("div");
        field.className = `datos-cell-${type}`;
        field.contentEditable = "true";
        field.setAttribute("role", "textbox");
        field.setAttribute("aria-multiline", "false");
        field.dataset.placeholder = "TEXT";
        field.textContent = value;
        field.setAttribute(
            "aria-label",
            `${type === "header" ? "Encabezado" : "Contenido"} de la celda ${cellNumber}`
        );
        field.addEventListener("input", () => {
            const cell = this.cells[Array.from(this.grid.children).indexOf(field.parentElement)];
            if (cell) {
                cell[type] = field.textContent;
            }
        });
        return field;
    }

    closeMenu() {
        if (!this.activeMenu) {
            return;
        }
        this.activeMenu.menu.hidden = true;
        this.activeMenu.menu.classList.remove("datos-cell-menu--opened");
        this.activeMenu.toggle.setAttribute("aria-expanded", "false");
        this.activeMenu = null;
        document.removeEventListener("pointerdown", this.handleOutsidePointer);
        document.removeEventListener("keydown", this.handleEscape, true);
    }

    destroy() {
        this.closeMenu();
        this.gridResizeObserver.disconnect();
    }

    updateCellSize(field, cell) {
        field.style.gridColumn = `span ${cell.span}`;
        field.dataset.span = String(cell.span);
        field.querySelectorAll(".datos-cell-width").forEach((option, index) => {
            const selected = index + 1 === cell.span;
            option.classList.toggle("is-selected", selected);
            option.setAttribute("aria-pressed", String(selected));
        });
        this.updateRowStarts();
    }

    updateRowStarts() {
        const positions = Array.from(this.grid.children, field => {
            const { top, left } = field.getBoundingClientRect();
            return { field, top, left };
        });

        positions.forEach(({ field }) => field.classList.remove("is-row-start"));

        let rowTop = null;
        let row = [];
        const markRowStart = () => {
            if (row.length) {
                row.reduce((leftmost, position) =>
                    position.left < leftmost.left ? position : leftmost
                ).field.classList.add("is-row-start");
            }
        };

        positions.forEach(position => {
            if (row.length && Math.abs(position.top - rowTop) > 1) {
                markRowStart();
                row = [];
            }
            if (!row.length) {
                rowTop = position.top;
            }
            row.push(position);
        });
        markRowStart();
    }

    updateCellLabels() {
        Array.from(this.grid.children).forEach((field, index) => {
            const toggle = field.querySelector(".datos-cell-menu-toggle");
            const menu = field.querySelector(".datos-cell-menu");
            const deleteButton = field.querySelector(".datos-cell-delete");
            toggle.setAttribute("aria-label", `Opciones de la celda ${index + 1}`);
            menu.setAttribute("aria-label", `Ancho de la celda ${index + 1}`);
            deleteButton.setAttribute("aria-label", `Eliminar celda ${index + 1}`);
            field.querySelector(".datos-cell-header").setAttribute("aria-label", `Encabezado de la celda ${index + 1}`);
            field.querySelector(".datos-cell-content").setAttribute("aria-label", `Contenido de la celda ${index + 1}`);
        });
    }

    save() {
        return {
            cells: Array.from(this.grid.children).map(field => ({
                header: field.querySelector(".datos-cell-header").textContent,
                content: field.querySelector(".datos-cell-content").textContent,
                span: Number(field.dataset.span)
            }))
        };
    }
}

function readInitialDocument() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return {
                title: DEFAULT_TITLE,
                documentHeading: DEFAULT_DOCUMENT_HEADING,
                footerText: DEFAULT_FOOTER_TEXT,
                blocks: []
            };
        }

        const data = JSON.parse(stored);
        if (!data || typeof data.title !== "string" || !Array.isArray(data.blocks)) {
            throw new Error("El documento guardado tiene un formato no válido.");
        }

        return {
            title: data.title,
            titleMarkup: typeof data.titleMarkup === "string"
                ? data.titleMarkup
                : plainTextToTitleMarkup(data.title),
            documentHeading: typeof data.documentHeading === "string"
                ? data.documentHeading
                : DEFAULT_DOCUMENT_HEADING,
            footerText: typeof data.footerText === "string" ? data.footerText : DEFAULT_FOOTER_TEXT,
            blocks: data.blocks
        };
    } catch (error) {
        console.error("No se pudo recuperar el documento local:", error);
        return {
            title: DEFAULT_TITLE,
            documentHeading: DEFAULT_DOCUMENT_HEADING,
            footerText: DEFAULT_FOOTER_TEXT,
            blocks: [],
            error
        };
    }
}

const initialDocument = readInitialDocument();
const documentHeadingInput = document.getElementById("documentHeading");
const titleInput = document.getElementById("documentTitle");
const titleWeightToggle = document.getElementById("titleWeightToggle");
const titleWeightLabel = document.getElementById("titleWeightLabel");
const titleWeightPopover = document.getElementById("titleWeightPopover");
const titleEditor = document.querySelector(".document-title-editor");
const footerReference = document.getElementById("footerReference");
const breadcrumbTitle = document.getElementById("breadcrumbTitle");
const sidebarDocumentTitle = document.querySelector(".document-link-title");
const saveState = document.getElementById("saveState");
const saveStateText = document.getElementById("saveStateText");
const wordCount = document.getElementById("wordCount");
const toast = document.getElementById("toast");
const loadFileInput = document.getElementById("loadFileInput");
let saveTimer;
let toastTimer;
let activeTitleRange = null;

documentHeadingInput.value = initialDocument.documentHeading;
setTitleContent(initialDocument.title, initialDocument.titleMarkup);
resizeDocumentTitle();
footerReference.value = initialDocument.footerText;
document.getElementById("documentDate").textContent = new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "long",
    year: "numeric"
}).format(new Date()).toUpperCase();

function displayTitle(title) {
    const value = title.trim() || DEFAULT_TITLE;
    breadcrumbTitle.textContent = value;
    sidebarDocumentTitle.textContent = value;
    document.title = `${value} · Oficina`;
}

function escapeTitleText(text) {
    return text.replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[character]);
}

function plainTextToTitleMarkup(text) {
    return text.split(/\r?\n/).map(escapeTitleText).join("<br>");
}

function sanitizeTitleMarkup(markup) {
    const parsed = new DOMParser().parseFromString(markup, "text/html");
    const serialize = node => {
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeTitleText(node.textContent).replace(/\r?\n/g, "<br>");
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return "";
        }

        const content = Array.from(node.childNodes, serialize).join("");
        if (node.tagName === "BR") {
            return "<br>";
        }
        if (node.tagName === "SPAN" && TITLE_FONT_WEIGHTS.has(node.dataset.fontWeight)) {
            return `<span data-font-weight="${node.dataset.fontWeight}">${content}</span>`;
        }
        return content;
    };

    return Array.from(parsed.body.childNodes, serialize).join("");
}

function getTitleText() {
    return (titleInput.innerText || titleInput.textContent || "").replace(/\u00a0/g, " ").replace(/\r/g, "").replace(/\n+$/, "");
}

function setTitleContent(text, markup = null) {
    titleInput.innerHTML = sanitizeTitleMarkup(markup || plainTextToTitleMarkup(text));
}

function resizeDocumentTitle() {
    titleInput.style.height = "auto";
    titleInput.style.height = `${titleInput.scrollHeight}px`;
}

window.addEventListener("resize", resizeDocumentTitle);

function updateTitleSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
        activeTitleRange = null;
        titleEditor.classList.toggle("has-selection", !titleWeightPopover.hidden);
        return;
    }

    const range = selection.getRangeAt(0);
    if (!titleInput.contains(range.commonAncestorContainer)) {
        activeTitleRange = null;
        titleEditor.classList.toggle("has-selection", !titleWeightPopover.hidden);
        return;
    }

    activeTitleRange = range.cloneRange();
    titleEditor.classList.add("has-selection");
    const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer
        : range.startContainer.parentElement;
    const weightSpan = startElement && startElement.closest("[data-font-weight]");
    const currentWeight = weightSpan && TITLE_FONT_WEIGHTS.has(weightSpan.dataset.fontWeight)
        ? weightSpan.dataset.fontWeight
        : DEFAULT_TITLE_FONT_WEIGHT;
    titleWeightLabel.textContent = currentWeight;
    titleWeightPopover.querySelectorAll("[data-title-weight]").forEach(option => {
        option.setAttribute("aria-pressed", String(option.dataset.titleWeight === currentWeight));
    });
}

document.addEventListener("selectionchange", updateTitleSelection);

function closeTitleWeightPopover(restoreFocus = false) {
    titleWeightPopover.hidden = true;
    titleWeightToggle.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", handleTitleWeightOutsidePointer);
    document.removeEventListener("keydown", handleTitleWeightEscape, true);
    if (restoreFocus) {
        titleWeightToggle.focus();
    }
}

function handleTitleWeightOutsidePointer(event) {
    if (!titleWeightPopover.contains(event.target) && !titleWeightToggle.contains(event.target)) {
        closeTitleWeightPopover();
    }
}

function handleTitleWeightEscape(event) {
    if (event.key === "Escape" && !titleWeightPopover.hidden) {
        closeTitleWeightPopover(true);
    }
}

titleWeightToggle.addEventListener("click", () => {
    if (!activeTitleRange) {
        return;
    }
    const isOpening = titleWeightPopover.hidden;
    titleWeightPopover.hidden = !isOpening;
    titleWeightToggle.setAttribute("aria-expanded", String(isOpening));
    if (isOpening) {
        document.addEventListener("pointerdown", handleTitleWeightOutsidePointer);
        document.addEventListener("keydown", handleTitleWeightEscape, true);
    } else {
        closeTitleWeightPopover();
    }
});

titleWeightToggle.addEventListener("mousedown", event => event.preventDefault());

titleWeightPopover.querySelectorAll("[data-title-weight]").forEach(option => {
    option.addEventListener("mousedown", event => event.preventDefault());
    option.addEventListener("click", () => {
        if (!activeTitleRange || !titleInput.contains(activeTitleRange.commonAncestorContainer)) {
            closeTitleWeightPopover();
            return;
        }

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(activeTitleRange);
        const selectedContent = activeTitleRange.extractContents();
        selectedContent.querySelectorAll("[data-font-weight]").forEach(span => {
            span.removeAttribute("data-font-weight");
        });
        const formattedText = document.createElement("span");
        formattedText.dataset.fontWeight = option.dataset.titleWeight;
        formattedText.append(selectedContent);
        activeTitleRange.insertNode(formattedText);
        const formattedRange = document.createRange();
        formattedRange.selectNodeContents(formattedText);
        selection.removeAllRanges();
        selection.addRange(formattedRange);
        activeTitleRange = formattedRange.cloneRange();
        titleWeightLabel.textContent = option.dataset.titleWeight;
        titleWeightPopover.querySelectorAll("[data-title-weight]").forEach(weightOption => {
            weightOption.setAttribute(
                "aria-pressed",
                String(weightOption.dataset.titleWeight === option.dataset.titleWeight)
            );
        });
        closeTitleWeightPopover();
        resizeDocumentTitle();
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
});

titleInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        if (document.execCommand("insertLineBreak")) {
            titleInput.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
            const selection = window.getSelection();
            if (selection && selection.rangeCount) {
                const lineBreak = document.createElement("br");
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(lineBreak);
                range.setStartAfter(lineBreak);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                titleInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
    }
});

titleInput.addEventListener("paste", event => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
        return;
    }
    const range = selection.getRangeAt(0);
    const currentLength = getTitleText().length;
    const selectedLength = titleInput.contains(range.commonAncestorContainer) ? range.toString().length : 0;
    const remainingLength = Math.max(
        0,
        Number(titleInput.dataset.maxlength) - currentLength + selectedLength
    );
    const text = pastedText.slice(0, remainingLength);
    const fragment = document.createDocumentFragment();
    text.split(/\r?\n/).forEach((line, index) => {
        if (index) {
            fragment.append(document.createElement("br"));
        }
        fragment.append(document.createTextNode(line));
    });
    range.deleteContents();
    range.insertNode(fragment);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
});

function setSaveState(label, state = "") {
    saveStateText.textContent = label;
    saveState.classList.toggle("is-saving", state === "saving");
    saveState.classList.toggle("is-error", state === "error");
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function countWords(blocks) {
    const text = blocks.map(block => {
        const data = block.data || {};
        switch (block.type) {
            case "paragraph":
                return data.text || "";
            case "header":
                return `${data.text || ""} ${data.translation || ""}`;
            case "list":
                return Array.isArray(data.items) ? data.items.map(item =>
                    typeof item === "string" ? item : item.content || ""
                ).join(" ") : "";
            case "table":
                return Array.isArray(data.content) ? data.content.flat().join(" ") : "";
            case "signature":
                return Array.isArray(data.signatures)
                    ? data.signatures.map(signature => signature && `${signature.label || ""} ${signature.name || ""}`).join(" ") +
                        (typeof data.date === "string" ? ` FECHA / DATA ${data.date}` : "")
                    : "";
            case "datos":
                return Array.isArray(data.cells)
                    ? data.cells.map(cell => cell && `${cell.header || ""} ${cell.content || ""}`).join(" ")
                    : "";
            default:
                return "";
        }
    }).join(" ");
    const plainText = new DOMParser().parseFromString(text, "text/html").body.textContent || "";
    const words = plainText.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || [];
    wordCount.textContent = `${words.length} ${words.length === 1 ? "palabra" : "palabras"}`;
}

function storeDocument(blocks) {
    const data = {
        version: 1,
        title: getTitleText().trim() || DEFAULT_TITLE,
        titleMarkup: sanitizeTitleMarkup(titleInput.innerHTML),
        documentHeading: documentHeadingInput.value,
        footerText: footerReference.value,
        updatedAt: new Date().toISOString(),
        blocks
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    displayTitle(data.title);
    countWords(blocks);
    setSaveState("Copia local actualizada");
}

const editor = new EditorJS({
    holder: "editor",
    placeholder: "Empieza a escribir o pulsa + para añadir un bloque…",
    minHeight: 120,
    inlineToolbar: true,
    tools: {
        header: {
            class: HeaderTool,
            inlineToolbar: true,
            config: { levels: [2], defaultLevel: 2 }
        },
        paragraph: {
            class: Paragraph,
            inlineToolbar: true
        },
        list: {
            class: ListTool,
            inlineToolbar: true
        },
        addCell: AddCellTune,
        table: {
            class: TableTool,
            inlineToolbar: true,
            config: { rows: 2, cols: 2, maxcols: TABLE_MAX_COLUMNS }
        },
        datos: {
            class: DatosTool,
            tunes: ["addCell"]
        },
        signature: SignatureTool
    },
    data: { blocks: initialDocument.blocks },
    onChange() {
        schedulePagination();
        setSaveState("Actualizando…", "saving");
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            try {
                const output = await editor.save();
                storeDocument(output.blocks);
            } catch (error) {
                console.error("No se pudo guardar el documento:", error);
                setSaveState("Error en la copia local", "error");
                showToast("No se pudo guardar. Comprueba el almacenamiento disponible.");
            }
        }, 650);
    }
});

window.editorInstance = editor;
displayTitle(initialDocument.title);

editor.isReady.then(() => {
    countWords(initialDocument.blocks);
    setSaveState("Copia local actualizada");
    if (initialDocument.error) {
        setSaveState("No se pudo recuperar", "error");
        showToast("No se pudo recuperar el documento local. Puedes cargar una copia JSON.");
    } else if (!localStorage.getItem(STORAGE_KEY)) {
        storeDocument(initialDocument.blocks);
    }
}).catch(error => {
    console.error("No se pudo iniciar Editor.js:", error);
    setSaveState("Error al iniciar el editor", "error");
    showToast("No se pudo cargar el editor. Recarga la página e inténtalo de nuevo.");
});

function addBlock(type, level = 2) {
    const blockData = {
        paragraph: { text: "" },
        header: { text: "", level },
        list: { style: "unordered", items: [""] },
        table: { withHeadings: true, content: [["", ""], ["", ""]] },
        datos: { cells: Array.from({ length: 7 }, () => ({ header: "", content: "", span: 1 })) },
        signature: { signatures: [{ label: SIGNATURE_DEFAULT_LABEL, name: "" }] }
    };

    if (!SUPPORTED_BLOCKS.has(type)) {
        throw new Error(`Tipo de bloque no soportado: ${type}`);
    }

    editor.isReady
        .then(() => editor.blocks.insert(type, blockData[type]))
        .catch(error => {
            console.error("No se pudo insertar el bloque:", error);
            showToast("No se pudo añadir el bloque.");
        });
}

document.querySelectorAll("[data-block]").forEach(button => {
    button.addEventListener("click", () => {
        addBlock(button.dataset.block, Number(button.dataset.level) || 2);
    });
});

documentHeadingInput.addEventListener("input", () => {
    setSaveState("Actualizando…", "saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            const output = await editor.save();
            storeDocument(output.blocks);
        } catch (error) {
            console.error("No se pudo guardar la línea superior del título:", error);
            setSaveState("Error en la copia local", "error");
            showToast("No se pudo guardar. Comprueba el almacenamiento disponible.");
        }
    }, 650);
});

titleInput.addEventListener("input", () => {
    resizeDocumentTitle();
    displayTitle(getTitleText());
    setSaveState("Actualizando…", "saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            const output = await editor.save();
            storeDocument(output.blocks);
        } catch (error) {
            console.error("No se pudo guardar el título:", error);
            setSaveState("Error en la copia local", "error");
            showToast("No se pudo guardar. Comprueba el almacenamiento disponible.");
        }
    }, 650);
});

titleInput.addEventListener("beforeinput", event => {
    if (!event.inputType.startsWith("insert")) {
        return;
    }

    const selection = window.getSelection();
    const selectedLength = selection && selection.rangeCount &&
        titleInput.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.getRangeAt(0).toString().length
        : 0;
    const insertedLength = event.data ? event.data.length : 1;
    if (getTitleText().length - selectedLength + insertedLength > Number(titleInput.dataset.maxlength)) {
        event.preventDefault();
    }
});

function validateDocument(data) {
    const blocks = data && data.blocks;
    if (!Array.isArray(blocks)) {
        throw new Error("El JSON no contiene una lista de bloques de Editor.js.");
    }

    for (const block of blocks) {
        if (!block || !SUPPORTED_BLOCKS.has(block.type) || !block.data || typeof block.data !== "object") {
            throw new Error("El archivo contiene un bloque no compatible o incompleto.");
        }
    }

    const title = typeof data.title === "string" ? data.title : DEFAULT_TITLE;
    const titleMarkup = typeof data.titleMarkup === "string"
        ? sanitizeTitleMarkup(data.titleMarkup)
        : plainTextToTitleMarkup(title);
    const documentHeading = typeof data.documentHeading === "string"
        ? data.documentHeading
        : DEFAULT_DOCUMENT_HEADING;
    const footerText = typeof data.footerText === "string"
        ? data.footerText
        : DEFAULT_FOOTER_TEXT;
    return { title, titleMarkup, documentHeading, footerText, blocks };
}

async function saveDocumentToFile() {
    const title = getTitleText().trim() || DEFAULT_TITLE;
    const fileName = `${title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-") || "documento"}.json`;
    let fileHandle = null;
    // El selector se abre antes de cualquier espera para no perder la activación del clic.
    if (typeof window.showSaveFilePicker === "function") {
        try {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: "Documento JSON", accept: { "application/json": [".json"] } }]
            });
        } catch (error) {
            if (error.name === "AbortError") return;
            console.warn("No se pudo abrir el selector de archivos; se usará la descarga:", error);
        }
    }
    try {
        await editor.isReady;
        const output = await editor.save();
        storeDocument(output.blocks);
        const payload = {
            app: "Oficina",
            version: 1,
            title,
            titleMarkup: sanitizeTitleMarkup(titleInput.innerHTML),
            documentHeading: documentHeadingInput.value,
            footerText: footerReference.value,
            updatedAt: new Date().toISOString(),
            blocks: output.blocks
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        if (fileHandle) {
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
        } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        showToast("Documento guardado como JSON.");
    } catch (error) {
        console.error("No se pudo guardar el documento:", error);
        setSaveState("Error al guardar", "error");
        showToast("No se pudo guardar el documento.");
    }
}

document.getElementById("saveButton").addEventListener("click", saveDocumentToFile);
document.getElementById("loadButton").addEventListener("click", () => loadFileInput.click());
document.getElementById("printButton").addEventListener("click", () => window.print());
loadFileInput.addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    try {
        const data = JSON.parse(await file.text());
        const loaded = validateDocument(data);
        if (!window.confirm("Cargar este archivo reemplazará el contenido de este documento. ¿Quieres continuar?")) {
            return;
        }

        await editor.isReady;
        await editor.render({ blocks: loaded.blocks });
        documentHeadingInput.value = loaded.documentHeading;
        setTitleContent(loaded.title, loaded.titleMarkup);
        titleWeightLabel.textContent = DEFAULT_TITLE_FONT_WEIGHT;
        titleWeightPopover.querySelectorAll("[data-title-weight]").forEach(option => {
            option.setAttribute("aria-pressed", String(option.dataset.titleWeight === DEFAULT_TITLE_FONT_WEIGHT));
        });
        resizeDocumentTitle();
        footerReference.value = loaded.footerText;
        displayTitle(getTitleText());
        const output = await editor.save();
        storeDocument(output.blocks);
        showToast("Documento cargado correctamente.");
    } catch (error) {
        console.error("No se pudo cargar el documento:", error);
        showToast(`No se pudo cargar: ${error.message}`);
    } finally {
        event.target.value = "";
    }
});

function createNewDocument() {
    if (!window.confirm("Se reemplazará el documento actual por uno nuevo. ¿Quieres continuar?")) {
        return;
    }

    editor.isReady.then(async () => {
        await editor.clear();
        documentHeadingInput.value = DEFAULT_DOCUMENT_HEADING;
        setTitleContent(DEFAULT_TITLE);
        titleWeightLabel.textContent = DEFAULT_TITLE_FONT_WEIGHT;
        titleWeightPopover.querySelectorAll("[data-title-weight]").forEach(option => {
            option.setAttribute("aria-pressed", String(option.dataset.titleWeight === DEFAULT_TITLE_FONT_WEIGHT));
        });
        resizeDocumentTitle();
        footerReference.value = DEFAULT_FOOTER_TEXT;
        displayTitle(DEFAULT_TITLE);
        storeDocument([]);
        showToast("Documento nuevo creado.");
    }).catch(error => {
        console.error("No se pudo crear un documento nuevo:", error);
        showToast("No se pudo crear el documento.");
    });
}

document.querySelector(".new-document-button").addEventListener("click", createNewDocument);

footerReference.addEventListener("input", () => {
    schedulePagination();
    setSaveState("Actualizando…", "saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            const output = await editor.save();
            storeDocument(output.blocks);
        } catch (error) {
            console.error("No se pudo guardar el pie del documento:", error);
            setSaveState("Error en la copia local", "error");
            showToast("No se pudo guardar. Comprueba el almacenamiento disponible.");
        }
    }, 650);
});

const documentPage = document.querySelector(".document-page");
const documentHeader = document.querySelector(".document-header");
const documentFooter = document.querySelector(".document-footer");
const editorHolder = document.getElementById("editor");
const pageLayer = document.getElementById("pageLayer");
const pageCount = document.getElementById("pageCount");
const documentPageNumber = document.getElementById("documentPageNumber");
let paginationFrame = 0;
let pageLayerKey = "";

function mmToPx(mm) {
    return mm * 96 / 25.4;
}

function schedulePagination() {
    cancelAnimationFrame(paginationFrame);
    paginationFrame = requestAnimationFrame(paginateDocument);
}

// Empuja a la página siguiente los bloques que no caben antes del pie. En pantalla el
// salto es un margen (--page-break); al imprimir, un salto forzado más --page-content-top.
function paginateDocument() {
    const gap = parseFloat(getComputedStyle(documentPage).getPropertyValue("--page-gap")) || 0;
    const pageHeight = mmToPx(PAGE_HEIGHT_MM);
    const pitch = pageHeight + gap;
    const pageTop = documentPage.getBoundingClientRect().top;
    const contentTop = documentHeader.getBoundingClientRect().bottom - pageTop +
        parseFloat(getComputedStyle(documentHeader).marginBottom);
    const contentBottom = documentFooter.getBoundingClientRect().top - pageTop - mmToPx(PAGE_FOOTER_SPACE_MM);
    const pageStart = page => page * pitch + contentTop;
    const pageEnd = page => page * pitch + contentBottom;

    // Posiciones sin los saltos actuales, para no tener que reiniciarlos y medir de nuevo.
    let appliedBreaks = 0;
    const positions = Array.from(editorHolder.querySelectorAll(".ce-block"), block => {
        if (block.dataset.pageBreak) {
            appliedBreaks += parseFloat(getComputedStyle(block).marginTop) || 0;
        }
        const { top, bottom } = block.getBoundingClientRect();
        return {
            block,
            top: top - pageTop - appliedBreaks,
            bottom: bottom - pageTop - appliedBreaks,
            isHeading: Boolean(block.querySelector(".ce-header")),
            pageBreak: ""
        };
    });

    let page = 0;
    let shift = 0;
    positions.forEach((position, index) => {
        const top = position.top + shift;
        const bottom = position.bottom + shift;
        const fitsInPage = bottom - top <= contentBottom - contentTop;
        if (bottom > pageEnd(page) && top > pageStart(page) && (fitsInPage || top >= pageEnd(page))) {
            // Un encabezado no se queda solo al final de la página: baja con su contenido.
            const previous = positions[index - 1];
            const target = previous && previous.isHeading && !previous.pageBreak &&
                previous.top + shift > pageStart(page) ? previous : position;
            const push = pageStart(page + 1) - (target.top + shift);
            target.pageBreak = `${push.toFixed(2)}px`;
            shift += push;
            page += 1;
        }
        while (position.bottom + shift > pageEnd(page)) {
            page += 1;
        }
    });

    positions.forEach(({ block, pageBreak }) => {
        if (pageBreak && block.dataset.pageBreak !== pageBreak) {
            block.dataset.pageBreak = pageBreak;
            block.style.setProperty("--page-break", pageBreak);
        } else if (!pageBreak && block.dataset.pageBreak) {
            delete block.dataset.pageBreak;
            block.style.removeProperty("--page-break");
        }
    });

    const pages = page + 1;
    documentPage.style.setProperty("--page-count", String(pages));
    documentPage.style.setProperty("--page-content-top", `${contentTop.toFixed(2)}px`);
    pageCount.textContent = `${pages} ${pages === 1 ? "página" : "páginas"}`;
    renderPageLayer(pages);
}

function formatPageNumber(page, pages) {
    return `PÁGINA ${page} DE ${pages}`;
}

function renderPageLayer(pages) {
    const key = `${pages}\n${footerReference.value}`;
    if (key === pageLayerKey) {
        return;
    }
    pageLayerKey = key;
    documentPageNumber.textContent = formatPageNumber(1, pages);

    const sheets = Array.from({ length: pages }, (_, index) => {
        const sheet = document.createElement("div");
        sheet.className = "page-sheet";
        sheet.style.setProperty("--page-index", String(index));
        if (index > 0) {
            const header = documentHeader.cloneNode(true);
            header.querySelector("img").alt = "";

            const footer = documentFooter.cloneNode(true);
            const reference = document.createElement("span");
            reference.className = "footer-reference";
            reference.textContent = footerReference.value;
            footer.querySelector(".footer-reference").replaceWith(reference);
            footer.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
            footer.querySelector(".document-page-number").textContent = formatPageNumber(index + 1, pages);

            sheet.append(header, footer);
        }
        return sheet;
    });
    pageLayer.replaceChildren(...sheets);
}

const paginationObserver = new ResizeObserver(schedulePagination);
[documentHeader, titleEditor, editorHolder, documentFooter].forEach(element => {
    paginationObserver.observe(element);
});

// En pantalla el documento puede ser más estrecho que A4: se recalculan los saltos
// con la geometría de impresión para que el PDF coincida con lo que se imprime.
window.addEventListener("beforeprint", () => {
    cancelAnimationFrame(paginationFrame);
    documentPage.classList.add("is-printing");
    paginateDocument();
});

window.addEventListener("afterprint", () => {
    documentPage.classList.remove("is-printing");
    schedulePagination();
});
