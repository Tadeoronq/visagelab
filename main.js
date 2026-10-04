// Ajuste de Stream para mantener resolución nativa del sensor
async function startCameraStream(deviceId) {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  // Solicitamos resolución nativa sin forzar aspecto cuadrado o deformado
  const constraints = {
    video: deviceId 
      ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
  };

  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = currentStream;
    videoElement.onloadedmetadata = () => {
      videoElement.play();
      
      // Sincronizar las dimensiones del lienzo exactamente con los píxeles reales del sensor
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      
      processVideoFrame();
    };
  } catch (e) {
    console.error("Error al iniciar la cámara con resolución nativa:", e);
  }
}

// Bucle de procesamiento utilizando resolución real
async function processVideoFrame() {
  if (videoElement.paused || videoElement.ended) return;

  // Si la cámara cambia de orientación (móvil horizontal/vertical), reajustar lienzo
  if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
  }

  await faceMesh.send({ image: videoElement });
  requestAnimationFrame(processVideoFrame);
}
