"""
modules/frontal.py
Módulo de cálculo morfométrico en vista frontal para Visagelab.
"""

import numpy as np
from config.taxonomy import (
    TAXONOMIA_TERCIOS, TAXONOMIA_QUINTOS,
    TAXONOMIA_FORMA_ROSTRO, TAXONOMIA_SIMETRIA,
    TAXONOMIA_ANCHO_NASAL
)

def _dist(p1, p2):
    return float(np.linalg.norm(np.array([p1['x'], p1['y']]) - np.array([p2['x'], p2['y']])))

def analizar_frontal(coords_px: dict, dimensiones: dict):
    """
    Recibe las coordenadas en píxeles de los 468 landmarks y las dimensiones de la imagen.
    Devuelve diagnósticos cualitativos y medidas geométricas.
    """
    w = dimensiones["ancho"]
    h = dimensiones["alto"]

    # Landmarks anatómicos clave
    trichion = coords_px[10]       # Superior frente
    glabella = coords_px[9]        # Entrecejo
    subnasale = coords_px[2]       # Base columela
    menton = coords_px[152]        # Barbilla
    
    zy_izq = coords_px[234]        # Pómulo izquierdo
    zy_der = coords_px[454]        # Pómulo derecho
    go_izq = coords_px[172]        # Mandíbula izquierda
    go_der = coords_px[397]        # Mandíbula derecha
    ft_izq = coords_px[103]        # Frente lateral izquierda
    ft_der = coords_px[332]        # Frente lateral derecha

    canto_int_izq = coords_px[133]
    canto_ext_izq = coords_px[33]
    canto_int_der = coords_px[362]
    canto_ext_der = coords_px[263]

    aleta_izq = coords_px[129]
    aleta_der = coords_px[358]
    comisura_izq = coords_px[61]
    comisura_der = coords_px[291]

    # --- 1. TERCIOS FACIALES ---
    t_sup = _dist(trichion, glabella)
    t_med = _dist(glabella, subnasale)
    t_inf = _dist(subnasale, menton)
    t_total = t_sup + t_med + t_inf

    pct_sup = (t_sup / t_total) * 100
    pct_med = (t_med / t_total) * 100
    pct_inf = (t_inf / t_total) * 100

    if abs(pct_sup - 33.3) < 3.0 and abs(pct_med - 33.3) < 3.0 and abs(pct_inf - 33.3) < 3.0:
        diag_tercios = TAXONOMIA_TERCIOS["equilibrio_perfecto"]
    elif pct_inf >= 38.0:
        diag_tercios = TAXONOMIA_TERCIOS["dominancia_mandibular"]
    elif pct_sup >= 37.0:
        diag_tercios = TAXONOMIA_TERCIOS["arquetipo_intelectual"]
    elif pct_med >= 37.0:
        diag_tercios = TAXONOMIA_TERCIOS["soporte_central"]
    else:
        diag_tercios = TAXONOMIA_TERCIOS["desequilibrio"]

    # --- 2. QUINTOS FACIALES Y ANCHO NASAL ---
    ancho_ojo_izq = _dist(canto_ext_izq, canto_int_izq)
    ancho_ojo_der = _dist(canto_int_der, canto_ext_der)
    dist_intercantal = _dist(canto_int_izq, canto_int_der)
    ancho_nasal = _dist(aleta_izq, aleta_der)

    ratio_nasal_intercantal = ancho_nasal / dist_intercantal if dist_intercantal > 0 else 1.0
    if abs(ratio_nasal_intercantal - 1.0) <= 0.08:
        diag_nasal = TAXONOMIA_ANCHO_NASAL["ideal"]
    elif ratio_nasal_intercantal < 0.92:
        diag_nasal = TAXONOMIA_ANCHO_NASAL["delgado"]
    elif 1.08 < ratio_nasal_intercantal <= 1.20:
        diag_nasal = TAXONOMIA_ANCHO_NASAL["natural_medio"]
    else:
        diag_nasal = TAXONOMIA_ANCHO_NASAL["expandido"]

    if abs(ancho_ojo_izq - dist_intercantal) < 6 and abs(ancho_ojo_der - dist_intercantal) < 6:
        diag_quintos = TAXONOMIA_QUINTOS["proporcion_aurea"]
    elif dist_intercantal < ancho_ojo_izq:
        diag_quintos = TAXONOMIA_QUINTOS["enfoque_central"]
    else:
        diag_quintos = TAXONOMIA_QUINTOS["distancia_amplia"]

    # --- 3. FORMA DEL ROSTRO (Índice Facial y Ratios Óseos) ---
    ancho_bicigomatico = _dist(zy_izq, zy_der)
    ancho_bigonial = _dist(go_izq, go_der)
    ancho_frontal = _dist(ft_izq, ft_der)
    ratio_facial = t_total / ancho_bicigomatico if ancho_bicigomatico > 0 else 1.35

    if ancho_bicigomatico > ancho_frontal * 1.15 and ancho_bicigomatico > ancho_bigonial * 1.15:
        forma = TAXONOMIA_FORMA_ROSTRO["diamante"]
    elif ancho_bigonial >= ancho_bicigomatico * 0.95 and ratio_facial < 1.35:
        forma = TAXONOMIA_FORMA_ROSTRO["cuadrada"]
    elif ancho_bigonial >= ancho_bicigomatico * 0.95 and ratio_facial >= 1.45:
        forma = TAXONOMIA_FORMA_ROSTRO["rectangular"]
    elif ancho_frontal > ancho_bigonial * 1.2 and pct_inf < 35:
        forma = TAXONOMIA_FORMA_ROSTRO["corazon"]
    elif ratio_facial < 1.28:
        forma = TAXONOMIA_FORMA_ROSTRO["redonda"]
    else:
        forma = TAXONOMIA_FORMA_ROSTRO["ovalada"]

    # --- 4. SIMETRÍA BILATERAL (Eje Sagital) ---
    eje_x = glabella['x']
    desv_ojos = abs((canto_int_izq['x'] - eje_x) - (eje_x - canto_int_der['x']))
    desv_alas = abs((aleta_izq['x'] - eje_x) - (eje_x - aleta_der['x']))
    desv_boca = abs((comisura_izq['x'] - eje_x) - (eje_x - comisura_der['x']))
    desv_promedio = (desv_ojos + desv_alas + desv_boca) / 3.0

    if desv_promedio <= 3.0:
        diag_simetria = TAXONOMIA_SIMETRIA["especular_perfecta"]
    elif desv_promedio <= 6.0:
        diag_simetria = TAXONOMIA_SIMETRIA["armonica_natural"]
    elif desv_promedio <= 12.0:
        diag_simetria = TAXONOMIA_SIMETRIA["asimetria_leve"]
    elif desv_promedio <= 20.0:
        diag_simetria = TAXONOMIA_SIMETRIA["asimetria_moderada"]
    else:
        diag_simetria = TAXONOMIA_SIMETRIA["asimetria_severa"]

    return {
        "tercios": {
            "superior": round(pct_sup, 1),
            "medio": round(pct_med, 1),
            "inferior": round(pct_inf, 1),
            "diagnostico": diag_tercios
        },
        "quintos": {
            "diagnostico": diag_quintos
        },
        "ancho_nasal": {
            "diagnostico": diag_nasal
        },
        "forma_rostro": {
            "ratio_alto_ancho": round(ratio_facial, 2),
            "diagnostico": forma
        },
        "simetria": {
            "desviacion_media_px": round(desv_promedio, 1),
            "diagnostico": diag_simetria
        },
        "puntos_guia": {
            "trichion": (trichion['x'], trichion['y']),
            "glabella": (glabella['x'], glabella['y']),
            "subnasale": (subnasale['x'], subnasale['y']),
            "menton": (menton['x'], menton['y']),
            "zy_izq": (zy_izq['x'], zy_izq['y']),
            "zy_der": (zy_der['x'], zy_der['y'])
        }
    }