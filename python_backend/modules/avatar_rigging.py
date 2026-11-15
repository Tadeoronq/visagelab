import json
from pathlib import Path
import cv2
import numpy as np
import mediapipe as mp


class AvatarRigging:
    # =========================================================================
    # BLOQUE 1: INICIALIZACIÓN DEL DETECTOR 3D (MEDIAPIPE POSE LANDMARKER)
    # =========================================================================
    def __init__(self):
        # Resolvemos la ruta del modelo 'pose_landmarker.task' dentro de python_backend
        backend_dir = Path(__file__).resolve().parent.parent
        model_path = backend_dir / "pose_landmarker.task"

        # Importamos los submódulos de MediaPipe Tasks API
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision

        # Configuramos el detector para una persona en modo IMAGE;
        # los resultados incluyen coordenadas 3D reales en metros en pose_world_landmarks
        base_options = python.BaseOptions(model_asset_path=str(model_path))
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1
        )
        self.detector = vision.PoseLandmarker.create_from_options(options)

    # =========================================================================
    # BLOQUE 2: CÁLCULO DE VECTORES ÓSEOS Y LONGITUDES EN 3D
    # =========================================================================
    def _joint_to_vector(self, joints_3d, idx_start, idx_end):
        # Verificamos que existan las articulaciones inicial y final del segmento
        if idx_start not in joints_3d or idx_end not in joints_3d:
            return None

        # Obtenemos las coordenadas métricas (x, y, z) de ambos extremos
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

        # Calculamos el vector direccional y su magnitud (longitud en metros)
        vec = p_end - p_start
        return {
            "vector": vec.tolist(),
            "length_m": round(float(np.linalg.norm(vec)), 4)
        }

    # =========================================================================
    # BLOQUE 3: CÁLCULO DE ÁNGULOS ARTICULARES EN ESPACIO 3D
    # =========================================================================
    def _angle_between_joints(self, joints_3d, idx_a, idx_b, idx_c):
        # Verificamos que existan los tres puntos que forman el ángulo en el vértice 'idx_b'
        if not all(k in joints_3d for k in (idx_a, idx_b, idx_c)):
            return None

        a = np.array([joints_3d[idx_a]["x"], joints_3d[idx_a]["y"], joints_3d[idx_a]["z"]], dtype=np.float64)
        b = np.array([joints_3d[idx_b]["x"], joints_3d[idx_b]["y"], joints_3d[idx_b]["z"]], dtype=np.float64)
        c = np.array([joints_3d[idx_c]["x"], joints_3d[idx_c]["y"], joints_3d[idx_c]["z"]], dtype=np.float64)

        # Vectores desde la articulación central 'b' hacia 'a' y 'c'
        ba = a - b
        bc = c - b
        norm_ba = np.linalg.norm(ba)
        norm_bc = np.linalg.norm(bc)

        if norm_ba == 0 or norm_bc == 0:
            return None

        # Obtenemos el ángulo en grados acotando el coseno a [-1.0, 1.0]
        cos_angle = np.clip(np.dot(ba, bc) / (norm_ba * norm_bc), -1.0, 1.0)
        return round(float(np.degrees(np.arccos(cos_angle))), 2)

    # =========================================================================
    # BLOQUE 4: PROCESAMIENTO DEL FOTOGRAMA Y ENSAMBLAJE DEL RIG 3D
    # =========================================================================
    def process_frame_3d(self, frame):
        # Convertimos el fotograma de BGR (OpenCV) a RGB (MediaPipe) y corremos la inferencia
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        results = self.detector.detect(mp_image)

        avatar_data = {
            "is_detected": False,
            "joints_3d": {},
            "bones_3d": {},
            "joint_angles_deg": {}
        }

        if results.pose_world_landmarks and len(results.pose_world_landmarks) > 0:
            avatar_data["is_detected"] = True
            world_landmarks = results.pose_world_landmarks[0]

            # Extraemos las 33 articulaciones en coordenadas métricas (X, Y, Z)
            joints = {
                idx: {
                    "x": float(lm.x),
                    "y": float(lm.y),
                    "z": float(lm.z),
                    "visibility": float(lm.visibility) if hasattr(lm, "visibility") else 1.0
                }
                for idx, lm in enumerate(world_landmarks)
            }
            avatar_data["joints_3d"] = joints

            # Calculamos los vectores y longitudes de los segmentos corporales principales
            avatar_data["bones_3d"] = {
                "left_upper_arm": self._joint_to_vector(joints, 11, 13),
                "left_forearm": self._joint_to_vector(joints, 13, 15),
                "right_upper_arm": self._joint_to_vector(joints, 12, 14),
                "right_forearm": self._joint_to_vector(joints, 14, 16),
                "shoulder_line": self._joint_to_vector(joints, 11, 12),
                "hip_line": self._joint_to_vector(joints, 23, 24),
                "left_thigh": self._joint_to_vector(joints, 23, 25),
                "left_shin": self._joint_to_vector(joints, 25, 27),
                "right_thigh": self._joint_to_vector(joints, 24, 26),
                "right_shin": self._joint_to_vector(joints, 26, 28),
            }

            # Calculamos los ángulos articulares clave para codos, hombros y rodillas
            avatar_data["joint_angles_deg"] = {
                "left_elbow": self._angle_between_joints(joints, 11, 13, 15),
                "right_elbow": self._angle_between_joints(joints, 12, 14, 16),
                "left_shoulder": self._angle_between_joints(joints, 23, 11, 13),
                "right_shoulder": self._angle_between_joints(joints, 24, 12, 14),
                "left_knee": self._angle_between_joints(joints, 23, 25, 27),
                "right_knee": self._angle_between_joints(joints, 24, 26, 28),
            }

        return avatar_data

    # =========================================================================
    # BLOQUE 5: EXPORTACIÓN ESTRUCTURADA EN JSON PARA VISOR 3D / API
    # =========================================================================
    def export_json(self, avatar_data, indent=None):
        # Empaqueta el estado del rig en una cadena JSON lista para WebSockets, API o frontend 3D
        payload = {
            "is_detected": avatar_data.get("is_detected", False),
            "joints_3d": avatar_data.get("joints_3d", {}),
            "bones_3d": avatar_data.get("bones_3d", {}),
            "joint_angles_deg": avatar_data.get("joint_angles_deg", {})
        }
        return json.dumps(payload, indent=indent)