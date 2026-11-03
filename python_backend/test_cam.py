"""
test_cam.py
Prueba del motor cinematográfico: malla translúcida, fotometría (luz y contraste)
y semáforo de 5 ángulos interactivo.
Presiona 1, 2, 3, 4 o 5 para cambiar de objetivo angular.
Presiona 'q' para salir.
"""

import os
import urllib.request
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from core.vision_hud import (
    evaluar_fotometria,
    renderizar_malla_cinematografica,
    dibujar_hud_semaforo,
    ANGULOS_OBJETIVO
)

MODEL_PATH = "face_landmarker.task"
if not os.path.exists(MODEL_PATH):
    urllib.request.urlretrieve(
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        MODEL_PATH
    )

base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.FaceLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    num_faces=1,
    min_face_detection_confidence=0.5
)
detector = vision.FaceLandmarker.create_from_options(options)

MODEL_POINTS_3D = np.array([
    (0.0, 0.0, 0.0), (0.0, -330.0, -65.0),
    (-225.0, 170.0, -135.0), (225.0, 170.0, -135.0),
    (-150.0, -150.0, -125.0), (150.0, -150.0, -125.0)
], dtype=np.float64)
LANDMARK_INDICES = [4, 152, 33, 263, 61, 291]

claves_angulos = ["perfil_izq", "tres_cuartos_izq", "frontal", "tres_cuartos_der", "perfil_der"]
indice_actual = 2  # Inicia en 'frontal'

cap = cv2.VideoCapture(0)
frame_timestamp_ms = 0

print("\n--- VISAGELAB: HUD CINEMATOGRÁFICO Y FOTOMETRÍA ---")
print("Controles de ángulo:")
print(" [1] Perfil Izquierdo (-90°)")
print(" [2] Tres Cuartos Izq (-45°)")
print(" [3] Frontal (0°)")
print(" [4] Tres Cuartos Der (+45°)")
print(" [5] Perfil Derecho (+90°)")
print("Presiona 'q' para salir.\n")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    frame_timestamp_ms += 33
    res = detector.detect_for_video(mp_image, frame_timestamp_ms)

    if res.face_landmarks:
        lms = res.face_landmarks[0]
        coords_px = {i: {"x": int(lm.x * w), "y": int(lm.y * h)} for i, lm in enumerate(lms)}

        # Estimar giro (yaw)
        puntos_2d = np.array([[lms[i].x * w, lms[i].y * h] for i in LANDMARK_INDICES], dtype=np.float64)
        cam_matrix = np.array([[w, 0, w/2], [0, w, h/2], [0, 0, 1]], dtype=np.float64)
        _, rot_vec, trans_vec = cv2.solvePnP(MODEL_POINTS_3D, puntos_2d, cam_matrix, np.zeros((4, 1)), flags=cv2.SOLVEPNP_ITERATIVE)
        rot_mat, _ = cv2.Rodrigues(rot_vec)
        _, _, _, _, _, _, euler = cv2.decomposeProjectionMatrix(np.hstack((rot_mat, trans_vec)))
        yaw = float(euler[1, 0])

        # 1. Medir fotometría sobre la cara
        fotometria = evaluar_fotometria(frame, coords_px)

        # 2. Renderizar Malla Cinematográfica completa
        color_malla = (0, 255, 140) if fotometria["optima"] else (0, 180, 255)
        renderizar_malla_cinematografica(frame, lms, w, h, color_malla)

        # 3. Dibujar HUD y Semáforo
        clave_activa = claves_angulos[indice_actual]
        dibujar_hud_semaforo(frame, yaw, clave_activa, fotometria)

    cv2.imshow("Visagelab - HUD Cinematografico", frame)

    tecla = cv2.waitKey(1) & 0xFF
    if tecla == ord('q'):
        break
    elif tecla == ord('1'):
        indice_actual = 0
    elif tecla == ord('2'):
        indice_actual = 1
    elif tecla == ord('3'):
        indice_actual = 2
    elif tecla == ord('4'):
        indice_actual = 3
    elif tecla == ord('5'):
        indice_actual = 4

cap.release()
cv2.destroyAllWindows()
detector.close()