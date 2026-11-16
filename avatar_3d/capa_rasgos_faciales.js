// ============================================================================
// VISAGELAB - CAPA 5: RASGOS FACIALES Y ESTRUCTURA CRANEOFACIAL
// Motor de Morph Targets por vértices, acoplado al Rig (Capa 1), Grasa (Capa 3)
// y Material CIELAB de Piel (Capa 4), listo para Importación de Análisis Facial.
// ============================================================================

// ============================================================================
// [BLOQUE 1] IMPORTACIONES Y DICCIONARIOS TAXONÓMICOS DE RASGOS CRANEOFACIALES
// Función: Importa Three.js y define los mapas cuantitativos de deformación
// para todas las categorías morfológicas (cráneo, frente, arco superciliar,
// maxilar, mandíbula, mentón, forma facial, pómulos, grasa bucal, nariz,
// ojos, párpados, cejas y labios).
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

function acotar(val, min, max) {
  return THREE.MathUtils.clamp(Number.isFinite(val) ? val : min, min, max);
}

// 1. Formas del Cráneo (anchura X, altura bóveda Y, largo anteroposterior Z, occipital, conicidad)
const TAXONOMIA_CRANEO = {
  mesocefalo_perfecto: { escX: 1.00, escY: 1.00, escZ: 1.00, occip: 0.00, conico: 0.0, asim: 0.0 },
  dolicocefalo_elite: { escX: 0.92, escY: 1.03, escZ: 1.12, occip: 0.08, conico: 0.0, asim: 0.0 },
  braquicefalo_compacto: { escX: 1.09, escY: 0.96, escZ: 0.91, occip: -0.05, conico: 0.0, asim: 0.0 },
  occipital_prominente: { escX: 0.98, escY: 1.01, escZ: 1.08, occip: 0.16, conico: 0.0, asim: 0.0 },
  mesocefalo_suave: { escX: 0.99, escY: 0.99, escZ: 0.99, occip: 0.02, conico: -0.02, asim: 0.0 },
  frente_inclinada: { escX: 0.98, escY: 0.98, escZ: 1.03, occip: 0.03, conico: 0.02, asim: 0.0 },
  braquicefalo_plano: { escX: 1.08, escY: 0.98, escZ: 0.87, occip: -0.14, conico: 0.0, asim: 0.0 },
  craneo_conico: { escX: 0.95, escY: 1.10, escZ: 0.96, occip: 0.00, conico: 0.16, asim: 0.0 },
  asimetria_craneal_leve: { escX: 1.00, escY: 1.00, escZ: 1.00, occip: 0.02, conico: 0.0, asim: 0.06 },
  frente_estrecha: { escX: 0.90, escY: 1.00, escZ: 1.02, occip: 0.02, conico: 0.08, asim: 0.0 },
  escafocefalia: { escX: 0.85, escY: 1.08, escZ: 1.16, occip: 0.12, conico: 0.10, asim: 0.0 }
};

// 2. Arco Superciliar y Proyección del Maxilar
const TAXONOMIA_ARCO_SUPERCILIAR = {
  prominencia_masculina_dominante: 1.00,
  proyeccion_definida: 0.65,
  estructura_armonica: 0.30,
  transicion_suave: 0.05,
  aplanamiento_superior: -0.25,
  deficiencia_proyeccion: -0.55,
  ausencia_estructural: -0.85
};

const TAXONOMIA_MAXILAR = {
  crecimiento_anterior_optimo: 0.85,
  proyeccion_masculina_robusta: 1.00,
  soporte_armonico: 0.45,
  soporte_neutro: 0.00,
  aplanamiento_mediofacial: -0.45,
  deficiencia_maxilar: -0.75,
  retraimiento: -1.00
};

// 3. Mandíbula (Forma y Proyección)
const TAXONOMIA_MANDIBULA_FORMA = {
  cuadrada_angulada: { anchoGonion: 1.24, filo: 1.0, anchoMenton: 1.20, asim: 0.0 },
  leve_marcada: { anchoGonion: 1.08, filo: 0.65, anchoMenton: 1.05, asim: 0.0 },
  rectangular: { anchoGonion: 1.18, filo: 0.85, anchoMenton: 1.16, asim: 0.0 },
  estructurada: { anchoGonion: 1.12, filo: 0.80, anchoMenton: 1.08, asim: 0.0 },
  redonda: { anchoGonion: 0.94, filo: -0.45, anchoMenton: 0.92, asim: 0.0 },
  blanda: { anchoGonion: 0.88, filo: -0.75, anchoMenton: 0.88, asim: 0.0 },
  retraida: { anchoGonion: 0.84, filo: -0.50, anchoMenton: 0.82, asim: 0.0 },
  asimetrica: { anchoGonion: 1.05, filo: 0.40, anchoMenton: 1.00, asim: 0.08 }
};

const TAXONOMIA_MANDIBULA_PROY = {
  ortognatismo: 0.15,
  proyeccion_masculina_fuerte: 0.65,
  balanceada: 0.00,
  suave: -0.20,
  media_baja: -0.35,
  retrognatismo_leve: -0.55,
  retrognatismo_moderado: -0.85,
  prognatismo_leve: 0.50,
  prognatismo_severo: 1.00
};

