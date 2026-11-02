"""Prueba del deshacer/rehacer (editorjs-undo y patchUndo() en js/editor.js).

Abre el editor en Chrome sin ventana, usa los menús de los bloques y comprueba que
cada cambio se deshace con un solo Ctrl/Cmd+Z y se rehace con Ctrl/Cmd+Y. Cada caso
se prueba dos veces: haciendo clic en el bloque antes de abrir su menú y abriéndolo
solo con el ratón por encima (así el foco queda fuera del editor). También comprueba
que, tras «Cargar archivo» y «Documento nuevo», Ctrl+Z no vuelve al documento anterior.

Requisitos: Google Chrome y Playwright (pip3 install --user playwright).
Uso, con el servidor en marcha (py -3 -m http.server 8000):

    python3 tests/undo_test.py [URL]
"""

import copy
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000/index.html"
MOD = "Meta" if sys.platform == "darwin" else "Control"

BASE_BLOCKS = [
    {"type": "paragraph", "data": {"text": "Uno"}},
    {"type": "signature", "data": {"signatures": [{"label": "FIRMA", "name": "ANA"}]}},
    {"type": "header", "data": {"text": "TITULO", "level": 2}},
    {"type": "list", "data": {"style": "ordered", "items": ["a", "b", "c", "d"]}},
    {"type": "paragraph", "data": {"text": "Dos"}},
]
SIGNATURE, HEADER, LIST = 1, 2, 3
SAMPLE_DOCUMENT = Path(__file__).resolve().parent.parent / "docs" / "RESOLUCIÓN GENERAL.json"

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(("OK    " if ok else "FALLA ") + name + (f"  -> {detail}" if not ok and detail else ""))


def saved_blocks(page):
    return page.evaluate("async () => (await editorInstance.save()).blocks.map(b => ({type: b.type, data: b.data}))")


def load(page, blocks):
    page.evaluate("""async blocks => {
        await editorInstance.render({ blocks });
        await new Promise(resolve => setTimeout(resolve, 400));
        resetUndoHistory((await editorInstance.save()).blocks);
    }""", blocks)
    page.wait_for_timeout(300)


def use_menu(page, selector, item, click_first):
    if click_first:
        page.click(selector)
        page.wait_for_timeout(200)
    page.hover(selector)
    page.click(".ce-toolbar__settings-btn")
    page.wait_for_timeout(200)
    page.locator(".ce-popover--opened .ce-popover-item", has_text=item).first.click()
    # Espera al registro del complemento (200 ms) y a editor.save().
    page.wait_for_timeout(700)


def press(page, combo):
    page.keyboard.press(combo)
    page.wait_for_timeout(500)


def menu_case(page, name, index, selector, item, click_first, edit=None):
    blocks = copy.deepcopy(BASE_BLOCKS)
    if edit:
        edit(blocks[index]["data"])
    load(page, blocks)
    before = saved_blocks(page)[index]["data"]
    use_menu(page, selector, item, click_first)
    after = saved_blocks(page)[index]["data"]
    check(f"{name}: el menú cambia el bloque", before != after, f"{before} -> {after}")
    press(page, f"{MOD}+z")
    undone = saved_blocks(page)[index]["data"]
    check(f"{name}: un Ctrl+Z lo deshace", undone == before, f"esperado {before}, hay {undone}")
    press(page, f"{MOD}+y")
    redone = saved_blocks(page)[index]["data"]
    check(f"{name}: Ctrl+Y lo rehace", redone == after, f"esperado {after}, hay {redone}")


def typing_case(page):
    load(page, copy.deepcopy(BASE_BLOCKS))
    page.click(".ce-paragraph >> nth=0")
    page.keyboard.press("End")
    page.keyboard.type(" más texto")
    page.wait_for_timeout(700)
    press(page, f"{MOD}+z")
    text = saved_blocks(page)[0]["data"]["text"]
    check("Párrafo: Ctrl+Z deshace lo escrito", text == "Uno", text)


def replace_document_case(page, name, action, expected):
    load(page, copy.deepcopy(BASE_BLOCKS))
    page.click(".ce-paragraph >> nth=0")
    page.keyboard.type(" cambio")
    page.wait_for_timeout(700)
    action()
    page.wait_for_timeout(700)
    page.click(".ce-block >> nth=0")
    press(page, f"{MOD}+z")
    current = saved_blocks(page)
    check(f"{name}: carga el documento esperado", current == expected, f"hay {len(current)} bloques")
    check(f"{name}: Ctrl+Z no vuelve al documento anterior",
          page.evaluate("() => !undo.canUndo()") and current == expected)


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: message.type == "error" and errors.append(message.text))
        # Acepta los window.confirm() de «Cargar» y «Documento nuevo».
        page.on("dialog", lambda dialog: dialog.accept())
        page.goto(URL)
        page.wait_for_function("() => typeof undo !== 'undefined' && undo")

        for click_first in (True, False):
            mode = "con clic" if click_first else "sin clic"
            print(f"\n== Menú abierto {mode} en el bloque")
            menu_case(page, "Firma · añadir fecha", SIGNATURE, ".firma-name", "Añadir fecha", click_first)
            menu_case(page, "Firma · quitar fecha", SIGNATURE, ".firma-name", "Quitar fecha", click_first,
                      lambda data: data.update(date="01 / 01 / 2026"))
            menu_case(page, "Firma · añadir firma", SIGNATURE, ".firma-name", "Añadir firma", click_first)
            menu_case(page, "Firma · quitar última firma", SIGNATURE, ".firma-name", "Quitar última firma", click_first,
                      lambda data: data["signatures"].append({"label": "FIRMA", "name": "LUIS"}))
            menu_case(page, "Encabezado · bilingüe", HEADER, ".ce-header", "Bilingüe", click_first)
            menu_case(page, "Encabezado · monolingüe", HEADER, ".ce-header", "Monolingüe", click_first,
                      lambda data: data.update(translation="TITOL"))
            menu_case(page, "Lista · añadir columna", LIST, ".cdx-list__item", "Añadir columna", click_first)

        print()
        typing_case(page)
        sample = json.loads(SAMPLE_DOCUMENT.read_text(encoding="utf-8"))
        replace_document_case(page, "Cargar archivo",
                              lambda: page.set_input_files("#loadFileInput", str(SAMPLE_DOCUMENT)),
                              [{"type": b["type"], "data": b["data"]} for b in sample["blocks"]])
        replace_document_case(page, "Documento nuevo",
                              lambda: page.click(".new-document-button"), [])
        # El 404 del favicon.ico no tiene que ver con el editor.
        errors = [error for error in errors if "404" not in error]
        check("Sin errores en la consola", not errors, "; ".join(errors[:5]))
        browser.close()

    failures = results.count(False)
    print(f"\n{len(results) - failures}/{len(results)} correctas")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
