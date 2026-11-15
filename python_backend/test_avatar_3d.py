import cv2
import matplotlib.pyplot as plt
from modules.avatar_rigging import AvatarRigging


# =========================================================================
# BLOQUE 1: INICIALIZACIÓN DEL VISOR 3D INTERACTIVO (MATPLOTLIB)
# =========================================================================
def _init_3d_skeleton_plot():
    # Activamos el modo interactivo para que la ventana 3D se actualice en tiempo real
    plt.ion()
    fig = plt.figure(figsize=(6, 6))
    ax = fig.add_subplot(111, projection="3d")
    ax.set_title("VisageLab - Esqueleto 3D (metros)")
    ax.set_xlabel("X (m)")
    ax.set_ylabel("Z Profundidad (m)")
    ax.set_zlabel("Y Altura (m)")

    # Pares de articulaciones (índices de MediaPipe Pose) que forman el esqueleto
    connections = [
        (11, 12), (11, 23), (12, 24), (23, 24),  # Torso y cadera
        (11, 13), (13, 15),                    # Brazo y antebrazo izquierdos
        (12, 14), (14, 16),                    # Brazo y antebrazo derechos
        (23, 25), (25, 27),                    # Muslo y espinilla izquierdos
        (24, 26), (26, 28)                     # Muslo y espinilla derechos
    ]
    return fig, ax, connections


# =========================================================================
# BLOQUE 2: ACTUALIZACIÓN EN TIEMPO REAL DE ARTICULACIONES Y SEGMENTOS 3D
# =========================================================================
def _update_3d_skeleton_plot(ax, connections, joints_3d):
    # Limpiamos los ejes anteriores antes de dibujar la postura del fotograma actual
    ax.cla()
    ax.set_title("VisageLab - Esqueleto 3D (metros)")
    ax.set_xlabel("X (m)")
    ax.set_ylabel("Z Profundidad (m)")
    ax.set_zlabel("Y Altura (m)")

    # Mantenemos límites métricos fijos para observar desplazamientos y profundidad con estabilidad
    ax.set_xlim(-1.0, 1.0)
    ax.set_ylim(-1.0, 1.0)
    ax.set_zlim(-1.0, 1.0)

    if not joints_3d:
        plt.pause(0.001)
        return

    # Extraemos coordenadas (x, z, -y) para que la altura positiva apunte hacia arriba en la gráfica
    xs = [j["x"] for j in joints_3d.values()]
    zs = [j["z"] for j in joints_3d.values()]
    ys = [-j["y"] for j in joints_3d.values()]
    ax.scatter(xs, zs, ys, c="cyan", s=22)

    # Dibujamos cada hueso o segmento conectando las articulaciones en el espacio 3D
    for idx_a, idx_b in connections:
        if idx_a in joints_3d and idx_b in joints_3d:
            ja, jb = joints_3d[idx_a], joints_3d[idx_b]
            ax.plot(
                [ja["x"], jb["x"]],
                [ja["z"], jb["z"]],
                [-ja["y"], -jb["y"]],
                c="lime",
                linewidth=2
            )

    plt.pause(0.001)


# =========================================================================
# BLOQUE 3: BUCLE PRINCIPAL DE CÁMARA, RIGGING 3D Y EXPORTACIÓN JSON
# =========================================================================
def main():
    print("🚀 Iniciando Fase 3: Prueba de Rigging 3D, Matplotlib y JSON...")

    # Instanciamos el módulo de rigging 3D y abrimos la cámara web predeterminada
    rigging = AvatarRigging()
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("❌ Error: No se pudo abrir la cámara web.")
        return

    _, ax, connections = _init_3d_skeleton_plot()
    print("✅ Cámara y gráfica 3D iniciadas. Presiona 'q' en la ventana de video para salir.")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("⚠️ No se pudo recibir fotograma de la cámara.")
            break

        # Procesamos el fotograma en 3D y generamos la representación JSON para el visor/API
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
            _update_3d_skeleton_plot(ax, connections, data["joints_3d"])
        else:
            _update_3d_skeleton_plot(ax, connections, {})

        # Mostramos el feed de cámara y escuchamos la tecla 'q' para terminar
        cv2.imshow("VisageLab - Fase 3: Rigging Avatar 3D", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    # =========================================================================
    # BLOQUE 4: LIBERACIÓN DE RECURSOS Y CIERRE DE VENTANAS
    # =========================================================================
    cap.release()
    cv2.destroyAllWindows()
    plt.close("all")
    print("\n👋 Prueba de Avatar 3D finalizada.")


if __name__ == "__main__":
    main()