// 4. Formas Globales del Rostro (10 arquetipos: frente, pómulos, mandíbula y relación alto/ancho)
const TAXONOMIA_FORMA_ROSTRO = {
  ovalada: { fFrente: 1.00, fPomulo: 1.04, fMandibula: 0.94, fAlto: 1.04 },
  diamante: { fFrente: 0.88, fPomulo: 1.20, fMandibula: 0.86, fAlto: 1.04 },
  cuadrada: { fFrente: 1.12, fPomulo: 1.10, fMandibula: 1.16, fAlto: 0.95 },
  rectangular: { fFrente: 1.10, fPomulo: 1.08, fMandibula: 1.12, fAlto: 1.12 },
  triangulo_invertido: { fFrente: 1.16, fPomulo: 1.08, fMandibula: 0.80, fAlto: 1.00 },
  corazon: { fFrente: 1.14, fPomulo: 1.12, fMandibula: 0.78, fAlto: 0.98 },
  triangular: { fFrente: 0.84, fPomulo: 0.98, fMandibula: 1.18, fAlto: 1.00 },
  trapezoide: { fFrente: 0.90, fPomulo: 1.04, fMandibula: 1.16, fAlto: 1.02 },
  redonda: { fFrente: 1.06, fPomulo: 1.14, fMandibula: 1.06, fAlto: 0.90 },
  pera: { fFrente: 0.86, fPomulo: 1.02, fMandibula: 1.20, fAlto: 0.98 }
};

// 5. Pómulos (Proyección anterior, Posición vertical, Ancho lateral) y Grasa Bucal
const TAXONOMIA_POMULOS_PROY = {
  proyeccion_optima: 0.65,
  proyeccion_fuerte: 1.00,
  proyeccion_armonica: 0.35,
  proyeccion_neutra: 0.00,
  proyeccion_reducida: -0.35,
  retroceso_malar: -0.65,
  hipoplasia_malar: -1.00
};

const TAXONOMIA_POMULOS_VERT = {
  elevacion_alta: 1.00,
  elevacion_superior: 0.55,
  elevacion_media: 0.00,
  baja: -0.50,
  elevacion_caida: -0.95
};

const TAXONOMIA_POMULOS_ANCHO = {
  ancho_robusto: 1.00,
  ancho_definido: 0.55,
  proporcional: 0.00,
  ancho_reducido: -0.50,
  estrechez_severa: -0.95
};

const TAXONOMIA_GRASA_BUCAL = {
  excavacion_total: -1.00,
  transicion_plana_limpia: -0.55,
  transicion_neutra: 0.00,
  volumen_acumulado: 0.60,
  relleno_bucal_excesivo: 1.00
};

// 6. Nariz (15 Formas y 7 Anchos)
const TAXONOMIA_NARIZ_FORMA = {
  griega: { giba: 0.0, puntaY: 0.0, puntaZ: 1.05, bulbo: 0.92, dorsoAncho: 0.92, desvX: 0.0 },
  romana: { giba: 0.65, puntaY: -0.15, puntaZ: 1.08, bulbo: 0.96, dorsoAncho: 1.02, desvX: 0.0 },
  respingada: { giba: -0.35, puntaY: 0.55, puntaZ: 1.04, bulbo: 0.94, dorsoAncho: 0.90, desvX: 0.0 },
  aquilina: { giba: 0.90, puntaY: -0.55, puntaZ: 1.12, bulbo: 0.90, dorsoAncho: 0.92, desvX: 0.0 },
  delgada: { giba: 0.0, puntaY: 0.05, puntaZ: 1.02, bulbo: 0.76, dorsoAncho: 0.74, desvX: 0.0 },
  boton: { giba: -0.25, puntaY: 0.35, puntaZ: 0.88, bulbo: 1.05, dorsoAncho: 0.88, desvX: 0.0 },
  curvatura_punta: { giba: 0.35, puntaY: -0.45, puntaZ: 1.10, bulbo: 1.00, dorsoAncho: 0.96, desvX: 0.0 },
  miraguano: { giba: 0.55, puntaY: -0.30, puntaZ: 1.14, bulbo: 0.86, dorsoAncho: 0.84, desvX: 0.0 },
  nubia: { giba: -0.10, puntaY: -0.05, puntaZ: 0.94, bulbo: 1.22, dorsoAncho: 1.18, desvX: 0.0 },
  boxeador: { giba: -0.40, puntaY: -0.10, puntaZ: 0.86, bulbo: 1.25, dorsoAncho: 1.28, desvX: 0.35 },
  bulbosa: { giba: 0.0, puntaY: -0.05, puntaZ: 1.06, bulbo: 1.42, dorsoAncho: 1.04, desvX: 0.0 },
  desviada: { giba: 0.15, puntaY: 0.0, puntaZ: 1.00, bulbo: 1.00, dorsoAncho: 1.00, desvX: 0.75 },
  con_giba: { giba: 1.00, puntaY: -0.10, puntaZ: 1.06, bulbo: 0.98, dorsoAncho: 1.04, desvX: 0.0 },
  tomate: { giba: -0.15, puntaY: -0.15, puntaZ: 1.02, bulbo: 1.50, dorsoAncho: 1.22, desvX: 0.0 },
  carnosa: { giba: 0.05, puntaY: -0.05, puntaZ: 1.08, bulbo: 1.32, dorsoAncho: 1.16, desvX: 0.0 }
};

const TAXONOMIA_NARIZ_ANCHO = {
  ideal: 1.00,
  delgado_definido: 0.80,
  medio_natural: 1.04,
  etnico: 1.24,
  expandido: 1.34,
  base_plana: 1.40,
  hipertrofico: 1.52
};

