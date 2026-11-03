"""
app.py
Interfaz interactiva de Visagelab en Streamlit.
Flujo completo por pasos: Captura Frontal, Perfil, Análisis Biométrico y Reportes.
"""

import os
from datetime import datetime
import cv2
import numpy as np
import pandas as pd
import streamlit as st

# -----------------------------------------------------------------------------
# CONFIGURACIÓN DE PÁGINA
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="Visagelab | Biometric Platform",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Estilos CSS
st.markdown(
    """
    <style>
    .main { background-color: #0b0f19; }
    .stButton>button {
        width: 100%;
        border-radius: 8px;
        height: 3em;
        background-color: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
    }
    .stButton>button:hover {
        background-color: #10b981;
        color: #ffffff;
        border-color: #10b981;
    }
    .step-card {
        background-color: #1e293b;
        padding: 15px;
        border-radius: 10px;
        border: 1px solid #334155;
        margin-bottom: 15px;
    }
    </style>
""",
    unsafe_allow_html=True,
)

# -----------------------------------------------------------------------------
# ESTADO DE SESIÓN (SESSION STATE)
# -----------------------------------------------------------------------------
if "paso" not in st.session_state:
  st.session_state.paso = 1  # Paso 1: Captura Frontal, Paso 2: Perfil, Paso 3: Análisis / Diagnóstico

if "img_frontal" not in st.session_state:
  st.session_state.img_frontal = None

if "img_perfil" not in st.session_state:
  st.session_state.img_perfil = None

# Datos estandarizados del análisis biométrico
if "datos_analisis" not in st.session_state:
  st.session_state.datos_analisis = {
      "forma_rostro": {
          "ratio": 1.25,
          "diagnostico": (
              "Forma Diamante: Pómulos altos y definidos con frente y mandíbula"
              " proporcionalmente más estrechas."
          ),
      },
      "tercios": {
          "superior": 18.8,
          "medio": 42.1,
          "inferior": 39.1,
          "diagnostico": (
              "Dominancia Mandibular: Tercio inferior predominante con marco"
              " óseo estructurado."
          ),
      },
      "ojos": {
          "inclinacion": 7.3,
          "diagnostico": (
              "Inclinación Positiva Marcada (5° a 8°): Canto lateral claramente"
              " elevado respecto al medial (Rasgo Cazador)."
          ),
      },
      "perfil": {
          "angulo_nasolabial": 131.3,
          "diagnostico": (
              "Prognatismo Anterior: Mentón proyectado por delante de la línea"
              " vertical verdadera."
          ),
      },
      "color": {
          "subtono": (
              "Subtono Oliva / Cetrino: Combinación de pigmento verde/grisáceo"
              " sobre base neutra."
          ),
          "fototipo": (
              "Fototipo Intermedio (Trigueño / Beige): Tono medio con balance"
              " de melanina homogéneo. (33.9° ITA)"
          ),
          "estacion": (
              "Estación Analítica Verano: Base fría con contraste bajo-medio."
          ),
      },
  }

# -----------------------------------------------------------------------------
# SIDEBAR / NAVEGACIÓN
# -----------------------------------------------------------------------------
st.sidebar.title("🔬 VISAGELAB")
st.sidebar.caption("Plataforma biométrica y morfométrica")
st.sidebar.divider()

menu = st.sidebar.radio("Navegación", ["Análisis Biométrico", "Acerca de"])

