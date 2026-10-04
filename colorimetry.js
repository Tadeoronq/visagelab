// colorimetry.js - Módulo de Diagnóstico Fotométrico y Colorimetría Armónica

const ColorimetryModule = {
  skinData: null,

  analyze(canvasElement, landmarks) {
    if (!canvasElement || !landmarks || landmarks.length < 454) return;

    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 1. PUNTOS DE MUESTREO FACIAL (Piel: Frente, Mejilla Derecha, Mejilla Izquierda, Mentón)
    const samplingIndices = [10, 117, 346, 152];
    let totalR = 0, totalG = 0, totalB = 0;
    let count = 0;

    samplingIndices.forEach(idx => {
      const pt = landmarks[idx];
      if (pt) {
        const x = Math.floor(pt.x * canvasElement.width);
        const y = Math.floor(pt.y * canvasElement.height);

        // Muestreo de un área de 5x5 píxeles alrededor de cada punto
        try {
          const pixelData = ctx.getImageData(Math.max(0, x - 2), Math.max(0, y - 2), 5, 5).data;
          for (let i = 0; i < pixelData.length; i += 4) {
            totalR += pixelData[i];
            totalG += pixelData[i + 1];
            totalB += pixelData[i + 2];
            count++;
          }
        } catch (e) {
          // Ignorar errores en caso de muestreo fuera de límites de canvas
        }
      }
    });

    if (count === 0) return;

    // Promedio RGB de la piel
    const avgR = Math.round(totalR / count);
    const avgG = Math.round(totalG / count);
    const avgB = Math.round(totalB / count);

    // 2. CÁLCULO DE PROPIEDADES DE COLOR (HSV / Subtono)
    const skinHex = this.rgbToHex(avgR, avgG, avgB);
    const { subtone, temperatureScore } = this.determineSubtone(avgR, avgG, avgB);
    const station = this.determineStation(avgR, avgG, avgB, temperatureScore);

    this.skinData = {
      rgb: `rgb(${avgR}, ${avgG}, ${avgB})`,
      hex: skinHex,
      subtone: subtone,
      station: station.name,
      palette: station.palette,
      description: station.description
    };

    this.updateUI();
  },

  // Convierte valores RGB a formato HEX
  rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  },

  // Algoritmo de clasificación de Subtono (Frío vs Cálido vs Neutro)
  determineSubtone(r, g, b) {
    // Índice de calidez basado en el balance Rojo vs Azul/Verde
    const warmthRatio = (r - b) / (r + g + b || 1);
    
    let subtone = "Neutro";
    if (warmthRatio > 0.18) {
      subtone = "Cálido (Dorado / Amarillo)";
    } else if (warmthRatio < 0.12) {
      subtone = "Frío (Rosado / Azulado)";
    } else {
      subtone = "Neutro / Neutro-Cálido";
    }

    return { subtone, temperatureScore: warmthRatio };
  },

  // Algoritmo de Diagnóstico de Estación Estacional
  determineStation(r, g, b, warmth) {
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    if (warmth > 0.16) {
      // Rama Cálida
      if (luminance > 0.55) {
        return {
          name: "Primavera Luminosa",
          palette: ["#FF7F50", "#FFE4B5", "#78C800", "#FFD700", "#F4A460"],
          description: "Tonos cálidos, claros y brillantes. Te favorecen los dorados y melocotón."
        };
      } else {
        return {
          name: "Otoño Profundo",
          palette: ["#8B4513", "#D2691E", "#556B2F", "#CD853F", "#800000"],
          description: "Tonos cálidos, ricos y terrosos. Te favorece la terracota, mostaza y oliva."
        };
      }
    } else {
      // Rama Fría / Neutra
      if (luminance > 0.52) {
        return {
          name: "Verano Suave",
          palette: ["#E6E6FA", "#B0E0E6", "#DB7093", "#708090", "#C0C0C0"],
          description: "Tonos fríos, suaves y desaturados. Te favorecen los pasteles azucarados y plata."
        };
      } else {
        return {
          name: "Invierno Intenso",
          palette: ["#000080", "#800080", "#DC143C", "#000000", "#FFFFFF"],
          description: "Tonos fríos, oscuros y contrastados. Te favorecen los colores puros y plata."
        };
      }
    }
  },

  // Renderizado en la interfaz
  updateUI() {
    const panel = document.getElementById('colorimetry-data');
    if (!panel || !this.skinData) return;

    const paletteHTML = this.skinData.palette
      .map(color => `<div class="w-6 h-6 rounded-full border border-gray-700 shadow-sm" style="background-color: ${color};" title="${color}"></div>`)
      .join('');

    panel.innerHTML = `
      <div class="flex justify-between items-center border-b border-gray-800 pb-2">
        <span>Tono de Piel:</span>
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono text-gray-300">${this.skinData.hex}</span>
          <div class="w-4 h-4 rounded-full border border-gray-600" style="background-color: ${this.skinData.hex}"></div>
        </div>
      </div>
      <div class="flex justify-between items-center pt-1">
        <span>Subtono Detectado:</span>
        <strong class="text-rose-400 text-xs">${this.skinData.subtone}</strong>
      </div>
      <div class="flex justify-between items-center pt-1">
        <span>Estación Armónica:</span>
        <strong class="text-amber-300">${this.skinData.station}</strong>
      </div>
      <div class="pt-3 border-t border-gray-800">
        <p class="text-xs text-gray-400 mb-2">Paleta Recomendada:</p>
        <div class="flex gap-2 justify-start items-center">
          ${paletteHTML}
        </div>
      </div>
      <p class="text-[11px] text-gray-400 italic pt-2">${this.skinData.description}</p>
    `;
  }
};