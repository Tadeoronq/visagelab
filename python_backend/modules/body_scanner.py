import cv2
import numpy as np
import mediapipe as mp

class BodyScanner:
    def __init__(self):
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision

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
            landmarks = results.pose_landmarks[0]

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
        """Dibuja una silueta futurista compuesta por micro-triángulos y nodos cibernéticos."""
        if not analysis_result["is_detected"]:
            return frame

        pts = analysis_result["landmarks_pixel"]
        if len(pts) < 10:
            return frame

        h, w, _ = frame.shape
        overlay = frame.copy()

        # Definir los contornos clave para rodear la silueta
        silhouette_chains = [
            [11, 13, 15, 17, 19, 21],  # Brazo izquierdo
            [12, 14, 16, 18, 20, 22],  # Brazo derecho
            [11, 12, 24, 23, 11],       # Torso
            [23, 25, 27, 29, 31],       # Pierna izquierda
            [24, 26, 28, 30, 32]        # Pierna derecha
        ]

        def draw_micro_triangle(img, center, size=5, color=(0, 255, 255)):
            """Dibuja un micro-triángulo equilátero en las coordenadas dadas."""
            cx, cy = center
            pt1 = (cx, cy - size)
            pt2 = (int(cx - size * 0.866), int(cy + size * 0.5))
            pt3 = (int(cx + size * 0.866), int(cy + size * 0.5))
            triangle_cnt = np.array([pt1, pt2, pt3], np.int32)
            cv2.drawContours(img, [triangle_cnt], 0, color, -1, cv2.LINE_AA)

        # 1. Generar micro-triángulos a lo largo de toda la silueta corporal
        for chain in silhouette_chains:
            valid_points = [pts[idx] for idx in chain if idx in pts]
            for i in range(len(valid_points) - 1):
                p1 = np.array(valid_points[i])
                p2 = np.array(valid_points[i + 1])
                dist = np.linalg.norm(p2 - p1)
                
                # Densidad de partículas (1 micro-triángulo cada 12 píxeles)
                num_particles = max(1, int(dist / 12))
                for t in np.linspace(0, 1, num_particles):
                    interp_pt = (p1 * (1 - t) + p2 * t).astype(int)
                    draw_micro_triangle(overlay, tuple(interp_pt), size=4, color=(0, 255, 220)) # Cian / Neón

        # 2. Resplandor sutil envolvente (Efecto Scan Glow)
        hull_pts = np.array(list(pts.values()), dtype=np.int32)
        hull = cv2.convexHull(hull_pts)
        cv2.polylines(overlay, [hull], isClosed=True, color=(0, 200, 255), thickness=1, lineType=cv2.LINE_AA)
        cv2.fillPoly(overlay, [hull], (0, 80, 20)) # Capa verde/cian de escaneo suave

        # Mezclar capa transparente para un acabado pulido
        cv2.addWeighted(overlay, 0.4, frame, 0.6, 0, frame)

        # 3. Nodos principales (Triángulos más grandes y definidos en las articulaciones clave)
        for idx in [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]:
            if idx in pts:
                draw_micro_triangle(frame, pts[idx], size=7, color=(0, 255, 0))

        return frame