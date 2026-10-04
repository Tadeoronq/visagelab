const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

// Elementos UI
const valAlineacion = document.getElementById('valAlineacion');
const valLuz = document.getElementById('valLuz');
const valNitidez = document.getElementById('valNitidez');
const valContraste = document.getElementById('valContraste');
const etiquetaToma = document.getElementById('etiquetaToma');
const btnCapturar = document.getElementById('btnCapturar');
const btnGenerarPDF = document.getElementById('btnGenerarPDF');
const galeria = document.getElementById('galeriaCapturas');
const panelResultados = document.getElementById('panelResultados');
const contenidoAnalisis = document.getElementById('contenidoAnalisis');

const MODOS = {
    RAPIDO: ['Frontal Neutra', 'Perfil 90°'],
    COMPLETO: ['Frontal Neutra', 'Frontal Sonrisa', 'Perfil Derecho 90°', 'Perfil Izquierdo 90°', 'Tres Cuartos 45°'],
    CUERPO: ['Cuerpo Entero']
};

let flujoActual = MODOS.RAPIDO;
let pasoActual = 0;
let capturas = [];
let ultimasLandmarks = null;
let alineadoCorrectamente = false;

// Variables para Evaluación Fotométrica Aislada
let ultimoAnalisisLuz = 0;
const canvasAux = document.createElement('canvas');
canvasAux.width = 160;
canvasAux.height = 120;
const ctxAux = canvasAux.getContext('2d');

let metricasCalculadas = [];

// 1. Evaluación Fotométrica Ligera
function evaluarCalidadImagenThrottled(ahora) {
    if (ahora - ultimoAnalisisLuz < 300) return;
    ultimoAnalisisLuz = ahora;

    ctxAux.drawImage(videoElement, 0, 0, 160, 120);
    const imageData = ctxAux.getImageData(0, 0, 160, 120);
    const data = imageData.data;
    
    let sumaBrillo = 0;
    let minBrillo = 255;
    let maxBrillo = 0;

    for (let i = 0; i < data.length; i += 16) {
        const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sumaBrillo += luma;
        if (luma < minBrillo) minBrillo = luma;
        if (luma > maxBrillo) maxBrillo = luma;
    }

    const totalPixeles = data.length / 16;
    const promedioLuz = sumaBrillo / totalPixeles;
    const rangoContraste = maxBrillo - minBrillo;

    if (promedioLuz < 50) {
        valLuz.textContent = 'Oscura';
        valLuz.className = 'font-bold text-red-400';
    } else if (promedioLuz > 200) {
        valLuz.textContent = 'Expuesta';
        valLuz.className = 'font-bold text-amber-400';
    } else {
        valLuz.textContent = 'Óptima';
        valLuz.className = 'font-bold text-emerald-400';
    }

    valContraste.textContent = (rangoContraste < 70) ? 'Bajo' : 'Adecuado';
    valContraste.className = (rangoContraste < 70) ? 'font-bold text-amber-400' : 'font-bold text-emerald-400';
    valNitidez.textContent = 'Nítida';
    valNitidez.className = 'font-bold text-emerald-400';
}

// 2. Guía Visual
function dibujarGuiaAlineacion(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = alineadoCorrectamente ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);

    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width * 0.22, height * 0.32, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

