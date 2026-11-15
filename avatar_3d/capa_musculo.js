// ============================================================================
// VISAGELAB - CAPA 2: MÚSCULO HUMANO ANATÓMICO
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

function crearVientreMuscular(rExtremos, rVientre, largo, segRadial = 24, segAlto = 18) {
  const puntos = [
    new THREE.Vector2(0.001, -largo * 0.5),
    new THREE.Vector2(rExtremos, -largo * 0.42),
    new THREE.Vector2(rVientre * 0.92, -largo * 0.18),
    new THREE.Vector2(rVientre, 0),
    new THREE.Vector2(rVientre * 0.92, largo * 0.18),
    new THREE.Vector2(rExtremos, largo * 0.42),
    new THREE.Vector2(0.001, largo * 0.5)
  ];
  const curva = new THREE.SplineCurve(puntos);
  const geo = new THREE.LatheGeometry(curva.getPoints(segAlto), segRadial);
  geo.computeVertexNormals();
  return geo;
}

export function crearCapaMusculo() {
  const group = new THREE.Group();
  group.name = "CapaMusculo";

  const materialMusculo = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#b5343e"),
    roughness: 0.46,
    metalness: 0.06
  });

  function mallaMusculo(geo) {
    const m = new THREE.Mesh(geo, materialMusculo);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Pectorales, dorsales/trapecio y recto abdominal esculpidos
  const pectoralIzq = mallaMusculo(new THREE.SphereGeometry(0.072, 22, 18));
  pectoralIzq.scale.set(1.18, 0.72, 0.55);

  const pectoralDer = mallaMusculo(new THREE.SphereGeometry(0.072, 22, 18));
  pectoralDer.scale.set(1.18, 0.72, 0.55);

  const dorsalIzq = mallaMusculo(crearVientreMuscular(0.025, 0.078, 0.24));
  dorsalIzq.scale.set(1.15, 1.0, 0.55);

  const dorsalDer = mallaMusculo(crearVientreMuscular(0.025, 0.078, 0.24));
  dorsalDer.scale.set(1.15, 1.0, 0.55);

  const abdomen = mallaMusculo(crearVientreMuscular(0.045, 0.095, 0.23));
  abdomen.scale.set(1.15, 1.0, 0.68);

  // Deltoides, bíceps, tríceps y antebrazo
  function crearBrazoMuscular() {
    const deltoides = mallaMusculo(new THREE.SphereGeometry(0.048, 20, 18));
    deltoides.scale.set(0.95, 1.15, 1.05);
    const biceps = mallaMusculo(crearVientreMuscular(0.016, 0.038, 0.19));
    const triceps = mallaMusculo(crearVientreMuscular(0.016, 0.040, 0.20));
    const antebrazo = mallaMusculo(crearVientreMuscular(0.015, 0.036, 0.23));
    group.add(deltoides, biceps, triceps, antebrazo);
    return { deltoides, biceps, triceps, antebrazo };
  }

  const brazoIzqMusc = crearBrazoMuscular();
  const brazoDerMusc = crearBrazoMuscular();

  // Cuádriceps, isquiotibiales y gemelos/pantorrilla
  function crearPiernaMuscular() {
    const cuadriceps = mallaMusculo(crearVientreMuscular(0.032, 0.074, 0.35));
    cuadriceps.scale.set(1.02, 1.0, 1.08);
    const pantorrilla = mallaMusculo(crearVientreMuscular(0.022, 0.052, 0.31));
    pantorrilla.scale.set(0.95, 1.0, 1.14);
    group.add(cuadriceps, pantorrilla);
    return { cuadriceps, pantorrilla };
  }

  const piernaIzqMusc = crearPiernaMuscular();
  const piernaDerMusc = crearPiernaMuscular();

  group.add(pectoralIzq, pectoralDer, dorsalIzq, dorsalDer, abdomen);

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
    const altoTobillo = 0.04 * escalaAltura;
    const largoPiernaM = ((params.largoPiernaCm ?? 84) / 84) * 0.81 * escalaAltura;
    const segPierna = largoPiernaM * 0.5;
    const yCadera = params.anclajes?.pelvis?.y ?? (altoTobillo + largoPiernaM);

    const muscTroncoKg = params.musculoTroncoKg ?? 18.5;
    const muscSupIzqKg = params.musculoSupIzqKg ?? 3.7;
    const muscSupDerKg = params.musculoSupDerKg ?? 3.8;
    const muscInfIzqKg = params.musculoInfIzqKg ?? 9.4;
    const muscInfDerKg = params.musculoInfDerKg ?? 9.5;

    const fPecho = (params.pechoPct ?? 100) / 100;
    const fEspalda = (params.espaldaPct ?? 100) / 100;
    const fAbdomen = (params.abdomenPct ?? 100) / 100;
    const fBiceps = (params.bicepsPct ?? 100) / 100;
    const fTriceps = (params.tricepsPct ?? 100) / 100;
    const fCuadriceps = (params.cuadricepsPct ?? 100) / 100;
    const fPantorrilla = (params.pantorrillaPct ?? 100) / 100;

    const bicepsCm = params.bicepsCm ?? 35;
    const tricepsCm = params.tricepsCm ?? 33;
    const largoBrazoM = ((params.largoBrazoCm ?? 60) / 60) * 0.53 * escalaAltura;
    const pechoCm = params.pechoCm ?? 100;
    const cinturaCm = params.cinturaCm ?? 80;
    const musloCm = params.musloCm ?? 56;

    const fTroncoKg = 0.78 + (muscTroncoKg / 18.5) * 0.32;
    const anchoTorso = anchoHombros * (0.84 + pechoCm / 220);
    const anchoCintura = anchoCadera * (0.78 + cinturaCm / 240);

    const dxTorax = params.anclajes?.torax?.x ?? (Math.sin(escolRad) * 0.25 * escalaAltura);
    const yTorax = params.anclajes?.torax?.y ?? (yCadera + 0.39 * escalaAltura);
    const dzTorax = params.anclajes?.torax?.z ?? (Math.sin(cifoRad) * 0.18 * escalaAltura);

    const dxAbdomen = Math.sin(escolRad * 0.5) * 0.11 * escalaAltura;
    const yAbdomen = yCadera + 0.13 * escalaAltura;
    const dzAbdomen = Math.sin(cifoRad * 0.35) * 0.07 * escalaAltura;

    const sPec = fPecho * fTroncoKg * escalaAltura;
    pectoralIzq.scale.set(1.18 * sPec * anchoTorso, 0.72 * sPec, 0.58 * sPec);
    pectoralIzq.position.set(dxTorax - 0.058 * anchoTorso, yTorax + 0.032 * escalaAltura, dzTorax + 0.076);
    pectoralIzq.rotation.set(cifoRad, -0.18, -escolRad);

    pectoralDer.scale.set(1.18 * sPec * anchoTorso, 0.72 * sPec, 0.58 * sPec);
    pectoralDer.position.set(dxTorax + 0.058 * anchoTorso, yTorax + 0.032 * escalaAltura, dzTorax + 0.076);
    pectoralDer.rotation.set(cifoRad, 0.18, -escolRad);

    const sEsp = fEspalda * fTroncoKg;
    dorsalIzq.scale.set(1.15 * sEsp * anchoTorso, escalaAltura, 0.58 * sEsp);
    dorsalIzq.position.set(dxTorax - 0.072 * anchoTorso, yTorax - 0.015 * escalaAltura, dzTorax - 0.068);
    dorsalIzq.rotation.set(cifoRad, 0, -escolRad);

    dorsalDer.scale.set(1.15 * sEsp * anchoTorso, escalaAltura, 0.58 * sEsp);
    dorsalDer.position.set(dxTorax + 0.072 * anchoTorso, yTorax - 0.015 * escalaAltura, dzTorax - 0.068);
    dorsalDer.rotation.set(cifoRad, 0, -escolRad);

    const sAbd = fAbdomen * fTroncoKg;
    abdomen.scale.set(1.15 * sAbd * anchoCintura, escalaAltura, 0.70 * sAbd);
    abdomen.position.set(dxAbdomen, yAbdomen, dzAbdomen + 0.032);
    abdomen.rotation.set(cifoRad * 0.35, 0, -escolRad * 0.5);

    const segBrazo = largoBrazoM * 0.53;
    const segAnt = largoBrazoM * 0.47;
    const angAbertura = 0.18;
    const gBic = bicepsCm / 35;
    const gTri = tricepsCm / 33;

    function posicionarBrazoMusc(b, signo, muscKg, anclaHombro) {
      const fKg = 0.80 + (muscKg / 12);
      const xHombro = anclaHombro?.x ?? (dxTorax + signo * 0.195 * anchoHombros);
      const yHombro = anclaHombro?.y ?? (yCadera + 0.49 * escalaAltura);
      const zHombro = anclaHombro?.z ?? (dzTorax + Math.sin(protraccionRad) * 0.14 * escalaAltura);

      const sDelt = escalaAltura * fKg * (0.85 + gBic * 0.15);
      b.deltoides.scale.set(0.95 * sDelt, 1.15 * sDelt, 1.05 * sDelt);
      b.deltoides.position.set(xHombro + signo * 0.008, yHombro - 0.015 * escalaAltura, zHombro);

      const cx1 = xHombro + signo * Math.sin(angAbertura) * (segBrazo * 0.5);
      const cy1 = yHombro - Math.cos(angAbertura) * (segBrazo * 0.5);
      const cz1 = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.4);

      const sB = fBiceps * gBic * fKg;
      b.biceps.scale.set(sB, segBrazo / 0.19, sB);
      b.biceps.position.set(cx1, cy1, cz1 + 0.020);
      b.biceps.rotation.set(protraccionRad * 0.65, 0, -signo * angAbertura);

      const sT = fTriceps * gTri * fKg;
      b.triceps.scale.set(sT, segBrazo / 0.20, sT);
      b.triceps.position.set(cx1, cy1, cz1 - 0.022);
      b.triceps.rotation.set(protraccionRad * 0.65, 0, -signo * angAbertura);

      const xCodo = xHombro + signo * Math.sin(angAbertura) * segBrazo;
      const yCodo = yHombro - Math.cos(angAbertura) * segBrazo;
      const zCodo = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.8);
      const angAnt = angAbertura + 0.06;

      const cx2 = xCodo + signo * Math.sin(angAnt) * (segAnt * 0.5);
      const cy2 = yCodo - Math.cos(angAnt) * (segAnt * 0.5);
      const cz2 = zCodo + Math.sin(protraccionRad * 0.4) * (segAnt * 0.4);

      const sA = (0.85 + fKg * 0.15) * gBic;
      b.antebrazo.scale.set(sA, segAnt / 0.23, sA);
      b.antebrazo.position.set(cx2, cy2, cz2);
      b.antebrazo.rotation.set(protraccionRad * 0.4, 0, -signo * angAnt);
    }

    posicionarBrazoMusc(brazoIzqMusc, -1, muscSupIzqKg, params.anclajes?.hombroIzq);
    posicionarBrazoMusc(brazoDerMusc, 1, muscSupDerKg, params.anclajes?.hombroDer);

    const gMuslo = musloCm / 56;
    const sepPierna = 0.102 * anchoCadera;

    function posicionarPiernaMusc(p, signo, muscKg, anclaCadera) {
      const fKg = 0.80 + (muscKg / 24);
      const xPos = anclaCadera?.x ?? (signo * sepPierna);

      const sC = fCuadriceps * gMuslo * fKg;
      p.cuadriceps.scale.set(1.02 * sC, segPierna / 0.35, 1.08 * sC);
      p.cuadriceps.position.set(xPos, altoTobillo + segPierna * 1.5, 0.016);

      const sP = fPantorrilla * gMuslo * 0.78 * fKg;
      p.pantorrilla.scale.set(0.95 * sP, segPierna / 0.31, 1.14 * sP);
      p.pantorrilla.position.set(xPos, altoTobillo + segPierna * 0.52, -0.014);
    }

    posicionarPiernaMusc(piernaIzqMusc, -1, muscInfIzqKg, params.anclajes?.caderaIzq);
    posicionarPiernaMusc(piernaDerMusc, 1, muscInfDerKg, params.anclajes?.caderaDer);
  }

  actualizar();
  return { group, actualizar };
}