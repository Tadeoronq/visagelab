from pathlib import Path
import cv2
import numpy as np
import mediapipe as mp


class AvatarRigging:
    # =========================================================================
    # BLOQUE 1: INICIALIZACIÓN DEL MODELO Y DETECTOR 3D (MEDIAPIPE TASKS)
    # =========================================================================
    def __init__(self):
        # Resolvemos la ruta absoluta hacia 'pose_landmarker.task' dentro de python_backend
        # para que el archivo siempre se encuentre sin importar desde qué carpeta se ejecute el script
        backend_dir = Path(__file__).resolve().parent.parent
        model_path = backend_dir / "pose_landmarker.task"

        # Importamos los módulos modernos de MediaPipe Tasks
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision

        # Cargamos el archivo del modelo de pose y configuramos PoseLandmarker en modo IMAGE
        # para 1 persona; el resultado incluye automáticamente las coordenadas 3D en metros (pose_world_landmarks)
        base_options = python.BaseOptions(model_asset_path=str(model_path))
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1
        )
        self.detector = vision.PoseLandmarker.create_from_options(options)

    # =========================================================================
    # BLOQUE 2: CÁLCULO DE VECTORES ÓSEOS Y LONGITUDES EN ESPACIO 3D
    # =========================================================================
    def _joint_to_vector(self, joints_3d, idx_start, idx_end):
        # Verificamos que existan las dos articulaciones que forman el segmento o hueso
        if idx_start not in joints_3d or idx_end not in joints_3d:
            return None

        # Obtenemos las coordenadas (x, y, z) en metros del punto inicial y del punto final
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

        # Calculamos el vector direccional (p_end - p_start) y su longitud euclidiana en metros
        vec = p_end - p_start
        return {
            "vector": vec.tolist(),
            "length_m": round(float(np.linalg.norm(vec)), 4)
        }

    # =========================================================================
    # BLOQUE 3: CÁLCULO DE ÁNGULOS ARTICULARES EN 3D (FLEXIÓN / EXTENSIÓN)
    # =========================================================================
    def _angle_between_joints(self, joints_3d, idx_a, idx_b, idx_c):
        # Validamos que existan los tres puntos: A -> B (articulación central/vértice) -> C
        if not all(k in joints_3d for k in (idx_a, idx_b, idx_c)):
            return None

        # Extraemos las posiciones 3D en metros de cada articulación
        a = np.array([joints_3d[idx_a]["x"], joints_3d[idx_a]["y"], joints_3d[idx_a]["z"]], dtype=np.float64)
        b = np.array([joints_3d[idx_b]["x"], joints_3d[idx_b]["y"], joints_3d[idx_b]["z"]], dtype=np.float64)
        c = np.array([joints_3d[idx_c]["x"], joints_3d[idx_c]["y"], joints_3d[idx_c]["z"]], dtype=np.float64)

        # Construimos los vectores que parten desde el vértice 'b' hacia 'a' y 'c'
        ba = a - b
        bc = c - b
        norm_ba = np.linalg.norm(ba)
        norm_bc = np.linalg.norm(bc)

        # Evitamos divisiones entre cero si algún segmento tiene magnitud nula
        if norm_ba == 0 or norm_bc == 0:
            return None

        # Calculamos el ángulo en grados usando producto punto y arco coseno acotado a [-1.0, 1.0]
        cos_angle = np.clip(np.dot(ba, bc) / (norm_ba * norm_bc), -1.0, 1.0)
        return round(float(np.degrees(np.arccos(cos_angle))), 2)

    # =========================================================================
    # BLOQUE 4: PROCESAMIENTO DEL FOTOGRAMA Y ENSAMBLAJE DE DATOS DEL RIG 3D
    # =========================================================================
    def process_frame_3d(self, frame):
        # Convertimos el fotograma de BGR (OpenCV) a RGB (MediaPipe) y ejecutamos la detección
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        results = self.detector.detect(mp_image)

        # Preparamos el diccionario de salida estructurado para el rig del avatar 3D
        avatar_data = {
            "is_detected": False,
            "joints_3d": {},
            "bones_3d": {},
            "joint_angles_deg": {}
        }

        # Si se detectaron coordenadas mundiales 3D, extraemos articulaciones, huesos y ángulos
        if results.pose_world_landmarks and len(results.pose_world_landmarks) > 0:
            avatar_data["is_detected"] = True
            world_landmarks = results.pose_world_landmarks[0]

            # Guardamos cada articulación con sus coordenadas (x, y, z) en metros y visibilidad
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

            # Calculamos los vectores y longitudes de los segmentos de brazos y antebrazos
            avatar_data["bones_3d"] = {
                "left_upper_arm": self._joint_to_vector(joints, 11, 13),
                "left_forearm": self._joint_to_vector(joints, 13, 15),
                "right_upper_arm": self._joint_to_vector(joints, 12, 14),
                "right_forearm": self._joint_to_vector(joints, 14, 16),
            }

            # Calculamos los ángulos en grados de ambos codos para orientar la articulación
            avatar_data["joint_angles_deg"] = {
                "left_elbow": self._angle_between_joints(joints, 11, 13, 15),
                "right_elbow": self._angle_between_joints(joints, 12, 14, 16),
            }

        return avatar_data