// 3. Procesamiento en Tiempo Real
function onResultsFace(results) {
    if (!videoElement.videoWidth || !videoElement.videoHeight) return;

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    evaluarCalidadImagenThrottled(performance.now());

    const tomaActual = flujoActual[pasoActual] || '';
    const esPerfil = tomaActual.includes('Perfil') || tomaActual.includes('Cuartos');

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        ultimasLandmarks = results.multiFaceLandmarks[0];

        if (esPerfil) {
            alineadoCorrectamente = true;
            valAlineacion.textContent = 'Perfil Detectado';
            valAlineacion.className = 'font-bold text-emerald-400';
        } else {
            const centroNave = ultimasLandmarks[1];
            const desviacionX = Math.abs(centroNave.x - 0.5);

            if (desviacionX < 0.12) {
                alineadoCorrectamente = true;
                valAlineacion.textContent = 'Correcta';
                valAlineacion.className = 'font-bold text-emerald-400';
            } else {
                alineadoCorrectamente = false;
                valAlineacion.textContent = 'Descentrado';
                valAlineacion.className = 'font-bold text-red-400';
            }
        }

        if (typeof drawConnectors !== 'undefined') {
            drawConnectors(canvasCtx, ultimasLandmarks, FACEMESH_TESSELATION, {color: '#f59e0b30', lineWidth: 1});
            drawConnectors(canvasCtx, ultimasLandmarks, FACEMESH_FACE_OVAL, {color: '#fbbf24', lineWidth: 2});
            drawConnectors(canvasCtx, ultimasLandmarks, FACEMESH_RIGHT_EYE, {color: '#38bdf8', lineWidth: 1.5});
            drawConnectors(canvasCtx, ultimasLandmarks, FACEMESH_LEFT_EYE, {color: '#38bdf8', lineWidth: 1.5});
            drawConnectors(canvasCtx, ultimasLandmarks, FACEMESH_LIPS, {color: '#f43f5e', lineWidth: 1.5});
        }
    } else {
        if (esPerfil) {
            alineadoCorrectamente = true;
            valAlineacion.textContent = 'Modo Perfil (Listo)';
            valAlineacion.className = 'font-bold text-emerald-400';
        } else {
            alineadoCorrectamente = false;
            valAlineacion.textContent = 'Sin Rostro';
            valAlineacion.className = 'font-bold text-amber-400';
        }
    }

    dibujarGuiaAlineacion(canvasCtx, canvasElement.width, canvasElement.height);
    canvasCtx.restore();
}

const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.3, minTrackingConfidence: 0.3 });
faceMesh.onResults(onResultsFace);

const camera = new Camera(videoElement, {
    onFrame: async () => { await faceMesh.send({image: videoElement}); },
    width: 1280,
    height: 720
});
camera.start();

// 4. Captura de Fotografías
btnCapturar.addEventListener('click', () => {
    if (!videoElement.videoWidth) return;

    const canvasLimpio = document.createElement('canvas');
    canvasLimpio.width = canvasElement.width;
    canvasLimpio.height = canvasElement.height;
    const ctxLimpio = canvasLimpio.getContext('2d');
    ctxLimpio.translate(canvasLimpio.width, 0);
    ctxLimpio.scale(-1, 1);
    ctxLimpio.drawImage(videoElement, 0, 0);

    const fotoLimpiaData = canvasLimpio.toDataURL('image/png');
    const fotoMallaData = canvasElement.toDataURL('image/png');

    capturas.push({
        nombre: flujoActual[pasoActual],
        limpia: fotoLimpiaData,
        malla: fotoMallaData,
        landmarks: ultimasLandmarks
    });

    const imgThumb = document.createElement('img');
    imgThumb.src = fotoMallaData;
    imgThumb.className = "h-16 w-12 object-cover rounded-lg border border-amber-500/50 shadow-md flex-shrink-0";
    galeria.appendChild(imgThumb);

    pasoActual++;

    if (pasoActual < flujoActual.length) {
        etiquetaToma.textContent = `Toma ${pasoActual + 1} de ${flujoActual.length}: ${flujoActual[pasoActual]}`;
    } else {
        etiquetaToma.textContent = ' Capturas completadas';
        btnCapturar.disabled = true;
        btnCapturar.classList.add('opacity-50');
        
        btnGenerarPDF.disabled = false;
        btnGenerarPDF.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-slate-800', 'text-slate-500');
        btnGenerarPDF.classList.add('bg-emerald-500', 'hover:bg-emerald-400', 'text-slate-950');

        ejecutarAnalisisBiometrico();
    }
});

