"""
modules/colorimetry.py
Análisis cromático computarizado en espacio CIE-Lab e ITA (Individual Typology Angle).
"""

import math
import cv2
import numpy as np
from config.taxonomy import (
    TAXONOMIA_SUBTONO,
    TAXONOMIA_FOTOTIPO_ITA,
    TAXONOMIA_CONTRASTE,
    TAXONOMIA_ESTACION
)

def _extraer_muestra_lab(img_lab: np.ndarray, x: int, y: int, radio: int = 5):
    """Extrae la media de L*, a* y b* en una región circular fija alrededor de un landmark."""
    h, w, _ = img_lab.shape
    y1, y2 = max(0, y - radio), min(h, y + radio + 1)
    x1, x2 = max(0, x - radio), min(w, x + radio + 1)
    parche = img_lab[y1:y2, x1:x2]
    if parche.size == 0:
        return 128.0, 128.0, 128.0
    media = np.mean(parche, axis=(0, 1))
    # En OpenCV: L va de 0 a 255 (se normaliza a 0-100), a y b tienen offset de 128
    l_star = (media[0] / 255.0) * 100.0
    a_star = media[1] - 128.0
    b_star = media[2] - 128.0
    return float(l_star), float(a_star), float(b_star)

def analizar_colorimetria(coords_px: dict, img_bgr: np.ndarray):
    """
    Analiza tono cutáneo en pómulos y frente, calcula ITA y contraste facial.
    """
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)

    # Landmarks de piel neutra (mejillas y centro de la frente)
    # 50: mejilla izq, 280: mejilla der, 151: frente central
    l_izq, a_izq, b_izq = _extraer_muestra_lab(img_lab, coords_px[50]['x'], coords_px[50]['y'])
    l_der, a_der, b_der = _extraer_muestra_lab(img_lab, coords_px[280]['x'], coords_px[280]['y'])
    l_frt, a_frt, b_frt = _extraer_muestra_lab(img_lab, coords_px[151]['x'], coords_px[151]['y'])

    # Media representativa de la dermis
    l_piel = (l_izq + l_der + l_frt) / 3.0
    a_piel = (a_izq + a_der + a_frt) / 3.0
    b_piel = (b_izq + b_der + b_frt) / 3.0

    # 1. Ángulo de Tipología Individual (ITA)
    # ITA = [arctan((L - 50) / b)] * (180 / pi)
    denominador = b_piel if abs(b_piel) > 1e-4 else 0.001
    ita_deg = math.degrees(math.atan((l_piel - 50.0) / denominador))

    if ita_deg > 55:
        diag_fototipo = TAXONOMIA_FOTOTIPO_ITA["muy_claro"]
    elif 41 < ita_deg <= 55:
        diag_fototipo = TAXONOMIA_FOTOTIPO_ITA["claro"]
    elif 28 < ita_deg <= 41:
        diag_fototipo = TAXONOMIA_FOTOTIPO_ITA["intermedio"]
    elif 10 < ita_deg <= 28:
        diag_fototipo = TAXONOMIA_FOTOTIPO_ITA["bronceado"]
    elif -30 < ita_deg <= 10:
        diag_fototipo = TAXONOMIA_FOTOTIPO_ITA["oscuro"]
    else:
        diag_fototipo = TAXONOMIA_FOTOTIPO_ITA["muy_oscuro"]

    # 2. Subtono (Balance a* eritema vs b* carotenoide)
    # Ratio b/a y valores absolutos
    if b_piel < 5.0 and a_piel > 8.0:
        diag_subtono = TAXONOMIA_SUBTONO["frio"]
        es_frio = True
    elif b_piel < 9.0:
        diag_subtono = TAXONOMIA_SUBTONO["neutro_frio"]
        es_frio = True
    elif 9.0 <= b_piel <= 15.0 and abs(b_piel - a_piel) < 6:
        diag_subtono = TAXONOMIA_SUBTONO["neutro"]
        es_frio = False
    elif a_piel < 4.0 and b_piel >= 10.0:
        diag_subtono = TAXONOMIA_SUBTONO["oliva"]
        es_frio = True
    elif 15.0 < b_piel <= 22.0:
        diag_subtono = TAXONOMIA_SUBTONO["neutro_calido"]
        es_frio = False
    else:
        diag_subtono = TAXONOMIA_SUBTONO["calido"]
        es_frio = False

    # 3. Nivel de Contraste Facial (Diferencia dermis vs ceja / iris)
    # Tomamos muestra de ceja izquierda (landmark 107)
    l_ceja, _, _ = _extraer_muestra_lab(img_lab, coords_px[107]['x'], coords_px[107]['y'], radio=3)
    delta_l = abs(l_piel - l_ceja)

    if delta_l >= 28.0:
        diag_contraste = TAXONOMIA_CONTRASTE["alto"]
        es_alto_contraste = True
    elif 16.0 <= delta_l < 28.0:
        diag_contraste = TAXONOMIA_CONTRASTE["medio"]
        es_alto_contraste = False
    else:
        diag_contraste = TAXONOMIA_CONTRASTE["bajo"]
        es_alto_contraste = False

    # 4. Estación Cromática Estimada
    if es_frio:
        estacion = TAXONOMIA_ESTACION["invierno"] if es_alto_contraste else TAXONOMIA_ESTACION["verano"]
    else:
        estacion = TAXONOMIA_ESTACION["primavera"] if es_alto_contraste else TAXONOMIA_ESTACION["otono"]

    return {
        "lab": {
            "l": round(l_piel, 1),
            "a": round(a_piel, 1),
            "b": round(b_piel, 1)
        },
        "ita_grados": round(ita_deg, 1),
        "fototipo": diag_fototipo,
        "subtono": diag_subtono,
        "contraste": diag_contraste,
        "estacion": estacion
    }