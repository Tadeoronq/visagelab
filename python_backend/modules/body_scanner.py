import cv2
from modules.body_scanner import BodyScanner

def main():
    print("🚀 Iniciando prueba de Escaneo Corporal con MediaPipe Pose...")
    scanner = BodyScanner()
    
    # Abrir la cámara web (índice 0)
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

        # Analizar postura y silueta (todo el procesamiento moderno ocurre aquí)
        processed_frame, data = scanner.analyze_posture_and_silhouette(frame)
        
        # Dibujar HUD del esqueleto si se detecta el cuerpo
        if data["is_detected"]:
            processed_frame = scanner.draw_body_hud(processed_frame, data)
            print(f"Postura Detectada -> Inclinación Hombros: {data['shoulder_tilt_deg']}° | Inclinación Cadera: {data['hip_tilt_deg']}°", end="\r")

        # Mostrar video en una ventana interactiva
        cv2.imshow("VisageLab - Fase 2: Escaneo Corporal", processed_frame)

        # Salir al presionar la tecla 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("\n👋 Prueba de escaneo corporal finalizada.")

if __name__ == "__main__":
    main()