// 7. Ojos, Párpados y Cejas
const TAXONOMIA_OJOS_FORMA = {
  cazador: { aperturaY: 0.72, anchoX: 1.12, capucha: 0.85, tiltExtra: 0.08, profExtra: 0.35 },
  almendrados: { aperturaY: 0.92, anchoX: 1.08, capucha: 0.25, tiltExtra: 0.05, profExtra: 0.0 },
  escudo: { aperturaY: 0.84, anchoX: 1.06, capucha: 0.55, tiltExtra: 0.03, profExtra: 0.20 },
  inclinacion_neutra: { aperturaY: 1.00, anchoX: 1.00, capucha: 0.0, tiltExtra: 0.0, profExtra: 0.0 },
  redondos: { aperturaY: 1.24, anchoX: 0.96, capucha: -0.35, tiltExtra: 0.0, profExtra: -0.15 },
  profundos: { aperturaY: 0.90, anchoX: 1.00, capucha: 0.45, tiltExtra: 0.0, profExtra: 0.65 },
  caidos: { aperturaY: 0.95, anchoX: 1.00, capucha: 0.15, tiltExtra: -0.14, profExtra: 0.0 },
  presa: { aperturaY: 1.28, anchoX: 0.98, capucha: -0.55, tiltExtra: -0.10, profExtra: -0.45 },
  saltones: { aperturaY: 1.32, anchoX: 1.02, capucha: -0.75, tiltExtra: 0.0, profExtra: -0.85 }
};

const TAXONOMIA_OJOS_INCLINACION = {
  positiva_marcada: 0.20,
  positiva_sutil: 0.10,
  neutra: 0.00,
  negativa_leve: -0.08,
  negativa_moderada: -0.16,
  negativa_severa: -0.25,
  asimetrica: 0.12
};

const TAXONOMIA_OJOS_PROFUNDIDAD = {
  profundidad_extrema: 1.00,
  profundidad_marcada: 0.60,
  estandar: 0.15,
  nivel_neutro: 0.00,
  superficial: -0.35,
  proyeccion_leve: -0.65,
  proyeccion_severa: -1.00
};

const TAXONOMIA_PARPADO_EXPOSICION = {
  oculto: -0.90,
  minima: -0.50,
  moderada: -0.15,
  definida_almendrado: 0.00,
  alta: 0.40,
  excesiva: 0.75,
  total: 1.00
};

const TAXONOMIA_CEJAS_DENSIDAD = {
  densas_definidas: { grosor: 1.28, opacidad: 0.96, desorden: 0.0 },
  gruesas_naturales: { grosor: 1.38, opacidad: 0.90, desorden: 0.05 },
  masa_media: { grosor: 1.00, opacidad: 0.85, desorden: 0.0 },
  pobladas_desordenadas: { grosor: 1.48, opacidad: 0.88, desorden: 0.18 },
  delgadas_finas: { grosor: 0.55, opacidad: 0.82, desorden: 0.0 },
  dispersas: { grosor: 0.82, opacidad: 0.45, desorden: 0.08 },
  inexistentes_claras: { grosor: 0.40, opacidad: 0.14, desorden: 0.0 }
};

// 8. Labios (10 Formas y 7 Grosores)
const TAXONOMIA_LABIOS_FORMA = {
  arco_cupido_definido: { cupido: 1.0, anchoX: 1.02, comisuraY: 0.02, asim: 0.0 },
  arco_cupido_plano: { cupido: -0.65, anchoX: 1.04, comisuraY: 0.0, asim: 0.0 },
  arco_estirado: { cupido: -0.35, anchoX: 1.22, comisuraY: 0.0, asim: 0.0 },
  proporcionados: { cupido: 0.35, anchoX: 1.00, comisuraY: 0.0, asim: 0.0 },
  comisuras_elevadas: { cupido: 0.45, anchoX: 1.04, comisuraY: 0.16, asim: 0.0 },
  ojal: { cupido: 0.25, anchoX: 0.78, comisuraY: 0.0, asim: 0.0 },
  arco_caido: { cupido: 0.10, anchoX: 0.98, comisuraY: -0.18, asim: 0.0 },
  arco_casa: { cupido: 0.85, anchoX: 0.92, comisuraY: -0.12, asim: 0.0 },
  asimetricos: { cupido: 0.30, anchoX: 1.00, comisuraY: 0.0, asim: 0.12 },
  sin_arco: { cupido: -1.00, anchoX: 1.00, comisuraY: 0.0, asim: 0.0 }
};

const TAXONOMIA_LABIOS_GROSOR = {
  proporcionado: 1.00,
  llenos_simetricos: 1.26,
  grosor_medio: 0.94,
  gruesos_dominantes: 1.48,
  delgados: 0.68,
  muy_finos: 0.48,
  excesivamente_gruesos: 1.72
};

