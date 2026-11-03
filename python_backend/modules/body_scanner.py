# Fase 2: Escaneo corporal, postura y ángulos articulares
import cv2
import mediapipe as mp
import numpy as np

class BodyScanner:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils

    def analyze_posture_and_silhouette(self, frame):
        """
        Procesa un fotograma para extraer puntos corporales,
        analizar postura (inclinación de hombros/cadera) y métricas de silueta.
        """
        h, w, _ = frame.shape
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(image_rgb)
        
        analysis_result = {
            "is_detected": False,
            "shoulder_tilt_deg": 0.0,
            "hip_tilt_deg": 0.0,
            "torso_symmetry": 0.0,
            "silhouette_metrics": {},
            "landmarks_pixel": []
        }

        if results.pose_landmarks:
            analysis_result["is_detected"] = True
            landmarks = results.pose_landmarks.landmark

            # Extraer coordenadas en píxeles de puntos clave
            # Hombros: 11 (izq), 12 (der)
            # Caderas: 23 (izq), 24 (der)
            # Tobillos: 27 (izq), 28 (der)
            pts = {i: (int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in range(len(landmarks))}
            
            analysis_result["landmarks_pixel"] = pts

            # 1. Cálculo de Inclinación de Hombros
            if 11 in pts and 12 in pts:
                dx = pts[12][0] - pts[11][0]
                dy = pts[12][1] - pts[11][1]
                shoulder_angle = np.degrees(np.arctan2(dy, dx))
                analysis_result["shoulder_tilt_deg"] = round(float(shoulder_angle), 2)

            # 2. Cálculo de Inclinación de Cadera
            if 23 in pts and 24 in pts:
                dx_hip = pts[24][0] - pts[23][0]
                dy_hip = pts[24][1] - pts[23][1]
                hip_angle = np.degrees(np.arctan2(dy_hip, dx_hip))
                analysis_result["hip_tilt_deg"] = round(float(hip_angle), 2)

            # 3. Estimación inicial de proporciones de silueta (Anchura de hombros vs cadera)
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

    def draw_body_hud(self, frame, results):
        """Dibuja el esqueleto corporal y las conexiones sobre el frame."""
        if results.pose_landmarks:
            self.mp_drawing.draw_landmarks(
                frame, 
                results.pose_landmarks, 
                self.mp_pose.POSE_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                self.mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2)
            )
        return frame