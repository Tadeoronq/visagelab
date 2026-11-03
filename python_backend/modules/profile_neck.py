"""
modules/profile_neck.py
Módulo para el análisis del perfil esquelético (González-Ulloa),
ángulo nasolabial y proporciones cuello-mandíbula.
"""

import numpy as np
from config.taxonomy import (
    TAXONOMIA_PERFIL_MENTON,
    TAXONOMIA_ANGULO_NASOLABIAL,
    TAXONOMIA_CUELLO_MANDIBULA
)

def _dist(p1, p2):
    return float(np.linalg.norm(np.array([p1['x'], p1['y']]) - np.array([p2['x'], p2['y']])))

def analizar_perfil_y_cuello(coords_px: dict, pose: dict, dimensiones: dict):
    w = dimensiones["ancho"]
    h = dimensiones["alto"]
    yaw = pose.get("yaw", 0.0)

    # Landmarks de perfil y cuello
    glabella = coords_px[9]
    subnasale = coords_px[2]
    pronasale = coords_px[4]
    labrale_sup = coords_px[0]
    pogonion = coords_px[199]
    menton = coords_px[152]

    go_izq = coords_px[172]
    go_der = coords_px[397]
    cuello_izq = coords_px[136]
    cuello_der = coords_px[365]

    # --- 1. PROPORCIÓN CUELLO - MANDÍBULA ---
    ancho_mandibula = _dist(go_izq, go_der)
    ancho_cuello = _dist(cuello_izq, cuello_der)
    ratio_cuello = ancho_cuello / ancho_mandibula if ancho_mandibula > 0 else 0.85

    if ratio_cuello >= 0.92:
        diag_cuello = TAXONOMIA_CUELLO_MANDIBULA["proporcion_continua"]
    elif 0.80 <= ratio_cuello < 0.92:
        diag_cuello = TAXONOMIA_CUELLO_MANDIBULA["atletico_balanceado"]
    elif 0.70 <= ratio_cuello < 0.80:
        diag_cuello = TAXONOMIA_CUELLO_MANDIBULA["transicion_suavizada"]
    else:
        diag_cuello = TAXONOMIA_CUELLO_MANDIBULA["cuello_estrecho"]

    # --- 2. ANÁLISIS DE PERFIL VERDADERO (Línea de González-Ulloa) ---
    # Se evalúa con mayor rigor cuando yaw detecta perfil o 3/4 pronunciado
    dx_perfil = pogonion['x'] - glabella['x']
    # Compensar dirección según si gira a izquierda o derecha
    dx_normalizado = dx_perfil if yaw > 0 else -dx_perfil

    if abs(dx_normalizado) <= 4:
        diag_menton = TAXONOMIA_PERFIL_MENTON["ortognatismo_apex"]
    elif dx_normalizado > 4:
        diag_menton = TAXONOMIA_PERFIL_MENTON["prognatismo"]
    elif -12 <= dx_normalizado < -4:
        diag_menton = TAXONOMIA_PERFIL_MENTON["receso_armonico"]
    elif -25 <= dx_normalizado < -12:
        diag_menton = TAXONOMIA_PERFIL_MENTON["retrognatismo_moderado"]
    else:
        diag_menton = TAXONOMIA_PERFIL_MENTON["colapso_severo"]

    # --- 3. ÁNGULO NASOLABIAL (Columela vs Filtrum) ---
    v_columela = np.array([pronasale['x'] - subnasale['x'], pronasale['y'] - subnasale['y']])
    v_filtrum = np.array([labrale_sup['x'] - subnasale['x'], labrale_sup['y'] - subnasale['y']])

    cos_ang = np.dot(v_columela, v_filtrum) / (np.linalg.norm(v_columela) * np.linalg.norm(v_filtrum) + 1e-6)
    ang_rad = np.arccos(np.clip(cos_ang, -1.0, 1.0))
    ang_deg = float(np.degrees(ang_rad))

    if 90.0 <= ang_deg <= 98.0:
        diag_nasolabial = TAXONOMIA_ANGULO_NASOLABIAL["marcial_apex"]
    elif 98.0 < ang_deg <= 110.0:
        diag_nasolabial = TAXONOMIA_ANGULO_NASOLABIAL["respingado"]
    elif ang_deg < 90.0:
        diag_nasolabial = TAXONOMIA_ANGULO_NASOLABIAL["caido_aquilino"]
    else:
        diag_nasolabial = TAXONOMIA_ANGULO_NASOLABIAL["hiper_respingado"]

    return {
        "cuello_mandibula": {
            "ratio": round(ratio_cuello, 2),
            "diagnostico": diag_cuello
        },
        "menton_perfil": {
            "desviacion_px": round(dx_normalizado, 1),
            "diagnostico": diag_menton
        },
        "angulo_nasolabial": {
            "grados": round(ang_deg, 1),
            "diagnostico": diag_nasolabial
        },
        "lineas_guia": {
            "glabella": (glabella['x'], glabella['y']),
            "pogonion": (pogonion['x'], pogonion['y']),
            "cuello_izq": (cuello_izq['x'], cuello_izq['y']),
            "cuello_der": (cuello_der['x'], cuello_der['y'])
        }
    }