"""
core/vision_hud.py
Renderizador cinematográfico de malla facial, fotometría (luz y contraste)
y HUD con semáforo angular de 5 posiciones para Visagelab.
Compatible con MediaPipe Tasks 1.0+.
"""

import cv2
import numpy as np

# Importación nativa de conexiones en MediaPipe Tasks 1.0+
try:
    from mediapipe.tasks.python.vision import FaceLandmarksConnections
    TESELACION_CONEXIONES = FaceLandmarksConnections.FACE_LANDMARKS_TESSELATION
except (ImportError, AttributeError):
    # Fallback seguro con conexiones de contorno y rasgos primarios
    TESELACION_CONEXIONES = []

ANGULOS_OBJETIVO = {
    "perfil_izq": {"nombre": "Perfil Izquierdo (-90°)", "yaw": -90.0, "tol": 18.0},
    "tres_cuartos_izq": {"nombre": "3/4 Izquierdo (-45°)", "yaw": -45.0, "tol": 12.0},
    "frontal": {"nombre": "Frontal Canónico (0°)", "yaw": 0.0, "tol": 10.0},
    "tres_cuartos_der": {"nombre": "3/4 Derecho (+45°)", "yaw": 45.0, "tol": 12.0},
    "perfil_der": {"nombre": "Perfil Derecho (+90°)", "yaw": 90.0, "tol": 18.0}
}


def evaluar_fotometria(frame_bgr: np.ndarray, coords_px: dict) -> dict:
    """Calcula iluminación y contraste sobre la piel del rostro."""
    h, w, _ = frame_bgr.shape
    
    xs = [pt['x'] for pt in coords_px.values() if 0 <= pt['x'] < w]
    ys = [pt['y'] for pt in coords_px.values() if 0 <= pt['y'] < h]
    
    if not xs or not ys:
        return {"luz_pct": 0, "contraste_pct": 0, "optima": False}

    min_x, max_x = max(0, min(xs)), min(w - 1, max(xs))
    min_y, max_y = max(0, min(ys)), min(h - 1, max(ys))

    roi_cara = frame_bgr[min_y:max_y, min_x:max_x]
    if roi_cara.size == 0:
        return {"luz_pct": 0, "contraste_pct": 0, "optima": False}

    lab = cv2.cvtColor(roi_cara, cv2.COLOR_BGR2LAB)
    canal_l = lab[:, :, 0]

    media_l = float(np.mean(canal_l))
    desv_l = float(np.std(canal_l))

    if media_l < 130:
        luz_pct = min(100.0, (media_l / 130.0) * 100.0)
    else:
        luz_pct = max(0.0, 100.0 - ((media_l - 130.0) / 100.0) * 100.0)

    contraste_pct = min(100.0, (desv_l / 50.0) * 100.0)

    luz_ok = 55.0 <= luz_pct <= 100.0
    contraste_ok = 45.0 <= contraste_pct <= 100.0
    optima = luz_ok and contraste_ok

    return {
        "luz_pct": int(round(luz_pct)),
        "contraste_pct": int(round(contraste_pct)),
        "optima": optima
    }


def renderizar_malla_cinematografica(frame_bgr: np.ndarray, landmarks, w: int, h: int, color_lineas=(0, 230, 180)):
    """Renderiza la malla facial completa con estética sci-fi translúcida."""
    overlay = frame_bgr.copy()
    puntos_cache = [(int(lm.x * w), int(lm.y * h)) for lm in landmarks]

    # Dibujar líneas de teselación
    if TESELACION_CONEXIONES:
        for conexion in TESELACION_CONEXIONES:
            # Soportar objetos de conexión de MediaPipe o tuplas
            start_idx = conexion.start if hasattr(conexion, 'start') else conexion[0]
            end_idx = conexion.end if hasattr(conexion, 'end') else conexion[1]
            if start_idx < len(puntos_cache) and end_idx < len(puntos_cache):
                p1 = puntos_cache[start_idx]
                p2 = puntos_cache[end_idx]
                cv2.line(overlay, p1, p2, color_lineas, 1, cv2.LINE_AA)
    else:
        # Modo de puntos y conexiones sutiles si no hay lista de teselación directa
        for pt in puntos_cache[::4]:
            cv2.circle(overlay, pt, 1, color_lineas, -1, cv2.LINE_AA)

    # Nodos reflectantes en puntos canónicos
    indices_clave = [33, 133, 263, 362, 1, 4, 61, 291, 152, 10]
    for idx in indices_clave:
        if idx < len(puntos_cache):
            cx, cy = puntos_cache[idx]
            cv2.circle(overlay, (cx, cy), 3, (255, 255, 255), -1, cv2.LINE_AA)
            cv2.circle(overlay, (cx, cy), 5, color_lineas, 1, cv2.LINE_AA)

    cv2.addWeighted(overlay, 0.45, frame_bgr, 0.55, 0, frame_bgr)


