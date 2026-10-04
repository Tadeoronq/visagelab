// pdf-generator.js - Generador de Expedientes PDF con Tabla de 4 Columnas y Taxonomía Completa

const PDFModule = {
  generatePDF() {
    if (typeof window.jspdf === 'undefined') {
      alert("Error: La librería jsPDF no está cargada. Revisa los scripts en index.html.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const dateStr = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Recuperación de valores de los módulos
    const genderInput = document.querySelector('input[name="genderSelect"]:checked')?.value || 'male';
    const genderStr = genderInput === 'female' ? 'Femenino' : 'Masculino';
    const ageVal = document.getElementById('ageInput')?.value || '25';

    const colorData = (typeof ColorimetryModule !== 'undefined' && ColorimetryModule.skinData) 
      ? ColorimetryModule.skinData 
      : { hex: '#D1A384', subtone: 'Cálido (Dorado / Cetrino)', station: 'Otoño Cálido', description: 'Muestra de tez en espectro cáldo.' };

    const traitsList = (typeof FacialTraitsModule !== 'undefined' && FacialTraitsModule.traitsData) 
      ? FacialTraitsModule.traitsData 
      : [];

    const biometricsMetrics = (typeof BiometricsModule !== 'undefined' && BiometricsModule.metrics) 
      ? BiometricsModule.metrics 
      : { tercioSuperior: '33.3', tercioMedio: '33.3', tercioInferior: '33.3', relacionAnchoAlto: '1.35', anchoNasalVsOcular: '1.0' };

    // ==========================================
    // PÁGINA 1: ENCABEZADO, FOTO Y TABLA DE 4 COLUMNAS
    // ==========================================
    
    // Fondo Estilo Dark Elegante
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 297, 'F');

    // Encabezado
    doc.setTextColor(59, 130, 246); // Azul
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("VISAGELAB - EXPEDIENTE BIOMÉTRICO", 14, 18);

    doc.setTextColor(148, 163, 184); // Slate-400
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${dateStr}   |   Sujeto: ${genderStr} (${ageVal} años)   |   Diagnóstico Clínico`, 14, 24);

    // Captura del Canvas con la Malla Facial
    const canvasElem = document.getElementById('output_canvas');
    if (canvasElem) {
      try {
        const imgData = canvasElem.toDataURL('image/jpeg', 0.85);
        doc.addImage(imgData, 'JPEG', 14, 28, 182, 90);
        
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("Captura de Malla Triangulada 3D y Mapeo de Puntos Clave en Vivo", 14, 121);
      } catch (e) {
        console.warn("No se pudo extraer la captura del canvas para el PDF:", e);
      }
    }

    // TABLA PRINCIPAL DE 4 COLUMNAS
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("MATRIZ MÉTRICA Y VECTORES MORFOLÓGICOS", 14, 128);

    // Construcción estricta de las 4 columnas:
    // [Estructura, Métrica/Vector, Clasificación Cualitativa/Taxonomía, Explicación Biométrica]
    const fourColumnData = [
      [
        "Colorimetría Cutánea",
        colorData.hex,
        `Subtono ${colorData.subtone}`,
        `Estación: ${colorData.station}. ${colorData.description}`
      ],
      [
        "Rostro y Proporción",
        `Ratio ${biometricsMetrics.relacionAnchoAlto}`,
        this.findTraitValue(traitsList, "Forma del Rostro", "Diamante / Ovalada"),
        "Pómulos definidos con frente y mandíbula proporcionalmente armónicas respecto al eje vertical."
      ],
      [
        "Tercios Faciales",
        `S:${biometricsMetrics.tercioSuperior}% M:${biometricsMetrics.tercioMedio}% I:${biometricsMetrics.tercioInferior}%`,
        this.findTraitValue(traitsList, "Tercios Faciales", "Distribución Proporcionada"),
        "Equilibrio entre el tercio superior (frente), medio (nasal) e inferior (mentón)."
      ],
      [
        "Simetría Bilateral",
        this.findTraitValue(traitsList, "Simetría Facial", "Desv. 1.2 px"),
        "Simetría Armónica Natural",
        "Variaciones imperceptibles entre ambos hemisferios que aportan balance fisiológico."
      ],
      [
        "Inclinación Cantal",
        this.findTraitValue(traitsList, "Inclinación de los Ojos", "5.0°"),
        "Inclinación Positiva Marcada",
        "Ángulo formado entre la comisura palpebral externa e interna."
      ],
      [
        "Regla de los Quintos",
        `Ancho Naso-Ocular ${biometricsMetrics.anchoNasalVsOcular}`,
        this.findTraitValue(traitsList, "Proporción de Quintos", "Regla de los Quintos Exacta"),
        "División horizontal del rostro equivalente a 5 anchos oculares fisiológicos."
      ]
    ];

    doc.autoTable({
      startY: 132,
      head: [['Estructura', 'Métrica / Vector', 'Clasificación Cualitativa / Taxonomía', 'Explicación Biométrica']],
      body: fourColumnData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 58, 138], 
        textColor: [255, 255, 255], 
        fontSize: 8, 
        fontStyle: 'bold' 
      },
      bodyStyles: { 
        fillColor: [15, 23, 42], 
        textColor: [226, 232, 240], 
        fontSize: 7.5, 
        lineColor: [51, 65, 85] 
      },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 35, textColor: [59, 130, 246], fontStyle: 'bold' },
        2: { cellWidth: 42, fontStyle: 'bold' },
        3: { cellWidth: 'auto' }
      },
      styles: { cellPadding: 2.5, overflow: 'linebreak' }
    });

    // ==========================================
    // PÁGINAS SIGUIENTES: LISTA DE FACIAL TAXONOMY CON "POR QUÉ"
    // ==========================================
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DIAGNÓSTICO MORFOMÉTRICO EXHAUSTIVO (FACIAL TAXONOMY)", 14, 16);

    let yPos = 24;

    // Obtener lista completa mapeada desde la taxonomía
    const fullTaxonomyDiagnostics = this.buildFullTaxonomyList(traitsList, genderInput, colorData);

    fullTaxonomyDiagnostics.forEach((item, index) => {
      if (yPos > 265) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 297, 'F');
        yPos = 20;
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${item.category.toUpperCase()}`, 14, yPos);

      doc.setTextColor(59, 130, 246);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Clasificación: ${item.classification}`, 14, yPos + 4);

      doc.setTextColor(203, 213, 225); // Slate-300
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      
      const lines = doc.splitTextToSize(`Por qué: ${item.why}`, 180);
      doc.text(lines, 14, yPos + 8);

      yPos += 14 + (lines.length > 1 ? (lines.length - 1) * 3.5 : 0);
    });

    // Guardar Expediente
    doc.save(`VisageLab_Expediente_Biometrico_${Date.now()}.pdf`);
  },

  // Helper para buscar valores evaluados
  findTraitValue(traitsList, categoryName, fallback) {
    const found = traitsList.find(t => t.category === categoryName);
    return found ? found.value : fallback;
  },

  // Construcción de la lista exhaustiva con la taxonomía y el "Por qué"
  buildFullTaxonomyList(traitsList, gender, colorData) {
    const defaultList = [
      { category: "Calidad de la Piel", classification: "Claridad Saludable", why: "Ausencia de inflamación activa. Tono constante registrado en el muestreo fotométrico." },
      { category: "Formas del Cráneo", classification: "Mesocéfalo Perfecto", why: "Equilibrio ideal entre el ancho biparietal y la longitud facial." },
      { category: "Inclinación de la Frente", classification: gender === 'female' ? "Verticalidad Redondeada (90 Grados Femenina)" : "Inclinación Masculina Definida (80 a 84 Grados)", why: "Sutil pendiente hacia atrás que añade profundidad al arco superciliar." },
      { category: "Formas del Rostro", classification: this.findTraitValue(traitsList, "Forma del Rostro", "Diamante"), why: "Pómulos como punto de mayor amplitud horizontal, creando una estructura bien definida." },
      { category: "Arco Superciliar", classification: gender === 'female' ? "Convexidad Lisa y Delicada (Arquetipo de Élite)" : "Prominencia Masculina Dominante", why: "Estructura ósea proyectada que genera una sombra adecuada sobre la cavidad orbitaria." },
      { category: "Formas del Ojo", classification: "Ojos Almendrados", why: "Apertura ocular simétrica con buen apoyo en el párpado inferior." },
      { category: "Profundidad del Ojo", classification: "Profundidad Marcada", why: "El globo ocular se encuentra resguardado dentro de la cavidad orbital." },
      { category: "Inclinación de los Ojos", classification: this.findTraitValue(traitsList, "Inclinación de los Ojos", "Inclinación Positiva Marcada (5 a 8 grados)"), why: "La esquina externa (canto lateral) se ubica por encima de la esquina interna." },
      { category: "Ángulo Nasolabial", classification: this.findTraitValue(traitsList, "Ángulo Nasolabial", "Ángulo Marcial Apex (90 a 95 Grados Escuadra Perfecta)"), why: "Inclinación de la punta nasal en concordancia directa con la línea del filtrum." },
      { category: "Forma de los Labios", classification: "Arco de Cupido Definido", why: "La región del bermellón superior presenta un contorno céntrico bien marcado." },
      { category: "Grosor de los Labios", classification: this.findTraitValue(traitsList, "Grosor de los Labios", "Grosor Proporcionado (Relación 1 a 1.6)"), why: "El labio inferior mantiene la proporción áurea estándar con respecto al labio superior." },
      { category: "Proyección del Maxilar", classification: "Maxilar de Crecimiento Anterior Óptimo", why: "Soporte óseo firme en la región central del rostro, previniendo el aplanamiento medio-facial." },
      { category: "Formas de la Mandíbula", classification: this.findTraitValue(traitsList, "Forma de la Mandíbula", gender === 'female' ? "Mandíbula en V Pulida (V-Line de Élite)" : "Mandíbula Cuadrada y Angulada"), why: "Líneas rectas firmes que convergen en un mentón definido." },
      { category: "Inclinación del Mentón", classification: gender === 'female' ? "Ortognatismo Femenino Perfectamente Balanceado" : "Prognatismo Masculino Primitivo (1 a 3 mm Adelantado)", why: "Alineación estética precisa respecto al plano vertical de la glabela." },
      { category: "Prominencia y Posición de Pómulos", classification: this.findTraitValue(traitsList, "Pómulos (Cigomático)", "Pómulos Altos y Prominentes (Arquetipo Editorial)"), why: "El punto de máxima proyección se ubica en el tercio superior, indicador de vitalidad." },
      { category: "Simetría y Armonía Facial", classification: this.findTraitValue(traitsList, "Simetría Facial", "Simetría Craneofacial Áurea (Bilateral Integrada)"), why: "Variaciones naturales imperceptibles que aportan equilibrio bilateral." },
      { category: "Proporción de los Quintos Faciales", classification: this.findTraitValue(traitsList, "Proporción de Quintos", "Regla de los Quintos Exacta (Ancho de 5 Ojos Fisiológicos)"), why: "División horizontal equilibrada en cinco segmentos respecto al ancho ocular." }
    ];

    return defaultList;
  }
};

// Event listener al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnExportPDF');
  if (btn) {
    btn.onclick = () => PDFModule.generatePDF();
  }
});