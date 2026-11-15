import cv2
import numpy as np
import mediapipe as mp


# ==========================================
# BLOQUE 1: INICIALIZACIÓN DEL DETECTOR 3D
# ==========================================
class AvatarRigging:
    def __init__(self):
        # Importamos la API moderna de MediaPipe Tasks para evitar módulos legados
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision

        # Cargamos el modelo entrenado de pose desde el archivo local
        base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')

        # Activamos output_pose_world_landmarks=True para obtener coordenadas 3D reales en metros
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            output_pose_world_landmarks=True
        )
        self.detector = vision.PoseLandmarker.create_from_options(options)

    # ==========================================
    # BLOQUE 2: VECTORES ÓSEOS Y LONGITUDES EN 3D
    # ==========================================
    def _joint_to_vector(self, joints_3d, idx_start, idx_end):
        # Comprueba que existan ambos puntos de referencia
        if idx_start not in joints_3d or idx_end not in joints_3d:
            return None

        # Convierte las coordenadas (x, y, z) en metros a vectores de NumPy
        p_start = np.array([
            joints_3d[idx_start]["x"],
            joints_3d[idx_start]["y"],
            joints_3d[idx_start]["z"]
        ], dtype=np.float64)

        p_end = np.array([
            joints_3d[idx_end]["x"],
            joints_3d[idx_end]["y"],
            joints_3d[idx_end]["z"]
        ], dtype=np.float64)

        # Calcula el vector direccional y la distancia euclidiana (longitud en metros)
        vec = p_end - p_start
        length_m = float(np.linalg.norm(vec))

        return {
            "vector": vec.tolist(),
            "length_m": round(length_m, 4)
        }

    # ==========================================
    # BLOQUE 3: ÁNGULOS ARTICULARES EN ESPACIO 3D
    # ==========================================
    def _angle_between_joints(self, joints_3d, idx_a, idx_b, idx_c):
        # Necesita tres articulaciones: A -> B (vértice central) -> C
        if not all(k in joints_3d for k in (idx_a, idx_b, idx_c)):
            return None

        a = np.array([joints_3d[idx_a]["x"], joints_3d[idx_a]["y"], joints_3d[idx_a]["z"]], dtype=np.float64)
        b = np.array([joints_3d[idx_b]["x"], joints_3d[idx_b]["y"], joints_3d[idx_b]["z"]], dtype=np.float64)
        c = np.array([joints_3d[idx_c]["x"], joints_3d[idx_c]["y"], joints_3d[idx_c]["z"]], dtype=np.float64)

        # Vectores desde la articulación central 'b' hacia los extremos 'a' y 'c'
        ba = a - b
        bc = c - b

        norm_ba = np.linalg.norm(ba)
        norm_bc = np.linalg.norm(bc)
        if norm_ba == 0 or norm_bc == 0:
            return None

        # Calcula el ángulo en grados usando producto punto y arco coseno acotado
        cos_angle = np.clip(np.dot(ba, bc) / (norm_ba * norm_bc), -1.0, 1.0)
        return round(float(np.degrees(np.arccos(cos_angle))), 2)

    # ==========================================
    # BLOQUE 4: PROCESAMIENTO DEL FOTOGRAMA Y ENSAMBLAJE
    # ==========================================
    def process_frame_3d(self, frame):
        # Convierte la imagen de BGR (OpenCV) a RGB (MediaPipe) y ejecuta la inferencia
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        results = self.detector.detect(mp_image)

        avatar_data = {
            "is_detected": False,
            "joints_3d": {},
            "bones_3d": {},
            "joint_angles_deg": {}
        }

        # Si hay pose 3D detectada, extrae puntos, vectores de segmentos y ángulos
        if results.pose_world_landmarks and len(results.pose_world_landmarks) > 0:
            avatar_data["is_detected"] = True
            world_landmarks = results.pose_world_landmarks[0]

            joints = {}
            for idx, landmark in enumerate(world_landmarks):
                joints[idx] = {
                    "x": float(landmark.x),  # Ancho en metros (origen centrado en cadera)
                    "y": float(landmark.y),  # Altura en metros
                    "z": float(landmark.z),  # Profundidad en metros
                    "visibility": float(landmark.visibility) if hasattr(landmark, 'visibility') else 1.0
                }
            avatar_data["joints_3d"] = joints

            # Segmentos principales de extremidades superiores
            avatar_data["bones_3d"] = {
                "left_upper_arm": self._joint_to_vector(joints, 11, 13),
                "left_forearm": self._joint_to_vector(joints, 13, 15),
                "right_upper_arm": self._joint_to_vector(joints, 12, 14),
                "right_forearm": self._joint_to_vector(joints, 14, 16),
            }

            # Ángulos de flexión/extensión en codos
            avatar_data["joint_angles_deg"] = {
                "left_elbow": self._angle_between_joints(joints, 11, 13, 15),
                "right_elbow": self._angle_between_joints(joints, 12, 14, 16),
            }

        return avatar_data