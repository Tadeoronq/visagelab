import cv2
import numpy as np
from modules.avatar_rigging import AvatarRigging


# =========================================================================
# BLOQUE 1: DEFINICIÓN DE CONEXIONES Y PROYECCIÓN 3D A PANTALLA (OPENCV)
# =========================================================================
SKELETON_CONNECTIONS = [
    (11, 12), (11, 23), (12, 24), (23, 24),  # Torso y cadera
    (11, 13), (13, 15),                    # Brazo y antebrazo izquierdos
    (12, 14), (14, 16),                    # Brazo y antebrazo derechos
    (23, 25), (25, 27),                    # Muslo y espinilla izquierdos
    (24, 26), (26, 28)                     # Muslo y espinilla derechos
]


def _project_joint_3d(joint, width=520, height=520, scale=220.0):
    # Extrae coordenadas en metros (x: horizontal, y: vertical, z: profundidad)
    x = joint["x"]
    y = joint["y"]
    z = joint["z"]

    # Aplica una perspectiva suave según la profundidad 'z' para dar sensación de 3D
    factor = 1.0 / max(0.35, 1.0 + z * 0.45)

    # Centra el origen (0, 0, 0) en el lienzo y desplaza ligeramente en X según Z
    cx = width // 2
    cy = height // 2 + 40
    px = int(cx + (x + z * 0.25) * scale * factor)
    py = int(cy + y * scale * factor)
    return (px, py)


# =========================================================================
# BLOQUE 2: RENDERIZADO DEL VISOR DEL ESQUELETO 3D EN TIEMPO REAL
# =========================================================================
def _render_skeleton_canvas(joints_3d, angles_deg, width=520, height=520):
    # Crea un lienzo oscuro tipo visor técnico
    canvas = np.zeros((height, width, 3), dtype=np.uint8)
    canvas[:] = (18, 20, 26)

    # Dibuja ejes de referencia (centro horizontal y vertical)
    cv2.line(canvas, (0, height // 2 + 40), (width, height // 2 + 40), (45, 50, 62), 1)
    cv2.line(canvas, (width // 2, 0), (width // 2, height), (45, 50, 62), 1)

    if not joints_3d:
        cv2.putText(
            canvas, "Sin pose 3D detectada", (20, 35),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 180, 255), 2
        )
        return canvas

    # Proyecta todas las articulaciones 3D disponibles a coordenadas de píxel en el lienzo
    projected = {
        idx: _project_joint_3d(joint, width=width, height=height)
        for idx, joint in joints_3d.items()
    }

    # Dibuja los segmentos óseos que conectan las articulaciones
    for idx_a, idx_b in SKELETON_CONNECTIONS:
        if idx_a in projected and idx_b in projected:
            cv2.line(canvas, projected[idx_a], projected[idx_b], (0, 255, 140), 2, cv2.LINE_AA)

    # Dibuja los nodos articulares
    for idx, pt in projected.items():
        color = (0, 255, 255) if idx in (11, 12, 13, 14, 23, 24, 25, 26) else (255, 200, 80)
        cv2.circle(canvas, pt, 5, color, -1, cv2.LINE_AA)

    # Muestra en pantalla los ángulos principales calculados en 3D
    info_lines = [
        "VisageLab - Rig Esqueleto 3D",
        f"Codo I: {angles_deg.get('left_elbow')} deg | Codo D: {angles_deg.get('right_elbow')} deg",
        f"Hombro I: {angles_deg.get('left_shoulder')} deg | Hombro D: {angles_deg.get('right_shoulder')} deg"
    ]
    for i, text in enumerate(info_lines):
        cv2.putText(
            canvas, text, (16, 28 + i * 24),
            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (230, 240, 255), 1, cv2.LINE_AA
        )

    return canvas


# =========================================================================
# BLOQUE 3: BUCLE PRINCIPAL DE CÁMARA, RIGGING 3D Y EXPORTACIÓN JSON
# =========================================================================
def main():
    print("🚀 Iniciando Fase 3: Prueba de Rigging 3D, Visor Esqueleto y JSON...")
    rigging = AvatarRigging()
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("❌ Error: No se pudo abrir la cámara web.")
        return

    print("✅ Cámara abierta. Presiona la tecla 'q' para salir.")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("⚠️ No se pudo recibir fotograma de la cámara.")
            break

        # Procesa el fotograma para obtener coordenadas 3D, huesos, ángulos y JSON
        data = rigging.process_frame_3d(frame)
        json_payload = rigging.export_json(data)

        if data["is_detected"]:
            angles = data["joint_angles_deg"]
            shoulder_l = data["joints_3d"].get(11, {})
            print(
                f"Hombro I ({shoulder_l.get('x', 0):.2f}m, {shoulder_l.get('y', 0):.2f}m, {shoulder_l.get('z', 0):.2f}m) | "
                f"Codo I: {angles.get('left_elbow')}° | Codo D: {angles.get('right_elbow')}° | "
                f"JSON bytes: {len(json_payload.encode('utf-8'))}",
                end="\r"
            )
            skeleton_view = _render_skeleton_canvas(data["joints_3d"], angles)
        else:
            skeleton_view = _render_skeleton_canvas({}, {})

        # Muestra la cámara y el visor del esqueleto 3D en paralelo
        cv2.imshow("VisageLab - Fase 3: Rigging Avatar 3D", frame)
        cv2.imshow("VisageLab - Visor Esqueleto 3D", skeleton_view)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    # =========================================================================
    # BLOQUE 4: LIBERACIÓN DE RECURSOS
    # =========================================================================
    cap.release()
    cv2.destroyAllWindows()
    print("\n👋 Prueba de Avatar 3D finalizada.")


if __name__ == "__main__":
    main()