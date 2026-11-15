// ============================================================================
// VISAGELAB - CAPA 1: SISTEMA ESQUELÉTICO (FK, 12 PARÁMETROS Y SOPORTE GLB/PBR)
// ============================================================================

// ============================================================================
// [BLOQUE 1] IMPORTACIONES, TEXTURA ÓSEA PBR Y CONSTRUCTORES GEOMÉTRICOS
// Función: Carga Three.js y GLTFLoader, sintetiza en canvas la textura de
// porosidad cortical del hueso y define los generadores procedurales de
// diáfisis orgánicas y vértebras articuladas.
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

// Genera mapa difuso y bump de porosidad ósea cortical sobre un canvas 2D
function crearTexturaPorosidadOsea() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#efe8d8";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 0.4 + Math.random() * 1.3;
    ctx.fillStyle = Math.random() > 0.48
      ? "rgba(176, 162, 138, 0.24)"
      : "rgba(255, 252, 245, 0.30)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Construye un hueso largo con epífisis ensanchadas y diáfisis estrecha mediante torno
function crearDiafisis(rExtremos, rCentro, largo, segRadial = 24, segCurva = 18) {
  const puntos = [
    new THREE.Vector2(0.001, -largo * 0.5),
    new THREE.Vector2(rExtremos * 1.18, -largo * 0.43),
    new THREE.Vector2(rExtremos, -largo * 0.32),
    new THREE.Vector2(rCentro, 0),
    new THREE.Vector2(rExtremos, largo * 0.32),
    new THREE.Vector2(rExtremos * 1.18, largo * 0.43),
    new THREE.Vector2(0.001, largo * 0.5)
  ];
  const curva = new THREE.SplineCurve(puntos);
  const geo = new THREE.LatheGeometry(curva.getPoints(segCurva), segRadial);
  geo.computeVertexNormals();
  return geo;
}

// Construye una vértebra con cuerpo cilíndrico, disco intervertebral y apófisis
function crearVertebra(radioCuerpo, altura, matHueso, matDisco) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(
    new THREE.CylinderGeometry(radioCuerpo * 0.96, radioCuerpo, altura * 0.76, 18),
    matHueso
  );
  cuerpo.scale.set(1.12, 1, 0.92);
  cuerpo.castShadow = true;
  cuerpo.receiveShadow = true;

  const disco = new THREE.Mesh(
    new THREE.CylinderGeometry(radioCuerpo * 0.98, radioCuerpo * 0.98, altura * 0.24, 18),
    matDisco
  );
  disco.scale.set(1.12, 1, 0.92);
  disco.position.y = altura * 0.5;

  const espinosa = new THREE.Mesh(
    new THREE.BoxGeometry(radioCuerpo * 0.24, altura * 0.55, radioCuerpo * 1.15),
    matHueso
  );
  espinosa.position.set(0, -altura * 0.05, -radioCuerpo * 1.15);
  espinosa.rotation.x = 0.28;
  espinosa.castShadow = true;

  const transversa = new THREE.Mesh(
    new THREE.BoxGeometry(radioCuerpo * 2.5, altura * 0.26, radioCuerpo * 0.28),
    matHueso
  );
  transversa.position.set(0, 0, -radioCuerpo * 0.65);

  g.add(cuerpo, disco, espinosa, transversa);
  return g;
}