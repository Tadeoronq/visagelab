import ast
import os
import re
import sys
from pathlib import Path

CARPETAS_EXCLUIDAS = {
    ".git",
    "venv",
    ".venv",
    "__pycache__",
    "node_modules",
}

EXTENSIONES_PESADAS = {
    ".glb",
    ".gltf",
    ".fbx",
    ".obj",
    ".blend",
    ".zip",
    ".7z",
    ".rar",
    ".tar",
    ".gz",
    ".mp4",
    ".mov",
    ".avi",
    ".mp3",
    ".wav",
    ".exe",
    ".dll",
    ".iso",
    ".bin",
    ".pkl",
    ".h5",
    ".onnx",
}

EXTENSIONES_TEXTO = {
    ".py",
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".jsx",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".json",
    ".md",
    ".txt",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".cfg",
    ".env",
    ".gitignore",
    ".gitattributes",
    ".csv",
    ".xml",
    ".svg",
    ".sh",
    ".ps1",
    ".bat",
}

MAX_BYTES_LEER = 256 * 1024  # 256 KB


def formatear_tamano(bytes_len: int) -> str:
    if bytes_len < 1024:
        return f"{bytes_len} B"
    if bytes_len < 1024 * 1024:
        return f"{bytes_len / 1024:.1f} KB"
    return f"{bytes_len / (1024 * 1024):.2f} MB"


def resumir_archivo(ruta: Path, tam_bytes: int) -> str:
    ext = ruta.suffix.lower()

    if ext in EXTENSIONES_PESADAS or tam_bytes > MAX_BYTES_LEER:
        return f"Archivo pesado/recurso ({ext or 'sin extensión'}, {formatear_tamano(tam_bytes)}) — omitido contenido: {ruta.name}"

    if ext not in EXTENSIONES_TEXTO:
        return f"Recurso ({ext or 'sin extensión'}) — nombre: {ruta.name}"

    try:
        contenido = ruta.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return f"Archivo de texto — nombre: {ruta.name}"

    lineas_limpias = [
        ln.strip()
        for ln in contenido.splitlines()
        if ln.strip() and not set(ln.strip()) <= {"=", "-", "/", "#", "*"}
    ]

    if not lineas_limpias:
        return f"Archivo vacío — nombre: {ruta.name}"

    if ext == ".py":
        try:
            arbol = ast.parse(contenido)
            doc = ast.get_docstring(arbol)
            funciones = [n.name for n in arbol.body if isinstance(n, ast.FunctionDef)]
            clases = [n.name for n in arbol.body if isinstance(n, ast.ClassDef)]
            partes = []
            if doc:
                partes.append(doc.splitlines()[0].strip())
            if clases:
                partes.append(f"clases: {', '.join(clases)}")
            if funciones:
                partes.append(f"funciones: {', '.join(funciones)}")
            if partes:
                return " | ".join(partes)
        except SyntaxError:
            pass

    if ext in {".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".html", ".htm", ".css"}:
        partes = []
        if ext in {".html", ".htm"}:
            m_title = re.search(r"<title>(.*?)</title>", contenido, re.IGNORECASE | re.DOTALL)
            if m_title:
                partes.append(f"Título: {m_title.group(1).strip()}")

        comentarios = [
            ln.lstrip("/#* ").strip()
            for ln in lineas_limpias[:10]
            if ln.startswith("//") or ln.startswith("/*") or ln.startswith("*")
        ]
        if comentarios:
            partes.append(comentarios[0][:110])

        exports = re.findall(
            r"export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_]+)",
            contenido,
        )
        if exports:
            partes.append(f"exports: {', '.join(dict.fromkeys(exports))}")
        if partes:
            return " | ".join(partes)

    primera = re.sub(r"^(//+|#+|<!--+|\*\*|##+)\s*", "", lineas_limpias[0]).strip()
    return primera[:130] if primera else f"Archivo ({ext}) — nombre: {ruta.name}"


def generar_mapa(raiz: Path) -> str:
    lineas = [f"# Mapa del proyecto: {raiz.name}", f"Ruta raíz: `{raiz}`", ""]

    for dirpath, dirnames, filenames in os.walk(raiz, topdown=True):
        dirnames[:] = sorted(d for d in dirnames if d not in CARPETAS_EXCLUIDAS)
        filenames = sorted(
            f for f in filenames if Path(f).suffix.lower() not in EXTENSIONES_PESADAS
        )

        ruta_actual = Path(dirpath)
        rel_dir = ruta_actual.relative_to(raiz)
        nivel = 0 if str(rel_dir) == "." else len(rel_dir.parts)
        indent = "  " * nivel

        nombre_carpeta = raiz.name if str(rel_dir) == "." else f"{rel_dir.name}/"
        rel_str = "." if str(rel_dir) == "." else str(rel_dir).replace("\\", "/")
        lineas.append(f"{indent}- **{nombre_carpeta}** (`{rel_str}`)")

        sub_indent = "  " * (nivel + 1)
        for archivo in filenames:
            ruta_archivo = ruta_actual / archivo
            try:
                tam_bytes = ruta_archivo.stat().st_size
                tam_texto = formatear_tamano(tam_bytes)
            except OSError:
                tam_bytes = -1
                tam_texto = "? B"
            resumen = resumir_archivo(ruta_archivo, tam_bytes)
            rel_file = str(ruta_archivo.relative_to(raiz)).replace("\\", "/")
            lineas.append(f"{sub_indent}- `{archivo}` (`{rel_file}`, {tam_texto}): {resumen}")

    return "\n".join(lineas)


if __name__ == "__main__":
    raiz_proyecto = Path(__file__).resolve().parent
    objetivo = raiz_proyecto
    if len(sys.argv) > 1:
        candidata = (raiz_proyecto / sys.argv[1]).resolve()
        if candidata.exists():
            objetivo = candidata
    print(generar_mapa(objetivo))