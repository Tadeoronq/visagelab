# Fase 2: Escaneo corporal, postura y ángulos articulares
import cv2
import numpy as np
import mediapipe as mp

class BodyScanner:
    def __init__(self):
        # Utilizando la API moderna de MediaPipe Tasks para Pose
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision

        # Descarga o usa el modelo estándar de pose landmarker
        # Nota: Aseguraremos el procesamiento con la API de vision moderna
        base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1
        )
        self.detector = vision.PoseLandmarker.create_from_options(options)

    def analyze_posture_and_silhouette(self, frame):
        h, w, _ = frame.shape
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Convertir frame a formato mp.Image requerido por la versión moderna
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        results = self.detector.detect(mp_image)
        
        analysis_result = {
            "is_detected": False,
            "shoulder_tilt_deg": 0.0,
            "hip_tilt_deg": 0.0,
            "silhouette_metrics": {},
            "landmarks_pixel": []
        }

        if results.pose_landmarks and len(results.pose_landmarks) > 0:
            analysis_result["is_detected"] = True
            landmarks = results.pose_landmarks[0] # Primer persona detectada

            # Extraer coordenadas en píxeles
            pts = {i: (int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in range(len(landmarks))}
            analysis_result["landmarks_pixel"] = pts

            # 1. Inclinación de hombros (Izquierdo: 11, Derecho: 12)
            if 11 in pts and 12 in pts:
                dx = pts[12][0] - pts[11][0]
                dy = pts[12][1] - pts[11][1]
                shoulder_angle = np.degrees(np.arctan2(dy, dx))
                analysis_result["shoulder_tilt_deg"] = round(float(shoulder_angle), 2)

            # 2. Inclinación de cadera (Izquierda: 23, Derecha: 24)
            if 23 in pts and 24 in pts:
                dx_hip = pts[24][0] - pts[23][0]
                dy_hip = pts[24][1] - pts[23][1]
                hip_angle = np.degrees(np.arctan2(dy_hip, dx_hip))
                analysis_result["hip_tilt_deg"] = round(float(hip_angle), 2)

            # 3. Proporciones de silueta
            if 11 in pts and 12 in pts and 23 in pts and 24 in pts:
                shoulder_width = np.linalg.norm(np.array(pts[11]) - np.array(pts[12]))
                hip_width = np.linalg.norm(np.array(pts[23]) - np.array(pts[24]))
                ratio = shoulder_width / hip_width if hip_width > 0 else 0
                analysis_result["silhouette_metrics"] = {
                    "shoulder_width_px": float(shoulder_width),
                    "hip_width_px": float(hip_width),
                    "biacromial_biiliac_ratio": round(float(ratio), 2)
                }

        return frame, analysis_result

    def draw_body_hud(self, frame, analysis_result):
        """Dibuja círculos sencillos en los puntos clave detectados sobre el frame."""
        if analysis_result["is_detected"]:
            for idx, pt in analysis_result["landmarks_pixel"].items():
                # Dibujar puntos clave en color verde brillante
                cv2.circle(frame, pt, 4, (0, 255, 0), -1)
        return frame