"""
modules/eyes_brows.py
Analiza la inclinación cantal (grados), exposición palpebral, arquetipo ocular y cejas.
"""

import cv2
import numpy as np
from config.taxonomy import (
    TAXONOMIA_INCLINACION_CANTAL,
    TAXONOMIA_PARPADO,
    TAXONOMIA_ARQUETIPO_OJOS,
    TAXONOMIA_CEJAS
)

def _dist(p1, p2):
    return float(np.linalg.norm(np.array([p1['x'], p1['y']]) - np.array([p2['x'], p2['y']])))

def _angulo_cantal(canto_int, canto_ext):
    """Calcula el ángulo en grados del canto externo respecto al interno."""
    dx = canto_ext['x'] - canto_int['x']
    dy = canto_int['y'] - canto_ext['y']  # En imágenes el eje Y baja
    rad = np.arctan2(dy, abs(dx))
    return float(np.degrees(rad))

def analizar_ojos_y_cejas(coords_px: dict, frame_bgr: np.ndarray):
    # Ojo Izquierdo (desde la perspectiva de la imagen)
    c_int_izq = coords_px[133]
    c_ext_izq = coords_px[33]
    p_sup_izq = coords_px[159]
    p_inf_izq = coords_px[145]

    # Ojo Derecho
    c_int_der = coords_px[362]
    c_ext_der = coords_px[263]
    p_sup_der = coords_px[386]
    p_inf_der = coords_px[374]

    # 1. Inclinación Cantal
    ang_izq = _angulo_cantal(c_int_izq, c_ext_izq)
    ang_der = _angulo_cantal(c_int_der, c_ext_der)
    ang_prom = (ang_izq + ang_der) / 2.0

    if abs(ang_izq - ang_der) > 4.5:
        diag_cantal = TAXONOMIA_INCLINACION_CANTAL["asimetrica"]
    elif ang_prom >= 5.0:
        diag_cantal = TAXONOMIA_INCLINACION_CANTAL["positiva_marcada"]
    elif 1.8 <= ang_prom < 5.0:
        diag_cantal = TAXONOMIA_INCLINACION_CANTAL["positiva_sutil"]
    elif -1.0 <= ang_prom < 1.8:
        diag_cantal = TAXONOMIA_INCLINACION_CANTAL["neutral"]
    elif -3.0 <= ang_prom < -1.0:
        diag_cantal = TAXONOMIA_INCLINACION_CANTAL["negativa_leve"]
    else:
        diag_cantal = TAXONOMIA_INCLINACION_CANTAL["negativa_moderada"]

    # 2. Ratio de Apertura y Exposición Palpebral
    ancho_izq = _dist(c_int_izq, c_ext_izq)
    alto_izq = _dist(p_sup_izq, p_inf_izq)
    ratio_apertura = alto_izq / ancho_izq if ancho_izq > 0 else 0.35

    if ratio_apertura < 0.28:
        diag_parpado = TAXONOMIA_PARPADO["hooded_oculto"]
    elif 0.28 <= ratio_apertura < 0.36:
        diag_parpado = TAXONOMIA_PARPADO["minima"]
    elif 0.36 <= ratio_apertura < 0.44:
        diag_parpado = TAXONOMIA_PARPADO["moderada"]
    else:
        diag_parpado = TAXONOMIA_PARPADO["alta_expuesta"]

    # 3. Arquetipo Ocular Integrado
    if ang_prom >= 2.0 and ratio_apertura <= 0.32:
        arquetipo = TAXONOMIA_ARQUETIPO_OJOS["hunter"]
    elif ratio_apertura >= 0.43 and ang_prom < 0:
        arquetipo = TAXONOMIA_ARQUETIPO_OJOS["prey"]
    elif ratio_apertura >= 0.40:
        arquetipo = TAXONOMIA_ARQUETIPO_OJOS["redondo"]
    else:
        arquetipo = TAXONOMIA_ARQUETIPO_OJOS["almendrado"]

    # 4. Densidad de Cejas (Análisis de Intensidad sobre el Arco Superciliar)
    ceja_pts = [70, 63, 105, 66, 107]  # Arco superciliar izquierdo
    h, w, _ = frame_bgr.shape
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

    valores_pixel = []
    for pt_idx in ceja_pts:
        px, py = coords_px[pt_idx]['x'], coords_px[pt_idx]['y']
        if 0 <= px < w and 0 <= py < h:
            parche = gray[max(0, py-4):min(h, py+5), max(0, px-4):min(w, px+5)]
            if parche.size > 0:
                valores_pixel.append(float(np.mean(parche)))

    media_ceja = np.mean(valores_pixel) if valores_pixel else 100.0

    if media_ceja < 75.0:
        diag_cejas = TAXONOMIA_CEJAS["densas_definidas"]
    elif media_ceja < 115.0:
        diag_cejas = TAXONOMIA_CEJAS["densidad_media"]
    else:
        diag_cejas = TAXONOMIA_CEJAS["dispersas_claras"]

    return {
        "inclinacion_cantal": {
            "angulo_promedio_deg": round(ang_prom, 1),
            "angulo_izq": round(ang_izq, 1),
            "angulo_der": round(ang_der, 1),
            "diagnostico": diag_cantal
        },
        "exposicion_palpebral": {
            "ratio_apertura": round(ratio_apertura, 2),
            "diagnostico": diag_parpado
        },
        "arquetipo_ocular": {
            "diagnostico": arquetipo
        },
        "cejas": {
            "diagnostico": diag_cejas
        },
        "lineas_cantales": {
            "izq_int": (c_int_izq['x'], c_int_izq['y']),
            "izq_ext": (c_ext_izq['x'], c_ext_izq['y']),
            "der_int": (c_int_der['x'], c_int_der['y']),
            "der_ext": (c_ext_der['x'], c_ext_der['y'])
        }
    }