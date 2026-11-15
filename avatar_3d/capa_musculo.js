// ============================================================================
// VISAGELAB - CAPA 2: MÚSCULO
// Módulo independiente para grupos musculares, masa segmentaria y medidas
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

/**
 * Crea la Capa 2 (Músculo) acoplada a los puntos de anclaje de la Capa 1
 * (Esqueleto) y configurable por masa muscular segmentaria, grupos estéticos
 * y medidas antropométricas.
 */
export function crearCapaMusculo() {
  // ==========================================================================
  // BLOQUE 1: GRUPO PRINCIPAL, MATERIAL MUSCULAR Y HELPERS GEOMÉTRICOS
  // ==========================================================================
  const group = new THREE.Group();
  group.name = "CapaMusculo";

  const materialMusculo = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#b83b43"),
    roughness: 0.44,
    metalness: 0.08
  });

  function crearHazMuscular(rTop, rBot, largo, segmentos = 18) {
    const geometria = new THREE.CylinderGeometry(rTop, rBot, largo, segmentos);
    const malla = new THREE.Mesh(geometria, materialMusculo);
    malla.castShadow = true;
    malla.receiveShadow = true;
    return malla;
  }

  function crearBloqueMuscular(ancho, alto, profundidad) {
    const geometria = new THREE.BoxGeometry(ancho, alto, profundidad);
    const malla = new THREE.Mesh(geometria, materialMusculo);
    malla.castShadow = true;
    malla.receiveShadow = true;
    return malla;
  }

  // ==========================================================================
  // BLOQUE 2: GRUPOS MUSCULARES DEL TRONCO Y EXTREMIDADES
  // ==========================================================================
  // Tronco: pectorales, espalda (dorsales/trapecio) y abdomen
  const pectoralIzq = crearBloqueMuscular(0.11, 0.11, 0.07);
  const pectoralDer = crearBloqueMuscular(0.11, 0.11, 0.07);
  const espaldaIzq = crearBloqueMuscular(0.10, 0.22, 0.06);
  const espaldaDer = crearBloqueMuscular(0.10, 0.22, 0.06);
  const abdomen = crearBloqueMuscular(0.13, 0.22, 0.07);

  // Extremidades superiores: bíceps, tríceps y antebrazo muscular
  const bicepsIzq = crearHazMuscular(0.036, 0.030, 0.18);
  const tricepsIzq = crearHazMuscular(0.036, 0.030, 0.18);
  const antebrazoMuscIzq = crearHazMuscular(0.034, 0.026, 0.22);

  const bicepsDer = crearHazMuscular(0.036, 0.030, 0.18);
  const tricepsDer = crearHazMuscular(0.036, 0.030, 0.18);
  const antebrazoMuscDer = crearHazMuscular(0.034, 0.026, 0.22);

  // Extremidades inferiores: cuádriceps/muslo y pantorrilla/gemelos
  const cuadricepsIzq = crearHazMuscular(0.068, 0.048, 0.34);
  const pantorrillaIzq = crearHazMuscular(0.046, 0.032, 0.30);

  const cuadricepsDer = crearHazMuscular(0.068, 0.048, 0.34);
  const pantorrillaDer = crearHazMuscular(0.046, 0.032, 0.30);

  group.add(
    pectoralIzq,
    pectoralDer,
    espaldaIzq,
    espaldaDer,
    abdomen,
    bicepsIzq,
    tricepsIzq,
    antebrazoMuscIzq,
    bicepsDer,
    tricepsDer,
    antebrazoMuscDer,
    cuadricepsIzq,
    pantorrillaIzq,
    cuadricepsDer,
    pantorrillaDer
  );

  // ==========================================================================
  // BLOQUE 3: ACTUALIZACIÓN MUSCULAR ACOPLADA A ESQUELETO Y MÉTRICAS
  // ==========================================================================
  /**
   * Actualiza la capa muscular según parámetros de postura/escala, masa segmentaria
   * (kg), grupos estéticos y medidas antropométricas.
   *
   * @param {Object} params
   * @param {Object} [params.anclajes] - Puntos de anclaje devueltos por crearCapaEsqueleto()
   * @param {number} [params.estaturaCm=175]
   * @param {number} [params.anchoHombros=1.0]
   * @param {number} [params.anchoCadera=1.0]
   * @param {number} [params.escoliosisDeg=0]
   * @param {number} [params.cifosisDeg=0]
   * @param {number} [params.hombrosAdelantadosDeg=0]
   * @param {number} [params.musculoTroncoKg=18.5]
   * @param {number} [params.musculoSupIzqKg=3.7]
   * @param {number} [params.musculoSupDerKg=3.8]
   * @param {number} [params.musculoInfIzqKg=9.4]
   * @param {number} [params.musculoInfDerKg=9.5]
   * @param {number} [params.pechoPct=100]
   * @param {number} [params.espaldaPct=100]
   * @param {number} [params.abdomenPct=100]
   * @param {number} [params.bicepsPct=100]
   * @param {number} [params.tricepsPct=100]
   * @param {number} [params.cuadricepsPct=100]
   * @param {number} [params.pantorrillaPct=100]
   * @param {number} [params.bicepsCm=35]
   * @param {number} [params.tricepsCm=33]
   * @param {number} [params.largoBrazoCm=60]
   * @param {number} [params.pechoCm=100]
   * @param {number} [params.cinturaCm=80]
   * @param {number} [params.musloCm=56]
   * @param {number} [params.largoPiernaCm=84]
   */
  function actualizar(params = {}) {
    const estaturaCm = params.estaturaCm ?? 175;
    const anchoHombros = params.anchoHombros ?? 1.0;
    const anchoCadera = params.anchoCadera ?? 1.0;

    const escoliosisDeg = params.escoliosisDeg ?? params.desviacionColumnaDeg ?? 0;
    const cifosisDeg = params.cifosisDeg ?? 0;
    const hombrosAdelantadosDeg = params.hombrosAdelantadosDeg ?? 0;

    const escolRad = THREE.MathUtils.degToRad(escoliosisDeg);
    const cifoRad = THREE.MathUtils.degToRad(cifosisDeg);
    const protraccionRad = THREE.MathUtils.degToRad(hombrosAdelantadosDeg);

    const escalaAltura = estaturaCm / 175;
    const margenTobillo = 0.03 * escalaAltura;
    const largoPiernaM = ((params.largoPiernaCm ?? 84) / 84) * 0.84 * escalaAltura;
    const segPierna = largoPiernaM * 0.5;
    const yCadera = params.anclajes?.pelvis?.y ?? (margenTobillo + largoPiernaM * 2);

    // Masa muscular segmentaria (kg)
    const muscTroncoKg = params.musculoTroncoKg ?? 18.5;
    const muscSupIzqKg = params.musculoSupIzqKg ?? 3.7;
    const muscSupDerKg = params.musculoSupDerKg ?? 3.8;
    const muscInfIzqKg = params.musculoInfIzqKg ?? 9.4;
    const muscInfDerKg = params.musculoInfDerKg ?? 9.5;

    // Grupos musculares estéticos (porcentaje base 100%)
    const fPecho = (params.pechoPct ?? 100) / 100;
    const fEspalda = (params.espaldaPct ?? 100) / 100;
    const fAbdomen = (params.abdomenPct ?? 100) / 100;
    const fBiceps = (params.bicepsPct ?? 100) / 100;
    const fTriceps = (params.tricepsPct ?? 100) / 100;
    const fCuadriceps = (params.cuadricepsPct ?? 100) / 100;
    const fPantorrilla = (params.pantorrillaPct ?? 100) / 100;

    // Medidas antropométricas
    const bicepsCm = params.bicepsCm ?? 35;
    const tricepsCm = params.tricepsCm ?? 33;
    const largoBrazoM = ((params.largoBrazoCm ?? 60) / 60) * 0.54 * escalaAltura;
    const pechoCm = params.pechoCm ?? 100;
    const cinturaCm = params.cinturaCm ?? 80;
    const musloCm = params.musloCm ?? 56;

    const factorTroncoKg = 0.75 + (muscTroncoKg / 18.5) * 0.35;
    const anchoTorsoBase = anchoHombros * (0.82 + pechoCm / 200);
    const anchoCinturaBase = anchoCadera * (0.75 + cinturaCm / 220);

    // Posición de referencia del tronco alineada con la postura del esqueleto
    const dxTorax = params.anclajes?.torax?.x ?? (Math.sin(escolRad) * 0.26 * escalaAltura);
    const yTorax = params.anclajes?.torax?.y ?? (yCadera + 0.39 * escalaAltura);
    const dzTorax = params.anclajes?.torax?.z ?? (Math.sin(cifoRad) * 0.20 * escalaAltura);

    const dxAbdomen = Math.sin(escolRad * 0.5) * 0.11 * escalaAltura;
    const yAbdomen = yCadera + 0.14 * escalaAltura;
    const dzAbdomen = Math.sin(cifoRad * 0.35) * 0.08 * escalaAltura;

    // Pectorales
    pectoralIzq.scale.set(fPecho * anchoTorsoBase, fPecho * escalaAltura, fPecho * factorTroncoKg);
    pectoralIzq.position.set(dxTorax - 0.062 * anchoTorsoBase, yTorax + 0.035 * escalaAltura, dzTorax + 0.072);
    pectoralIzq.rotation.set(cifoRad, 0, -escolRad);

    pectoralDer.scale.set(fPecho * anchoTorsoBase, fPecho * escalaAltura, fPecho * factorTroncoKg);
    pectoralDer.position.set(dxTorax + 0.062 * anchoTorsoBase, yTorax + 0.035 * escalaAltura, dzTorax + 0.072);
    pectoralDer.rotation.set(cifoRad, 0, -escolRad);

    // Espalda (dorsales / trapecio)
    espaldaIzq.scale.set(fEspalda * anchoTorsoBase, fEspalda * escalaAltura, fEspalda * factorTroncoKg);
    espaldaIzq.position.set(dxTorax - 0.075 * anchoTorsoBase, yTorax - 0.015 * escalaAltura, dzTorax - 0.065);
    espaldaIzq.rotation.set(cifoRad, 0, -escolRad);

    espaldaDer.scale.set(fEspalda * anchoTorsoBase, fEspalda * escalaAltura, fEspalda * factorTroncoKg);
    espaldaDer.position.set(dxTorax + 0.075 * anchoTorsoBase, yTorax - 0.015 * escalaAltura, dzTorax - 0.065);
    espaldaDer.rotation.set(cifoRad, 0, -escolRad);

    // Abdomen
    abdomen.scale.set(fAbdomen * anchoCinturaBase * factorTroncoKg, fAbdomen * escalaAltura, fAbdomen * factorTroncoKg);
    abdomen.position.set(dxAbdomen, yAbdomen, dzAbdomen + 0.035);
    abdomen.rotation.set(cifoRad * 0.35, 0, -escolRad * 0.5);

    // Extremidades superiores
    const segBrazo = largoBrazoM * 0.52;
    const segAnt = largoBrazoM * 0.48;
    const angAbertura = 0.22;
    const grosorBicepsBase = bicepsCm / 35;
    const grosorTricepsBase = tricepsCm / 33;

    function actualizarBrazo(ladoSigno, muscKg, anclaHombro, mBic, mTri, mAnt) {
      const fKg = 0.78 + (muscKg / 12);
      const xHombro = anclaHombro?.x ?? (dxTorax + ladoSigno * 0.19 * anchoHombros);
      const yHombro = anclaHombro?.y ?? (yCadera + 0.49 * escalaAltura);
      const zHombro = anclaHombro?.z ?? (dzTorax + Math.sin(protraccionRad) * 0.14 * escalaAltura);

      const cx1 = xHombro + ladoSigno * Math.sin(angAbertura) * (segBrazo * 0.5);
      const cy1 = yHombro - Math.cos(angAbertura) * (segBrazo * 0.5);
      const cz1 = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.4);

      const fBic = fBiceps * grosorBicepsBase * fKg;
      mBic.scale.set(fBic, segBrazo / 0.18, fBic);
      mBic.position.set(cx1, cy1, cz1 + 0.022);
      mBic.rotation.set(protraccionRad * 0.65, 0, ladoSigno * angAbertura);

      const fTri = fTriceps * grosorTricepsBase * fKg;
      mTri.scale.set(fTri, segBrazo / 0.18, fTri);
      mTri.position.set(cx1, cy1, cz1 - 0.022);
      mTri.rotation.set(protraccionRad * 0.65, 0, ladoSigno * angAbertura);

      const xCodo = xHombro + ladoSigno * Math.sin(angAbertura) * segBrazo;
      const yCodo = yHombro - Math.cos(angAbertura) * segBrazo;
      const zCodo = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.8);
      const angAnt = angAbertura + 0.08;

      const cx2 = xCodo + ladoSigno * Math.sin(angAnt) * (segAnt * 0.5);
      const cy2 = yCodo - Math.cos(angAnt) * (segAnt * 0.5);
      const cz2 = zCodo + Math.sin(protraccionRad * 0.4) * (segAnt * 0.4);

      const fAnt = (0.85 + fKg * 0.15) * grosorBicepsBase;
      mAnt.scale.set(fAnt, segAnt / 0.22, fAnt);
      mAnt.position.set(cx2, cy2, cz2);
      mAnt.rotation.set(protraccionRad * 0.4, 0, ladoSigno * angAnt);
    }

    actualizarBrazo(-1, muscSupIzqKg, params.anclajes?.hombroIzq, bicepsIzq, tricepsIzq, antebrazoMuscIzq);
    actualizarBrazo(1, muscSupDerKg, params.anclajes?.hombroDer, bicepsDer, tricepsDer, antebrazoMuscDer);

    // Extremidades inferiores
    const grosorMusloBase = musloCm / 56;
    const sepPierna = 0.105 * anchoCadera;

    function actualizarPierna(xDefault, muscKg, anclaCadera, mCuad, mPant) {
      const fKg = 0.78 + (muscKg / 24);
      const xPos = anclaCadera?.x ?? xDefault;
      const yMus = margenTobillo + segPierna * 1.5;
      const yPan = margenTobillo + segPierna * 0.5;

      const fCuad = fCuadriceps * grosorMusloBase * fKg;
      mCuad.scale.set(fCuad, segPierna / 0.34, fCuad);
      mCuad.position.set(xPos, yMus, 0.022);

      const fPan = fPantorrilla * grosorMusloBase * 0.75 * fKg;
      mPant.scale.set(fPan, segPierna / 0.30, fPan);
      mPant.position.set(xPos, yPan, -0.020);
    }

    actualizarPierna(-sepPierna, muscInfIzqKg, params.anclajes?.caderaIzq, cuadricepsIzq, pantorrillaIzq);
    actualizarPierna(sepPierna, muscInfDerKg, params.anclajes?.caderaDer, cuadricepsDer, pantorrillaDer);
  }

  actualizar();

  return { group, actualizar };
}