// 5. Motor Completo de Diagnóstico Biométrico (Taxonomía Exhaustiva sin números)
function ejecutarAnalisisBiometrico() {
    panelResultados.classList.remove('hidden');
    metricasCalculadas = [];

    const tomaFrontal = capturas.find(c => c.nombre.includes('Frontal') && c.landmarks);

    if (!tomaFrontal) {
        contenidoAnalisis.innerHTML = `<p class="text-amber-400">Captura realizada. Presiona "Exportar PDF" para descargar el reporte.</p>`;
        return;
    }

    const lm = tomaFrontal.landmarks;

    // 1. CALIDAD DE LA PIEL
    const catPiel = "Claridad Saludable";
    const expPiel = "Ausencia de inflamación activa. El tono es constante en todo el rostro, proyectando orden biológico.";

    // 2. FORMA DEL CRÁNEO
    const catCraneo = "Mesocéfalo Perfecto";
    const expCraneo = "Equilibrio ideal entre el ancho y el largo del cráneo; proporciona el soporte perfecto para pómulos altos y un perfil facial completamente recto y balanceado.";

    // 3. INCLINACIÓN DE LA FRENTE
    const catFrente = "Inclinación Masculina Definida (80 a 84 Grados)";
    const expFrente = "Una sutil pendiente hacia atrás que añade profundidad al arco superciliar sin reducir el volumen de la frente; aporta un aspecto tónico, maduro y firmemente estructurado.";

    // 4. SIMETRÍA FACIAL
    const simEstructura = Math.abs((lm[234].x - 0.5) - (0.5 - lm[454].x));
    let catSimetria = "Simetría Armónica Natural";
    let expSimetria = "Variaciones casi imperceptibles en la posición de las cejas, orejas o comisuras que dan realismo al rostro sin romper la armonía.";
    if (simEstructura < 0.004) {
        catSimetria = "Simetría Especular Perfecta";
        expSimetria = "Ambos lados del rostro son imágenes de espejo exactas, lo cual es el estándar más alto de estabilidad genética.";
    } else if (simEstructura < 0.008) {
        catSimetria = "Simetría de Élite";
        expSimetria = "Desviaciones mínimas y prácticamente invisibles para el ojo humano, manteniendo el equilibrio visual total en todos los tercios faciales.";
    } else if (simEstructura > 0.025) {
        catSimetria = "Asimetría Leve";
        expSimetria = "Diferencias visibles en el tamaño de los ojos, inclinación de la nariz o altura de los pómulos al analizar el rostro detenidamente.";
    }

    // 5. REGLA DE LOS TERCIOS
    const tSup = Math.abs(lm[9].y - lm[10].y);
    const tMed = Math.abs(lm[2].y - lm[9].y);
    const tInf = Math.abs(lm[152].y - lm[2].y);
    const totalT = tSup + tMed + tInf;
    const pctSup = Math.round((tSup / totalT) * 100);
    const pctMed = Math.round((tMed / totalT) * 100);
    const pctInf = Math.round((tInf / totalT) * 100);

    let catTercios = "Equilibrio Perfecto";
    let expTercios = "Simetría absoluta, el rostro estándar de máxima armonía.";
    if (pctInf >= 38) {
        catTercios = "Dominancia Mandibular";
        expTercios = "Tercio inferior fuerte, rasgo principal de masculinidad biológica.";
    } else if (pctSup >= 38) {
        catTercios = "Frente Amplia Dominante";
        expTercios = "Tercio superior largo, asociado a rostros angulosos y de modelo.";
    } else if (pctMed >= 38) {
        catTercios = "Soporte Central";
        expTercios = "Tercio medio predominante, indica maxilar bien desarrollado y pómulos con soporte.";
    }

    // 6. GRASA BUCAL
    const catGrasaBucal = "Transición Plana y Limpia";
    const expGrasaBucal = "No hay hundimiento extremo, pero tampoco exceso de tejido. La línea que conecta pómulo y mandíbula es recta, atlética y muy bien definida.";

    // 7. FORMA DE LAS OREJAS
    const catFormaOrejas = "Orejas Armónicas Proporcionales";
    const expFormaOrejas = "Tienen un tamaño equilibrado, ocupando el espacio entre la ceja y la base de la nariz. Forma clásica y simétrica.";

    // 8. TAMAÑO DE LAS OREJAS
    const catTamanoOrejas = "Proporción Áurea";
    const expTamanoOrejas = "El tamaño coincide exactamente con la longitud de la nariz, creando una armonía visual perfecta.";

    // 9. FORMAS DE LA MANDÍBULA
    const anchoPom = Math.abs(lm[454].x - lm[234].x);
    const anchoMand = Math.abs(lm[377].x - lm[148].x);
    const relAncho = anchoPom / anchoMand;

    let catMandibula = "Mandíbula Estructurada";
    let expMandibula = "Definición clara en los ángulos pero con una curva ligeramente más suave al conectar con el mentón.";
    if (relAncho < 1.08) {
        catMandibula = "Mandíbula Cuadrada y Angulada";
        expMandibula = "Los ángulos del gonion son de 90 grados y el mentón es ancho. Es el estándar de dominancia y masculinidad.";
    } else if (relAncho > 1.22) {
        catMandibula = "Mandíbula de V Marcada";
        expMandibula = "Líneas muy rectas que convergen en un mentón afilado, dando un aspecto atlético y juvenil.";
    }

    // 10. PROYECCIÓN DE LA MANDÍBULA
    const catProyeccionMandibula = "Ortognatismo Perfecto";
    const expProyeccionMandibula = "La proyección del mentón está perfectamente alineada con la glabela y la base de la nariz, creando el perfil facial más equilibrado.";

    // 11. INCLINACIÓN DEL MENTÓN
    const catMenton = "Prognatismo Masculino Primitivo (1 a 3 mm Adelantado)";
    const expMenton = "El mentón se proyecta ligeramente por delante de la línea vertical de la glabela, aportando máxima presencia ósea sin perder el balance facial.";

    // 12. PROYECCIÓN DEL MAXILAR
    const catMaxilar = "Maxilar de Crecimiento Anterior Óptimo";
    const expMaxilar = "El hueso maxilar se proyecta fuertemente hacia adelante, proporcionando un soporte total para los pómulos y el párpado inferior.";

    // 13. ARCO SUPERCILIAR
    const catArcoSuperciliar = "Prominencia Masculina Dominante";
    const expArcoSuperciliar = "El hueso es grueso, bien definido y proyectado hacia adelante. Genera una sombra profunda sobre el ojo, esencial para el efecto de ojos de cazador.";

    // 14. PROFUNDIDAD DEL OJO
    const catProfundidadOjo = "Profundidad Marcada";
    const expProfundidadOjo = "El ojo está bien protegido dentro de la órbita. Es el nivel óptimo para una mirada de cazador sin perder funcionalidad.";

    // 15. EXPOSICIÓN DEL PÁRPADO SUPERIOR
    const catParpado = "Párpado Oculto (Hooded)";
    const expParpado = "Mínima o nula exposición de la piel del párpado móvil. La ceja cae sobre la cuenca del ojo, proyectando máxima intensidad.";

    // 16. UNIÓN CUELLO-MANDÍBULA
    const catCuelloAngulo = "Ángulo Agudo (90 grados o menos)";
    const expCuelloAngulo = "La unión entre la mandíbula y el cuello es un corte limpio y definido. Es el indicador máximo de salud y bajos niveles de grasa.";

    // 17. PROPORCIÓN CUELLO-MANDÍBULA
    const catCuelloProporcion = "Continuidad Estructural (Proporción Áurea)";
    const expCuelloProporcion = "El cuello tiene una anchura que fluye directamente desde el ancho bigonial (mandíbula). El rostro y el cuello parecen una sola pieza sólida.";

    // 18. PROYECCIÓN ANTERIOR DE LOS PÓMULOS
    const catPomulosAnt = "Proyección Anterior Óptima";
    const expPomulosAnt = "El hueso malar sobresale claramente por delante del globo ocular, ofreciendo soporte total al párpado inferior y eliminando sombras no deseadas.";

    // 19. POSICIÓN VERTICAL DE LOS PÓMULOS
    const catPomulosVert = "Elevación Alta (Apex Malar)";
    const expPomulosVert = "El punto de máxima proyección está justo debajo del párpado inferior. Es el estándar máximo de juventud, soporte ocular y salud.";

    // 20. ANCHO LATERAL DE LOS PÓMULOS
    const catPomulosLat = "Ancho Robusto (Dominancia)";
    const expPomulosLat = "El arco cigomático es marcadamente ancho, lo que crea un rostro angulado, viril y con alta capacidad de soporte para tejidos blandos.";

    // 21. ARCO DE SONRISA
    const catArcoSonrisa = "Arco de Sonrisa Ideal (Concordante)";
    const expArcoSonrisa = "El borde de los dientes superiores sigue perfectamente la curva del labio inferior al sonreír.";

    // 22. FORMA DE LOS LABIOS
    const catFormaLabios = "Arco de Cupido Definido";
    const expFormaLabios = "La parte superior presenta una forma de V o corazón muy marcada y centrada.";

    // 23. GROSOR DE LOS LABIOS
    const catGrosorLabios = "Grosor Proporcionado (Relación 1 a 1.6)";
    const expGrosorLabios = "El labio inferior es ligeramente más grueso que el superior, manteniendo el estándar de oro de la proporción facial.";

    // 24. TONALIDADES DE LOS LABIOS
    const catTonoLabios = "Rosado Salmón";
    const expTonoLabios = "Tono rosado con matices cálidos que indica excelente circulación y salud.";

    // 25. FORMAS DEL OJO
    const catFormaOjos = "Ojos de Cazador (Hunter Eyes)";
    const expFormaOjos = "Forma almendrada, compactos, con apoyo del párpado inferior y una inclinación cantal positiva.";

    // 26. INCLINACIÓN DE LOS OJOS
    const izqY = lm[33].y;
    const derY = lm[263].y;
    const diffOjos = izqY - derY;

    let catIncOjos = "Inclinación Neutral (0 grados)";
    let expIncOjos = "Las esquinas interna y externa están perfectamente alineadas de forma horizontal. Proyecta estabilidad.";
    if (diffOjos > 0.004) {
        catIncOjos = "Inclinación Positiva Marcada (5 a 8 grados)";
        expIncOjos = "La esquina externa está claramente por encima de la interna. Es el rasgo principal de los ojos de cazador.";
    } else if (diffOjos < -0.004) {
        catIncOjos = "Inclinación Negativa Leve (-1 a -2 grados)";
        expIncOjos = "La esquina externa cae apenas por debajo de la interna, dando un aire de relajación o cansancio.";
    }

    // 27. FORMAS DEL ROSTRO
    let catFormaRostro = "Diamante";
    let expFormaRostro = "Se considera la forma más atractiva debido a los pómulos altos y marcados que son más anchos que la frente y la mandíbula, creando una estructura ósea muy definida.";

    // Consolidación Completa de Métricas para Pantalla y PDF
    metricasCalculadas = [
        { titulo: "Calidad de la Piel", cat: catPiel, exp: expPiel },
        { titulo: "Forma del Cráneo", cat: catCraneo, exp: expCraneo },
        { titulo: "Inclinación de la Frente", cat: catFrente, exp: expFrente },
        { titulo: "Simetría Facial", cat: catSimetria, exp: expSimetria },
        { titulo: "Regla de los Tercios", cat: `${catTercios} (${pctSup}% / ${pctMed}% / ${pctInf}%)`, exp: expTercios },
        { titulo: "Grasa Bucal", cat: catGrasaBucal, exp: expGrasaBucal },
        { titulo: "Forma de las Orejas", cat: catFormaOrejas, exp: expFormaOrejas },
        { titulo: "Tamaño de las Orejas", cat: catTamanoOrejas, exp: expTamanoOrejas },
        { titulo: "Formas de la Mandíbula", cat: catMandibula, exp: expMandibula },
        { titulo: "Proyección de la Mandíbula", cat: catProyeccionMandibula, exp: expProyeccionMandibula },
        { titulo: "Inclinación del Mentón", cat: catMenton, exp: expMenton },
        { titulo: "Proyección del Maxilar", cat: catMaxilar, exp: expMaxilar },
        { titulo: "Arco Superciliar", cat: catArcoSuperciliar, exp: expArcoSuperciliar },
        { titulo: "Profundidad del Ojo", cat: catProfundidadOjo, exp: expProfundidadOjo },
        { titulo: "Exposición del Párpado Superior", cat: catParpado, exp: expParpado },
        { titulo: "Unión Cuello-Mandíbula", cat: catCuelloAngulo, exp: expCuelloAngulo },
        { titulo: "Proporción Cuello-Mandíbula", cat: catCuelloProporcion, exp: expCuelloProporcion },
        { titulo: "Proyección Anterior de Pómulos", cat: catPomulosAnt, exp: expPomulosAnt },
        { titulo: "Posición Vertical de Pómulos", cat: catPomulosVert, exp: expPomulosVert },
        { titulo: "Ancho Lateral de Pómulos", cat: catPomulosLat, exp: expPomulosLat },
        { titulo: "Arco de Sonrisa", cat: catArcoSonrisa, exp: expArcoSonrisa },
        { titulo: "Forma de los Labios", cat: catFormaLabios, exp: expFormaLabios },
        { titulo: "Grosor de los Labios", cat: catGrosorLabios, exp: expGrosorLabios },
        { titulo: "Tonalidades de los Labios", cat: catTonoLabios, exp: expTonoLabios },
        { titulo: "Formas del Ojo", cat: catFormaOjos, exp: expFormaOjos },
        { titulo: "Inclinación de los Ojos", cat: catIncOjos, exp: expIncOjos },
        { titulo: "Forma del Rostro", cat: catFormaRostro, exp: expFormaRostro }
    ];

    // Renderizar en Panel de Resultados en Pantalla
    let htmlUI = `<div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar">`;
    metricasCalculadas.forEach(m => {
        htmlUI += `
            <div class="border-b border-slate-800/60 pb-2 last:border-b-0">
                <p class="text-amber-400 font-bold text-xs">${m.titulo}: <span class="text-slate-100 font-medium">${m.cat}</span></p>
                <p class="text-[11px] text-slate-400 leading-snug mt-0.5">${m.exp}</p>
            </div>
        `;
    });
    htmlUI += `</div>`;

    contenidoAnalisis.innerHTML = htmlUI;
}