// ============================================================================
// [BLOQUE 2] CONSTRUCCIÓN DE LA MALLA CRANEOFACIAL CONTINUA (MORPH TARGETS)
// Función: Crea una malla craneofacial continua de alta densidad (64x56) cuyos
// vértices se esculpen orgánicamente sin costuras, más los sub-ensambles
// integrados de ojos (esclerótica, iris, pupila, párpados), cejas, nariz
// (puente, dorso, punta, alas, columela) y labios (superior e inferior).
// ============================================================================
export function crearCapaRasgosFaciales(opciones = {}) {
  const group = new THREE.Group();
  group.name = "CapaRasgosFaciales";

  // Comparte el mismo materialPiel de la Capa 4 para que colorimetría CIELAB,
  // subtono, estación, poros y translucidez sean 100% continuos con el cuerpo
  const materialPiel = opciones.materialPiel || new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#d9a37a"),
    roughness: 0.48,
    metalness: 0.02,
    clearcoat: 0.18
  });

  const materialLabios = materialPiel.clone();
  materialLabios.roughness = 0.36;
  materialLabios.clearcoat = 0.28;

  const materialEsclerotica = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#f8f9fa"),
    roughness: 0.18,
    clearcoat: 0.85
  });

  const materialIris = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#4a3222"),
    roughness: 0.25,
    clearcoat: 0.90
  });

  const materialPupila = new THREE.MeshBasicMaterial({ color: 0x08080a });

  const materialCeja = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#261c16"),
    roughness: 0.78,
    transparent: true,
    opacity: 0.88
  });

  const nodoCabeza = new THREE.Group();
  nodoCabeza.name = "CabezaMorfologicaUnificada";
  group.add(nodoCabeza);

  // 1. Malla Craneofacial Continua (64x56 segmentos) con posición base de vértices
  const geoCabeza = new THREE.SphereGeometry(0.104, 64, 56);
  const posAttr = geoCabeza.attributes.position;
  const numVertices = posAttr.count;
  const baseVertices = new Float32Array(numVertices * 3);

  // Esculpido anatómico base (restPose craneofacial humana antes de sliders)
  for (let i = 0; i < numVertices; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    let z = posAttr.getZ(i);

    const ny = y / 0.104; // -1 (base mandíbula/cuello) a +1 (bóveda craneal)
    const nz = z / 0.104; // -1 (occipital) a +1 (rostro anterior)
    const nx = x / 0.104;

    // Proporción craneal humana base (más alta y profunda que ancha)
    x *= 0.86;
    y *= 1.16;
    z *= 1.05;

    // Estrechamiento progresivo hacia el tercio inferior (mandíbula y mentón)
    if (ny < 0.0) {
      const tInf = Math.abs(ny);
      const estrechamiento = 1.0 - tInf * 0.26;
      x *= estrechamiento;
      if (nz > 0) {
        // Proyección facial anterior (maxilar y mentón)
        z += Math.sin(tInf * Math.PI * 0.85) * 0.016 * (1 - Math.abs(nx) * 0.6);
      } else {
        // Base nucal / suboccipital entrante hacia el cuello
        z *= 1.0 - tInf * 0.28;
      }
    }

    // Cuencas orbitarias suaves en la zona ocular (ny ~ 0.05 a 0.22, |nx| ~ 0.22 a 0.45)
    if (nz > 0.35) {
      const distOjo = Math.hypot(Math.abs(nx) - 0.31, ny - 0.12);
      if (distOjo < 0.24) {
        const wCuenca = Math.cos((distOjo / 0.24) * Math.PI * 0.5);
        z -= wCuenca * wCuenca * 0.013;
      }
    }

    baseVertices[i * 3] = x;
    baseVertices[i * 3 + 1] = y;
    baseVertices[i * 3 + 2] = z;
    posAttr.setXYZ(i, x, y, z);
  }
  geoCabeza.computeVertexNormals();

  const mallaCabeza = new THREE.Mesh(geoCabeza, materialPiel);
  mallaCabeza.castShadow = true;
  mallaCabeza.receiveShadow = true;
  nodoCabeza.add(mallaCabeza);

  // 2. Sub-ensamble Nasal Integrado (Puente óseo, Dorso cartilaginoso, Punta, Alas y Columela)
  const grupoNariz = new THREE.Group();
  grupoNariz.position.set(0, -0.002, 0.095);
  nodoCabeza.add(grupoNariz);

  const dorsoNasal = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0125, 0.044, 20), materialPiel);
  dorsoNasal.position.set(0, 0.010, 0.004);
  dorsoNasal.rotation.x = -0.32;
  dorsoNasal.scale.set(0.88, 1.0, 1.15);

  const gibaNasal = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 18, 14), materialPiel);
  gibaNasal.position.set(0, 0.012, 0.008);
  gibaNasal.scale.set(0.82, 1.35, 0.95);

  const puntaNasal = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 22, 18), materialPiel);
  puntaNasal.position.set(0, -0.010, 0.016);
  puntaNasal.scale.set(0.96, 0.88, 1.08);

  const alaNasalIzq = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 16, 14), materialPiel);
  alaNasalIzq.position.set(-0.011, -0.012, 0.006);
  alaNasalIzq.scale.set(0.85, 0.78, 1.10);

  const alaNasalDer = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 16, 14), materialPiel);
  alaNasalDer.position.set(0.011, -0.012, 0.006);
  alaNasalDer.scale.set(0.85, 0.78, 1.10);

  const columelaNasal = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0055, 0.016, 12), materialPiel);
  columelaNasal.position.set(0, -0.017, 0.008);
  columelaNasal.rotation.x = Math.PI * 0.46;

  grupoNariz.add(dorsoNasal, gibaNasal, puntaNasal, alaNasalIzq, alaNasalDer, columelaNasal);

  // 3. Sub-ensamble Ocular, Párpados y Cejas (Izquierdo y Derecho)
  function crearComplejoOcular(signo) {
    const gOjo = new THREE.Group();
    gOjo.position.set(signo * 0.031, 0.014, 0.082);

    const globo = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 24, 20), materialEsclerotica);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 20, 16), materialIris);
    iris.position.set(0, 0, 0.0098);
    iris.scale.set(1.0, 1.0, 0.45);

    const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.0030, 16, 12), materialPupila);
    pupila.position.set(0, 0, 0.0122);
    pupila.scale.set(1.0, 1.0, 0.30);

    // Párpado superior e inferior que envuelven el globo ocular
    const parpadoSup = new THREE.Mesh(
      new THREE.SphereGeometry(0.0136, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
      materialPiel
    );
    parpadoSup.rotation.x = -0.32;
    parpadoSup.scale.set(1.18, 1.0, 1.06);

    const pliegueSupra = new THREE.Mesh(
      new THREE.TorusGeometry(0.0138, 0.0022, 10, 22, Math.PI * 0.92),
      materialPiel
    );
    pliegueSupra.position.set(0, 0.0035, 0.002);
    pliegueSupra.rotation.z = Math.PI * 0.04;
    pliegueSupra.scale.set(1.15, 0.85, 1.0);

    const parpadoInf = new THREE.Mesh(
      new THREE.SphereGeometry(0.0134, 22, 14, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48),
      materialPiel
    );
    parpadoInf.rotation.x = 0.24;
    parpadoInf.scale.set(1.16, 1.0, 1.04);

    // Ceja esculpida (tramo medial y lateral con arco)
    const gCeja = new THREE.Group();
    gCeja.position.set(signo * 0.002, 0.018, 0.012);
    const cejaMalla = new THREE.Mesh(
      new THREE.TorusGeometry(0.019, 0.0032, 10, 22, Math.PI * 0.72),
      materialCeja
    );
    cejaMalla.rotation.z = Math.PI * 0.14 - signo * 0.08;
    cejaMalla.scale.set(1.15, 0.65, 0.85);
    gCeja.add(cejaMalla);

    gOjo.add(globo, iris, pupila, parpadoSup, pliegueSupra, parpadoInf, gCeja);
    nodoCabeza.add(gOjo);
    return { gOjo, globo, parpadoSup, pliegueSupra, parpadoInf, gCeja, cejaMalla };
  }
  const ojoIzq = crearComplejoOcular(-1);
  const ojoDer = crearComplejoOcular(1);

  // 4. Sub-ensamble Labial Integrado (Arco de Cupido, Labio Superior, Inferior y Comisuras)
  const grupoLabios = new THREE.Group();
  grupoLabios.position.set(0, -0.042, 0.094);
  nodoCabeza.add(grupoLabios);

  const labioSupIzq = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 18, 14), materialLabios);
  labioSupIzq.position.set(-0.0065, 0.0032, 0.002);
  labioSupIzq.scale.set(1.35, 0.52, 0.85);

  const labioSupDer = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 18, 14), materialLabios);
  labioSupDer.position.set(0.0065, 0.0032, 0.002);
  labioSupDer.scale.set(1.35, 0.52, 0.85);

  const tuberculoCentral = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 14, 12), materialLabios);
  tuberculoCentral.position.set(0, 0.0022, 0.005);
  tuberculoCentral.scale.set(1.10, 0.65, 0.90);

  const labioInf = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 22, 16), materialLabios);
  labioInf.position.set(0, -0.0042, 0.001);
  labioInf.scale.set(1.52, 0.56, 0.92);

  const comisuraIzq = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 10), materialLabios);
  comisuraIzq.position.set(-0.019, -0.0005, -0.004);

  const comisuraDer = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 10), materialLabios);
  comisuraDer.position.set(0.019, -0.0005, -0.004);

  grupoLabios.add(labioSupIzq, labioSupDer, tuberculoCentral, labioInf, comisuraIzq, comisuraDer);

  // ==========================================================================
  // [BLOQUE 3] MOTOR DE DEFORMACIÓN CRANEOFACIAL applyAnatomyState(state)
  // Función: Aplica en orden jerárquico (1° Cráneo y base ósea, 2° Proporciones
  // globales de tercios/quintos/simetría, 3° Pómulos, grasa bucal, nariz,
  // ojos/cejas y labios) deformando directamente los vértices de la cabeza y
  // sincronizando el color labial con la colorimetría CIELAB de la Capa 4.
  // ==========================================================================
  let ultimoParams = {};
  let diagnosticoFacialImportado = null;

  function applyAnatomyState(state = {}) {
    ultimoParams = { ...(diagnosticoFacialImportado || {}), ...ultimoParams, ...state };

    const estaturaCm = acotar(ultimoParams.estaturaCm ?? 175, 140, 210);
    const escalaAltura = estaturaCm / 175;

    // Sincronizar posición y rotación con el anclaje del cráneo de la Capa 1 (Esqueleto)
    const anc = ultimoParams.anclajes;
    if (anc?.craneo) {
      nodoCabeza.position.copy(anc.craneo);
      if (anc.craneo.quat) nodoCabeza.quaternion.copy(anc.craneo.quat);
      nodoCabeza.scale.setScalar(escalaAltura);
    } else {
      nodoCabeza.position.set(0, 1.54 * escalaAltura, 0.015 * escalaAltura);
      nodoCabeza.scale.setScalar(escalaAltura);
    }

    // Sincronizar color labial y translucidez con el material de piel de la Capa 4
    materialLabios.color.copy(materialPiel.color).lerp(new THREE.Color("#b5484a"), 0.34);
    materialLabios.transparent = materialPiel.transparent;
    materialLabios.opacity = materialPiel.opacity;
    materialLabios.depthWrite = materialPiel.depthWrite;

    // Lectura de parámetros de la Capa 5
    const cfgCraneo = TAXONOMIA_CRANEO[ultimoParams.formaCraneo] || TAXONOMIA_CRANEO.mesocefalo_perfecto;
    const frenteDeg = acotar(ultimoParams.inclinacionFrenteDeg ?? 84, 70, 96);
    const fFrenteInclinacion = (85 - frenteDeg) / 15; // Positivo = inclinada atrás, Negativo = convexa/vertical

    const fArcoSup = TAXONOMIA_ARCO_SUPERCILIAR[ultimoParams.arcoSuperciliar] ?? 0.30;
    const fMaxilar = TAXONOMIA_MAXILAR[ultimoParams.proyeccionMaxilar] ?? 0.45;
    const cfgMandForma = TAXONOMIA_MANDIBULA_FORMA[ultimoParams.formaMandibula] || TAXONOMIA_MANDIBULA_FORMA.estructurada;
    const fMandProy = TAXONOMIA_MANDIBULA_PROY[ultimoParams.proyeccionMandibula] ?? 0.15;
    const mentonMm = acotar(ultimoParams.proyeccionMentonMm ?? 0, -12, 6);
    const fMentonProy = mentonMm / 6;

    const cfgRostro = TAXONOMIA_FORMA_ROSTRO[ultimoParams.formaRostro] || TAXONOMIA_FORMA_ROSTRO.ovalada;
    const fTercioSup = acotar((ultimoParams.tercioSuperiorPct ?? 33.3) / 33.3, 0.80, 1.25);
    const fTercioMed = acotar((ultimoParams.tercioMedioPct ?? 33.3) / 33.3, 0.80, 1.25);
    const fTercioInf = acotar((ultimoParams.tercioInferiorPct ?? 33.3) / 33.3, 0.80, 1.25);
    const fQuintos = acotar((ultimoParams.proporcionQuintosPct ?? 100) / 100, 0.84, 1.18);
    const simetriaPct = acotar(ultimoParams.simetriaFacialPct ?? 100, 75, 100);
    const factorAsimetria = (100 - simetriaPct) / 100;

    const fPomProy = TAXONOMIA_POMULOS_PROY[ultimoParams.pomulosProyeccion] ?? 0.35;
    const fPomVert = TAXONOMIA_POMULOS_VERT[ultimoParams.pomulosPosicionVertical] ?? 0.0;
    const fPomAncho = TAXONOMIA_POMULOS_ANCHO[ultimoParams.pomulosAnchoLateral] ?? 0.0;

    // Grasa bucal sincronizada con grasaCaraNivel de la Capa 3
    const fGrasaBucalTax = TAXONOMIA_GRASA_BUCAL[ultimoParams.grasaBucal] ?? 0.0;
    const fGrasaCaraCapa3 = ((ultimoParams.grasaCaraNivel ?? 4) - 4) / 6;
    const fBucalCombinada = acotar(fGrasaBucalTax * 0.65 + fGrasaCaraCapa3 * 0.35, -1.1, 1.2);

    // 1. Deformación por Vértices (Morph Targets) sobre la Malla Craneofacial Continua
    for (let i = 0; i < numVertices; i++) {
      let x = baseVertices[i * 3];
      let y = baseVertices[i * 3 + 1];
      let z = baseVertices[i * 3 + 2];

      const ny = y / 0.120; // Coordenada vertical normalizada (-1 a +1)
      const nz = z / 0.110; // Coordenada anteroposterior normalizada (-1 a +1)
      const nx = x / 0.090;
      const signoX = x >= 0 ? 1 : -1;

      // A. Forma del Cráneo y Proporción de Tercios
      x *= cfgCraneo.escX * fQuintos;
      y *= cfgCraneo.escY * cfgRostro.fAlto;
      z *= cfgCraneo.escZ;

      if (ny > 0.25) {
        y *= fTercioSup;
        x *= cfgRostro.fFrente;
        // Conicidad craneal superior
        if (ny > 0.55) {
          x *= 1.0 - cfgCraneo.conico * (ny - 0.55);
          y += cfgCraneo.conico * 0.012 * (ny - 0.55);
        }
      } else if (ny >= -0.22) {
        y *= fTercioMed;
      } else {
        y *= fTercioInf;
      }

      // Prominencia o aplanamiento occipital (nuca)
      if (nz < -0.25 && ny > -0.25) {
        const wOcc = Math.max(0, Math.cos(((ny - 0.20) / 0.65) * Math.PI * 0.5));
        z -= cfgCraneo.occip * 0.024 * wOcc * Math.abs(nz);
      }

      // B. Inclinación de la Frente (70° ruda inclinada a >90° convexa)
      if (ny > 0.22 && nz > 0.15) {
        const wFrente = Math.min(1, (ny - 0.22) / 0.55) * Math.min(1, (nz - 0.15) / 0.55);
        z -= fFrenteInclinacion * 0.020 * wFrente;
      }

      // C. Arco Superciliar (glabela y reborde supraorbitario)
      if (nz > 0.45 && ny > 0.14 && ny < 0.38 && Math.abs(nx) < 0.68) {
        const wy = Math.cos(((ny - 0.25) / 0.12) * Math.PI * 0.5);
        const wx = Math.cos((Math.abs(nx) / 0.68) * Math.PI * 0.5);
        z += fArcoSup * 0.012 * Math.max(0, wy) * Math.max(0, wx);
      }

      // D. Pómulos (Cigomático: Proyección anterior, Altura vertical y Ancho lateral)
      const centroPomY = -0.02 + fPomVert * 0.08;
      const distPom = Math.hypot(Math.abs(nx) - 0.56, ny - centroPomY);
      if (nz > 0.05 && distPom < 0.38) {
        const wPom = Math.pow(Math.cos((distPom / 0.38) * Math.PI * 0.5), 1.6);
        x += signoX * ( (cfgRostro.fPomulo - 1.0) * 0.018 + fPomAncho * 0.013 ) * wPom;
        z += fPomProy * 0.014 * wPom;
        y += fPomVert * 0.005 * wPom;
      }

      // E. Proyección del Maxilar (Soporte mediofacial y subnasal)
      if (nz > 0.35 && ny > -0.42 && ny < 0.06 && Math.abs(nx) < 0.55) {
        const wMax = Math.cos(((ny + 0.18) / 0.24) * Math.PI * 0.5) * Math.cos((Math.abs(nx) / 0.55) * Math.PI * 0.5);
        if (wMax > 0) z += fMaxilar * 0.013 * wMax;
      }

      // F. Grasa Bucal (Bolas de Bichat: entre pómulo y mandíbula)
      const distBucal = Math.hypot(Math.abs(nx) - 0.48, ny + 0.28);
      if (nz > 0.0 && distBucal < 0.32) {
        const wBucal = Math.pow(Math.cos((distBucal / 0.32) * Math.PI * 0.5), 1.5);
        x += signoX * fBucalCombinada * 0.014 * wBucal;
        z += fBucalCombinada * 0.010 * wBucal;
      }

      // G. Mandíbula (Ángulo del Gonion, anchura mandibular y proyección)
      if (ny < -0.18) {
        const wMand = Math.min(1, Math.abs(ny + 0.18) / 0.65);
        const factorAncho = cfgMandForma.anchoGonion * cfgRostro.fMandibula;
        x *= THREE.MathUtils.lerp(1.0, factorAncho, wMand * 0.65);

        // Definición del ángulo gonial lateral
        if (Math.abs(nx) > 0.35 && ny > -0.68 && ny < -0.25) {
          x += signoX * cfgMandForma.filo * 0.008 * wMand;
          z -= cfgMandForma.filo * 0.005 * wMand;
        }

        if (nz > 0.10) {
          z += fMandProy * 0.015 * wMand;
        }
      }

      // H. Mentón (Proyección en mm: desde -10 mm retrognatismo hasta +4 mm maxoprognatismo)
      if (ny < -0.48 && nz > 0.22 && Math.abs(nx) < 0.45) {
        const wMenton = Math.min(1, Math.abs(ny + 0.48) / 0.42) * Math.cos((Math.abs(nx) / 0.45) * Math.PI * 0.5);
        z += fMentonProy * 0.016 * Math.max(0, wMenton);
        x *= THREE.MathUtils.lerp(1.0, cfgMandForma.anchoMenton, Math.max(0, wMenton) * 0.45);
      }

      // I. Simetría Facial Global y Asimetrías Específicas
      const asimTotal = factorAsimetria * 0.012 + cfgCraneo.asim * 0.008 + cfgMandForma.asim * 0.010;
      if (asimTotal > 0.0001) {
        x += asimTotal * Math.sin(ny * Math.PI);
        y += signoX * asimTotal * 0.45;
      }

      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
    geoCabeza.computeVertexNormals();

    // 2. Actualizar Nariz y Ángulo Nasolabial (Vínculo con Maxilar y Tercio Medio)
    const cfgNariz = TAXONOMIA_NARIZ_FORMA[ultimoParams.formaNariz] || TAXONOMIA_NARIZ_FORMA.griega;
    const fAnchoNasal = TAXONOMIA_NARIZ_ANCHO[ultimoParams.anchoNasal] ?? 1.00;
    const angNasolabial = acotar(ultimoParams.anguloNasolabialDeg ?? 94, 72, 112);
    const radNasolabial = THREE.MathUtils.degToRad(angNasolabial - 92);

    grupoNariz.position.set(
      cfgNariz.desvX * 0.004,
      -0.002 * fTercioMed,
      0.095 + fMaxilar * 0.009
    );

    dorsoNasal.scale.set(0.88 * cfgNariz.dorsoAncho * fAnchoNasal, fTercioMed, 1.15);
    dorsoNasal.rotation.z = -cfgNariz.desvX * 0.12;

    gibaNasal.scale.set(
      0.82 * cfgNariz.dorsoAncho,
      1.25,
      Math.max(0.4, 0.90 + cfgNariz.giba * 0.55)
    );
    gibaNasal.position.z = 0.007 + cfgNariz.giba * 0.005;

    puntaNasal.scale.set(
      0.96 * cfgNariz.bulbo * (0.7 + 0.3 * fAnchoNasal),
      0.88 * cfgNariz.bulbo,
      1.08 * cfgNariz.puntaZ
    );
    puntaNasal.position.set(
      cfgNariz.desvX * 0.005,
      -0.010 + cfgNariz.puntaY * 0.006 + Math.sin(radNasolabial) * 0.006,
      0.016 * cfgNariz.puntaZ
    );

    const sepAlas = 0.011 * fAnchoNasal * (0.85 + 0.15 * cfgNariz.bulbo);
    alaNasalIzq.position.x = -sepAlas;
    alaNasalDer.position.x = sepAlas;
    alaNasalIzq.scale.set(0.85 * fAnchoNasal, 0.78, 1.10);
    alaNasalDer.scale.set(0.85 * fAnchoNasal, 0.78, 1.10);

    columelaNasal.rotation.x = Math.PI * 0.46 - radNasolabial * 0.65;

    // 3. Actualizar Ojos, Inclinación Cantal, Profundidad, Párpados y Cejas
    const cfgOjo = TAXONOMIA_OJOS_FORMA[ultimoParams.formaOjos] || TAXONOMIA_OJOS_FORMA.almendrados;
    const fTiltBase = TAXONOMIA_OJOS_INCLINACION[ultimoParams.inclinacionOjos] ?? 0.05;
    const fProfOjo = (TAXONOMIA_OJOS_PROFUNDIDAD[ultimoParams.profundidadOjos] ?? 0.15) + cfgOjo.profExtra;
    const fExpParpado = (TAXONOMIA_PARPADO_EXPOSICION[ultimoParams.exposicionParpado] ?? 0.0) - cfgOjo.capucha * 0.45;
    const cfgCeja = TAXONOMIA_CEJAS_DENSIDAD[ultimoParams.densidadCejas] || TAXONOMIA_CEJAS_DENSIDAD.densas_definidas;

    materialCeja.opacity = cfgCeja.opacidad;

    [
      [ojoIzq, -1],
      [ojoDer, 1]
    ].forEach(([o, s]) => {
      const tiltAsim = ultimoParams.inclinacionOjos === "asimetrica" && s > 0 ? -0.08 : 0;
      const tiltTotal = fTiltBase + cfgOjo.tiltExtra + tiltAsim;

      o.gOjo.position.set(
        s * 0.031 * fQuintos,
        0.014 * fTercioMed,
        0.082 - fProfOjo * 0.007 + fMaxilar * 0.004
      );
      o.gOjo.rotation.z = s * tiltTotal;
      o.gOjo.scale.set(cfgOjo.anchoX, cfgOjo.aperturaY, 1.0);

      // Exposición del párpado superior (cubre o descubre el iris)
      o.parpadoSup.rotation.x = -0.32 - fExpParpado * 0.28;
      o.pliegueSupra.position.y = 0.0032 + Math.max(-0.002, fExpParpado * 0.0025);

      // Ceja vinculada al arco superciliar y a la densidad seleccionada
      o.gCeja.position.y = 0.017 + fArcoSup * 0.002;
      o.gCeja.position.z = 0.012 + fArcoSup * 0.008 + fProfOjo * 0.004;
      o.cejaMalla.scale.set(1.15, 0.65 * cfgCeja.grosor, 0.85 * cfgCeja.grosor);
      o.cejaMalla.rotation.z = Math.PI * 0.14 - s * (0.08 + tiltTotal * 0.45);
    });

    // 4. Actualizar Labios (Forma del Arco de Cupido, Comisuras y Grosor)
    const cfgLabForma = TAXONOMIA_LABIOS_FORMA[ultimoParams.formaLabios] || TAXONOMIA_LABIOS_FORMA.arco_cupido_definido;
    const fLabGrosor = TAXONOMIA_LABIOS_GROSOR[ultimoParams.grosorLabios] ?? 1.00;

    grupoLabios.position.set(
      cfgLabForma.asim * 0.003,
      -0.042 * fTercioInf,
      0.094 + fMaxilar * 0.010 + fMandProy * 0.006 + fMentonProy * 0.004
    );
    grupoLabios.scale.set(cfgLabForma.anchoX, 1.0, 1.0);

    const altoSup = 0.52 * fLabGrosor * (1 + cfgLabForma.cupido * 0.18);
    labioSupIzq.scale.set(1.35, altoSup, 0.85 * fLabGrosor);
    labioSupDer.scale.set(1.35, altoSup * (1 - cfgLabForma.asim * 0.25), 0.85 * fLabGrosor);
    labioSupIzq.rotation.z = cfgLabForma.cupido * 0.16;
    labioSupDer.rotation.z = -cfgLabForma.cupido * 0.16;

    tuberculoCentral.scale.set(1.10, 0.65 * fLabGrosor, 0.90 * fLabGrosor);
    tuberculoCentral.position.y = 0.0020 - cfgLabForma.cupido * 0.0012;

    labioInf.scale.set(1.52, 0.58 * fLabGrosor, 0.95 * fLabGrosor);

    comisuraIzq.position.y = -0.0005 + cfgLabForma.comisuraY * 0.008;
    comisuraDer.position.y = -0.0005 + cfgLabForma.comisuraY * 0.008 - cfgLabForma.asim * 0.003;
  }

  // ==========================================================================
  // [BLOQUE 4] PUENTE DE IMPORTACIÓN DE DIAGNÓSTICO MORFOPSICOLÓGICO / FACIAL
  // Función: Permite inyectar el JSON del escáner facial (biometrics.js /
  // facial-taxonomy.js) como base inicial sin bloquear el ajuste manual.
  // ==========================================================================
  function importarRasgosFaciales(datos = {}) {
    diagnosticoFacialImportado = { ...datos };
    applyAnatomyState(diagnosticoFacialImportado);
    return { ...diagnosticoFacialImportado };
  }

  applyAnatomyState();

  return {
    group,
    nodoCabeza,
    mallaCabeza,
    applyAnatomyState,
    actualizar: applyAnatomyState,
    importarRasgosFaciales
  };
}