import cv2
from modules.avatar_rigging import AvatarRigging


# ==========================================
# BLOQUE 1: CONFIGURACIÓN DE CÁMARA Y RIGGING
# ==========================================
def main():
    print("🚀 Iniciando Fase 3: Prueba de Rigging y Coordenadas 3D...")

    # Crea el motor de rigging 3D y abre la cámara web (índice 0)
    rigging = AvatarRigging()
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("❌ Error: No se pudo abrir la cámara web.")
        return

    print("✅ Cámara abierta. Presiona la tecla 'q' para salir.")

    # ==========================================
    # BLOQUE 2: BUCLE EN TIEMPO REAL Y TELEMETRÍA
    # ==========================================
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("⚠️ No se pudo recibir fotograma de la cámara.")
            break

        # Procesa el fotograma actual para obtener coordenadas, vectores y ángulos
        data = rigging.process_frame_3d(frame)

        if data["is_detected"]:
            shoulder_l = data["joints_3d"].get(11, {})
            angles = data["joint_angles_deg"]
            print(
                f"3D Real -> Hombro Izq | X: {shoulder_l.get('x', 0):.2f}m | "
                f"Y: {shoulder_l.get('y', 0):.2f}m | Z: {shoulder_l.get('z', 0):.2f}m | "
                f"Codo I: {angles.get('left_elbow')}° | Codo D: {angles.get('right_elbow')}°",
                end="\r"
            )

        # Muestra la ventana de video de prueba
        cv2.imshow("VisageLab - Fase 3: Rigging Avatar 3D", frame)

        # Finaliza el bucle si se presiona la tecla 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # ==========================================
    # BLOQUE 3: LIMPIEZA DE RECURSOS
    # ==========================================
    cap.release()
    cv2.destroyAllWindows()
    print("\n👋 Prueba de Avatar 3D finalizada.")


if __name__ == "__main__":
    main()