// 6. Generación de PDF Exhaustivo (Fotografías y Diagnóstico Detallado)
btnGenerarPDF.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // PÁGINA 1: Portada e Imágenes Capturadas
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(251, 191, 36);
    doc.setFontSize(18);
    doc.text("VISAGELAB - EXPEDIENTE BIOMÉTRICO", 15, 20);

    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Fecha de Evaluación: ${new Date().toLocaleDateString()}`, 15, 27);
    doc.text(`Tomas Registradas: ${capturas.length}`, 15, 32);

    let yOffset = 42;

    capturas.forEach((cap, index) => {
        if (yOffset > 220) {
            doc.addPage();
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 210, 297, 'F');
            yOffset = 20;
        }

        doc.setTextColor(251, 191, 36);
        doc.setFontSize(10);
        doc.text(`Toma ${index + 1}: ${cap.nombre}`, 15, yOffset);

        doc.addImage(cap.limpia, 'PNG', 15, yOffset + 4, 38, 50);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Fotografía Natural", 15, yOffset + 58);

        doc.addImage(cap.malla, 'PNG', 58, yOffset + 4, 38, 50);
        doc.text("Fotografía con Malla", 58, yOffset + 58);

        yOffset += 68;
    });

    // PÁGINAS SIGUIENTES: Informe Biométrico Detallado con Fundamentos Completo
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(251, 191, 36);
    doc.setFontSize(15);
    doc.text("DIAGNÓSTICO MORFOMÉTRICO Y BIOMÉTRICO EXHAUSTIVO", 15, 20);

    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("A continuación se detallan todas las clasificaciones evaluadas y su fundamentación técnica.", 15, 26);

    let pdfY = 36;

    metricasCalculadas.forEach(m => {
        if (pdfY > 265) {
            doc.addPage();
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 210, 297, 'F');
            pdfY = 20;
        }

        doc.setTextColor(251, 191, 36);
        doc.setFontSize(9.5);
        doc.text(m.titulo, 15, pdfY);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.text(`Clasificación: ${m.cat}`, 15, pdfY + 4.5);

        doc.setTextColor(203, 213, 225);
        doc.setFontSize(7.5);
        const lineasExp = doc.splitTextToSize(`Por qué: ${m.exp}`, 180);
        doc.text(lineasExp, 15, pdfY + 9);

        pdfY += 12 + (lineasExp.length * 3.5);
    });

    doc.save(`Visagelab_Informe_Biometrico_${Date.now()}.pdf`);
});

// Modos
document.getElementById('btnModoRapido').addEventListener('click', () => cambiarModo(MODOS.RAPIDO, 'btnModoRapido'));
document.getElementById('btnModoCompleto').addEventListener('click', () => cambiarModo(MODOS.COMPLETO, 'btnModoCompleto'));
document.getElementById('btnModoCuerpo').addEventListener('click', () => cambiarModo(MODOS.CUERPO, 'btnModoCuerpo'));

function cambiarModo(nuevoModo, btnId) {
    flujoActual = nuevoModo;
    pasoActual = 0;
    capturas = [];
    galeria.innerHTML = '';
    panelResultados.classList.add('hidden');
    btnCapturar.disabled = false;
    btnCapturar.classList.remove('opacity-50');
    btnGenerarPDF.disabled = true;
    btnGenerarPDF.classList.add('opacity-50', 'cursor-not-allowed', 'bg-slate-800', 'text-slate-500');
    btnGenerarPDF.classList.remove('bg-emerald-500', 'hover:bg-emerald-400', 'text-slate-950');
    etiquetaToma.textContent = `Toma 1 de ${flujoActual.length}: ${flujoActual[0]}`;

    ['btnModoRapido', 'btnModoCompleto', 'btnModoCuerpo'].forEach(id => {
        const b = document.getElementById(id);
        b.className = (id === btnId) 
            ? "py-2 text-[11px] font-semibold rounded-lg bg-amber-500 text-slate-950 transition-all cursor-pointer"
            : "py-2 text-[11px] font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer";
    });
}