def dibujar_hud_semaforo(frame_bgr: np.ndarray, yaw: float, objetivo_clave: str, fotometria: dict):
    """Dibuja el semáforo angular, estado fotométrico y retícula de encuadre."""
    h, w, _ = frame_bgr.shape
    obj = ANGULOS_OBJETIVO[objetivo_clave]
    
    diff_yaw = abs(yaw - obj["yaw"])
    angulo_ok = diff_yaw <= obj["tol"]
    foto_ok = fotometria["optima"]

    listo_captura = angulo_ok and foto_ok
    color_estado = (0, 255, 120) if listo_captura else (0, 60, 255)

    grosor_borde = 3 if listo_captura else 1
    largo_esq = 35

    # Retícula HUD en esquinas
    cv2.line(frame_bgr, (20, 20), (20 + largo_esq, 20), color_estado, grosor_borde)
    cv2.line(frame_bgr, (20, 20), (20, 20 + largo_esq), color_estado, grosor_borde)
    cv2.line(frame_bgr, (w - 20, 20), (w - 20 - largo_esq, 20), color_estado, grosor_borde)
    cv2.line(frame_bgr, (w - 20, 20), (w - 20, 20 + largo_esq), color_estado, grosor_borde)
    cv2.line(frame_bgr, (20, h - 20), (20 + largo_esq, h - 20), color_estado, grosor_borde)
    cv2.line(frame_bgr, (20, h - 20), (20, h - 20 - largo_esq), color_estado, grosor_borde)
    cv2.line(frame_bgr, (w - 20, h - 20), (w - 20 - largo_esq, h - 20), color_estado, grosor_borde)
    cv2.line(frame_bgr, (w - 20, h - 20), (w - 20, h - 20 - largo_esq), color_estado, grosor_borde)

    # Panel superior de estado
    cv2.rectangle(frame_bgr, (25, 25), (460, 165), (10, 10, 10), -1)
    cv2.rectangle(frame_bgr, (25, 25), (460, 165), color_estado, 1)

    cv2.circle(frame_bgr, (48, 52), 10, color_estado, -1)
    status_texto = "EN POSICIÓN ÓPTIMA" if listo_captura else "AJUSTANDO ENCUADRE"
    cv2.putText(frame_bgr, status_texto, (68, 57), cv2.FONT_HERSHEY_SIMPLEX, 0.58, color_estado, 2)

    cv2.putText(frame_bgr, f"Objetivo: {obj['nombre']}", (38, 85), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1)
    cv2.putText(frame_bgr, f"Giro Actual (Yaw): {yaw:.1f} deg", (38, 108), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (200, 200, 200), 1)

    # Fotometría
    col_luz = (0, 255, 120) if fotometria["luz_pct"] >= 55 else (0, 80, 255)
    cv2.putText(frame_bgr, f"Iluminacion: {fotometria['luz_pct']}%", (38, 133), cv2.FONT_HERSHEY_SIMPLEX, 0.48, col_luz, 1)
    cv2.rectangle(frame_bgr, (195, 123), (340, 133), (40, 40, 40), -1)
    ancho_barra_luz = int((fotometria["luz_pct"] / 100.0) * 145)
    cv2.rectangle(frame_bgr, (195, 123), (195 + ancho_barra_luz, 133), col_luz, -1)

    col_ctr = (0, 255, 120) if fotometria["contraste_pct"] >= 45 else (0, 80, 255)
    cv2.putText(frame_bgr, f"Contraste: {fotometria['contraste_pct']}%", (38, 153), cv2.FONT_HERSHEY_SIMPLEX, 0.48, col_ctr, 1)
    cv2.rectangle(frame_bgr, (195, 143), (340, 153), (40, 40, 40), -1)
    ancho_barra_ctr = int((fotometria["contraste_pct"] / 100.0) * 145)
    cv2.rectangle(frame_bgr, (195, 143), (195 + ancho_barra_ctr, 153), col_ctr, -1)

    return listo_captura