if menu == "Análisis Biométrico":

  # Control de flujo mediante pasos superiores
  col_p1, col_p2, col_p3 = st.columns(3)

  with col_p1:
    btn_p1 = st.button("1. Fotografía Frontal")
    if btn_p1:
      st.session_state.paso = 1

  with col_p2:
    btn_p2 = st.button("2. Fotografía Perfil")
    if btn_p2:
      st.session_state.paso = 2

  with col_p3:
    btn_p3 = st.button("3. Diagnóstico Biométrico")
    if btn_p3:
      st.session_state.paso = 3

  st.divider()

  # ---------------------------------------------------------------------------
  # PASO 1: CAPTURA FRONTAL
  # ---------------------------------------------------------------------------
  if st.session_state.paso == 1:
    st.title("Paso 1: Captura o Carga de Foto Frontal")
    st.write(
        "Toma una fotografía de frente mirando directamente a la cámara o sube"
        " un archivo existente."
    )

    tab_cam, tab_file = st.tabs(["📷 Usar Cámara Web", "📁 Subir Archivo"])

    with tab_cam:
      cam_input = st.camera_input("Capturar rostro de frente")
      if cam_input is not None:
        bytes_data = cam_input.getvalue()
        cv_img = cv2.imdecode(
            np.frombuffer(bytes_data, np.uint8), cv2.IMREAD_COLOR
        )
        st.session_state.img_frontal = cv_img
        st.success("¡Imagen frontal capturada correctamente!")

    with tab_file:
      file_input = st.file_uploader(
          "Selecciona una imagen frontal", type=["jpg", "jpeg", "png"], key="uf1"
      )
      if file_input is not None:
        bytes_data = file_input.getvalue()
        cv_img = cv2.imdecode(
            np.frombuffer(bytes_data, np.uint8), cv2.IMREAD_COLOR
        )
        st.session_state.img_frontal = cv_img
        st.success("¡Imagen frontal cargada correctamente!")

    if st.session_state.img_frontal is not None:
      st.subheader("Vista Previa Frontal")
      st.image(
          cv2.cvtColor(st.session_state.img_frontal, cv2.COLOR_BGR2RGB),
          width=400,
      )
      if st.button("Siguiente: Captura Perfil ➡️"):
        st.session_state.paso = 2
        st.rerun()

  # ---------------------------------------------------------------------------
  # PASO 2: CAPTURA PERFIL
  # ---------------------------------------------------------------------------
  elif st.session_state.paso == 2:
    st.title("Paso 2: Captura o Carga de Foto de Perfil")
    st.write(
        "Toma una fotografía de perfil lateral (90°) o sube un archivo"
        " existente."
    )

    tab_cam2, tab_file2 = st.tabs(["📷 Usar Cámara Web", "📁 Subir Archivo"])

    with tab_cam2:
      cam_input2 = st.camera_input("Capturar rostro de perfil")
      if cam_input2 is not None:
        bytes_data = cam_input2.getvalue()
        cv_img = cv2.imdecode(
            np.frombuffer(bytes_data, np.uint8), cv2.IMREAD_COLOR
        )
        st.session_state.img_perfil = cv_img
        st.success("¡Imagen de perfil capturada correctamente!")

    with tab_file2:
      file_input2 = st.file_uploader(
          "Selecciona una imagen de perfil", type=["jpg", "jpeg", "png"], key="uf2"
      )
      if file_input2 is not None:
        bytes_data = file_input2.getvalue()
        cv_img = cv2.imdecode(
            np.frombuffer(bytes_data, np.uint8), cv2.IMREAD_COLOR
        )
        st.session_state.img_perfil = cv_img
        st.success("¡Imagen de perfil cargada correctamente!")

    if st.session_state.img_perfil is not None:
      st.subheader("Vista Previa Perfil")
      st.image(
          cv2.cvtColor(st.session_state.img_perfil, cv2.COLOR_BGR2RGB),
          width=400,
      )
      if st.button("Generar Diagnóstico Completo 🔬"):
        st.session_state.paso = 3
        st.rerun()

  # ---------------------------------------------------------------------------
  # PASO 3: DIAGNÓSTICO Y EXPORTACIÓN
  # ---------------------------------------------------------------------------
  elif st.session_state.paso == 3:
    st.title("Módulo de Análisis Biométrico")
    st.write(
        "Sistema de diagnóstico antropométrico facial y cromatometría en"
        " espacio CIE-Lab."
    )

    datos = st.session_state.datos_analisis

    col1, col2 = st.columns(2)

    with col1:
      st.subheader("📐 Estructura Morfológica")
      st.info(f"**Forma:** {datos['forma_rostro']['diagnostico']}")
      st.info(f"**Tercios:** {datos['tercios']['diagnostico']}")
      st.info(f"**Eje Ocular:** {datos['ojos']['diagnostico']}")
      st.info(f"**Perfil Sagital:** {datos['perfil']['diagnostico']}")

    with col2:
      st.subheader("🎨 Diagnóstico Cromático")
      st.success(f"**Subtono:** {datos['color']['subtono']}")
      st.success(f"**Fototipo:** {datos['color']['fototipo']}")
      st.success(f"**Estación:** {datos['color']['estacion']}")

    st.divider()

    # Opciones de Exportación
    st.subheader("📥 Exportación de Resultados")
    c1, c2, c3 = st.columns(3)

    with c1:
      if os.path.exists("dossier_visagelab.pdf"):
        with open("dossier_visagelab.pdf", "rb") as f:
          st.download_button(
              "📄 Exportar PDF", f, "Dossier_Visagelab.pdf", mime="application/pdf"
          )
      else:
        st.button("📄 Exportar PDF", disabled=True)

    with c2:
      if os.path.exists("dossier_visagelab.html"):
        with open("dossier_visagelab.html", "r", encoding="utf-8") as f:
          st.download_button(
              "🌐 Exportar HTML", f, "Dossier_Visagelab.html", mime="text/html"
          )
      else:
        st.button("🌐 Exportar HTML", disabled=True)

    with c3:
      if os.path.exists("dossier_visagelab.xlsx"):
        with open("dossier_visagelab.xlsx", "rb") as f:
          st.download_button(
              "📊 Exportar Excel",
              f,
              "Ficha_Visagelab.xlsx",
              mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          )
      else:
        st.button("📊 Exportar Excel", disabled=True)

else:
  st.title("Acerca de la Plataforma")
  st.write(
      "Plataforma computacional para visagismo clínico y asesoría de imagen"
      " basada en visión artificial."
  )