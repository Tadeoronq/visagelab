"""
config/taxonomy.py
Catálogo taxonómico descriptivo completo para Visagelab.
Morfometría, proporciones, planos esqueléticos y colorimetría CIE-Lab.
"""

TAXONOMIA_TERCIOS = {
    "equilibrio_perfecto": "Equilibrio Armónico: Proporción balanceada entre tercio superior, medio e inferior.",
    "dominancia_mandibular": "Dominancia Mandibular: Tercio inferior predominante con marco óseo estructurado.",
    "arquetipo_intelectual": "Frente Prominente: Tercio superior predominante sobre tercio medio e inferior.",
    "soporte_central": "Soporte Central: Predominio del tercio medio con soporte malar y maxilar sólido.",
    "masculinidad_atletica": "Marco Inferior Robusto: Gran desarrollo vertical del tercio inferior.",
    "perfil_juvenil": "Tercio Inferior Compacto: Proporción acortada del mentón que suaviza las facciones.",
    "tercio_medio_elongado": "Tercio Medio Elongado: Región nasal predominante en la verticalidad facial.",
    "desequilibrio": "Asimetría Vertical de Tercios: Variación notable en la distribución longitudinal de los tercios."
}

TAXONOMIA_QUINTOS = {
    "proporcion_aurea": "Proporción Equilibrada: División transversal congruente con la regla de cinco anchos oculares.",
    "arquetipo_cazador": "Amplitud Ocular Compacta: Ojos de buena extensión transversal con separación intercantal ajustada.",
    "anchura_elite": "Estructura Lateral Expansiva: Mayor amplitud lateral en los quintos externos (arcos cigomáticos firmes).",
    "enfoque_central": "Enfoque Central: Espaciado intercantal estrecho con mirada directa y definida.",
    "distancia_amplia": "Distancia Interocular Amplia: Separación intercantal extendida con base nasal espaciosa.",
    "estrechez_lateral": "Rostro Lateral Estrecho: Quintos externos reducidos en comparación con el tercio medio."
}

TAXONOMIA_FORMA_ROSTRO = {
    "diamante": "Forma Diamante: Pómulos altos y definidos con frente y mandíbula proporcionalmente más estrechas.",
    "ovalada": "Forma Ovalada: Contornos armónicos de transición suave, con proporción balanceada alto/ancho.",
    "cuadrada": "Forma Cuadrada: Mandíbula ancha y definida alineada transversalmente con el ancho frontal.",
    "rectangular": "Forma Rectangular: Estructura ósea alargada con rebordes mandibulares y frontales rectos.",
    "corazon": "Triángulo Invertido / Corazón: Frente amplia que converge de manera afilada hacia el mentón.",
    "triangular": "Forma Triangular: Base mandibular amplia que supera el ancho bicigomático y frontal.",
    "redonda": "Forma Redonda: Ángulos óseos suavizados con relación ancho/alto cercana a la unidad.",
    "pera": "Forma Trapezoidal / Pera: Región frontal estrecha con mandíbula densa y ángulo gonial expandido."
}

TAXONOMIA_SIMETRIA = {
    "especular_perfecta": "Simetría Especular: Alineación bilateral prácticamente exacta respecto al eje sagital central.",
    "armonica_natural": "Simetría Armónica Natural: Variaciones fisiológicas sutiles sin impacto en el balance visual.",
    "asimetria_leve": "Asimetría Bilateral Leve: Desviación incipiente en comisuras, cantos o alas nasales.",
    "asimetria_moderada": "Asimetría Estructural Moderada: Desviación visible entre ambos hemisferios faciales.",
    "asimetria_severa": "Asimetría Significativa: Discrepancia marcada en base esquelética o inserción tisular."
}

TAXONOMIA_ANCHO_NASAL = {
    "ideal": "Ancho Nasal Ideal: La base alar coincide exactamente con la distancia intercantal interna.",
    "delgado": "Ancho Delgado: Base alar más estrecha que la distancia intercantal, enfatizando la mirada.",
    "natural_medio": "Ancho Medio Natural: Base alar sutilmente mayor a la distancia intercantal.",
    "expandido": "Base Alar Expandida: Las alas nasales sobrepasan visiblemente la línea vertical de los cantos internos."
}

TAXONOMIA_INCLINACION_CANTAL = {
    "positiva_marcada": "Inclinación Positiva Marcada (5° a 8°): Canto lateral claramente elevado respecto al medial (Rasgo Cazador).",
    "positiva_sutil": "Inclinación Positiva Sutil (2° a 4°): Elevación fisiológica que aporta dinamismo y firmeza a la mirada.",
    "neutral": "Inclinación Neutral (0° a 1°): Eje intercantal estrictamente horizontal.",
    "negativa_leve": "Inclinación Negativa Leve (-1° a -2°): Descenso sutil del canto externo.",
    "negativa_moderada": "Inclinación Negativa Moderada (-3° a -5°): Descenso visible que aporta una expresión descendente.",
    "asimetrica": "Inclinación Cantal Asimétrica: Discrepancia angular evidente entre el ojo izquierdo y derecho."
}

TAXONOMIA_PARPADO = {
    "hooded_oculto": "Párpado Oculto (Hooded): Cobertura total del pliegue sobre el párpado móvil con soporte superciliar bajo.",
    "minima": "Exposición Mínima: Fina banda de párpado móvil visible al mantener la mirada neutra.",
    "moderada": "Exposición Moderada: Apertura palpebral armónica y balanceada.",
    "alta_expuesta": "Exposición Palpebral Alta: Pliegue tarsal ampliamente expuesto con reborde orbitario retrasado."
}

TAXONOMIA_ARQUETIPO_OJOS = {
    "hunter": "Ojos Compactos / Cazador: Contorno almendrado cerrado, soporte palpebral firme e inclinación cantal positiva.",
    "almendrado": "Ojos Almendrados: Proporción simétrica entre apertura vertical y horizontal.",
    "redondo": "Ojos Redondos: Gran exposición de apertura vertical con curvatura palpebral circular.",
    "prey": "Apertura Ocular Expuesta: Esclera visible bajo el iris con párpado superior desprotegido."
}

TAXONOMIA_CEJAS = {
    "densas_definidas": "Cejas Densas y Estructuradas: Cobertura capilar uniforme que enmarca con firmeza el arco superciliar.",
    "densidad_media": "Cejas de Densidad Media: Distribución homogénea y equilibrada.",
    "dispersas_claras": "Cejas Dispersas o Finas: Menor cobertura folicular con menor definición del reborde orbitario."
}

TAXONOMIA_PERFIL_MENTON = {
    "ortognatismo_apex": "Ortognatismo Apex (0 a -1 mm): Mentón alineado con la Línea Vertical Verdadera de González-Ulloa.",
    "prognatismo": "Prognatismo Anterior: Mentón proyectado por delante de la línea vertical verdadera.",
    "receso_armonico": "Receso Armónico (-2 mm): Posición posterior sutil que conserva balance y soporte tisular.",
    "retrognatismo_moderado": "Retrognatismo: Deficiencia en la proyección anterior de la mandíbula.",
    "colapso_severo": "Retrusión Mandibular Crítica: Pérdida marcada de soporte en el tercio inferior de perfil."
}

TAXONOMIA_ANGULO_NASOLABIAL = {
    "marcial_apex": "Ángulo Nasolabial Marcial (90° a 95°): Base columelar en escuadra con el filtrum superior.",
    "respingado": "Inclinación Respingada (96° a 105°): Elevación estética de la punta nasal.",
    "caido_aquilino": "Ángulo Caído / Aquilino (< 90°): Punta con rotación caudal hacia el labio superior.",
    "hiper_respingado": "Exposición Hiper-respingada (> 105°): Rotación superior abierta con exposición narinaria frontal."
}

TAXONOMIA_CUELLO_MANDIBULA = {
    "proporcion_continua": "Continuidad Cuello-Mandíbula Robusta: Anchura cervical congruente con el ancho bigonial.",
    "atletico_balanceado": "Estructura Cervical Balanceada: Transición atlética firme con soporte óseo visible.",
    "cuello_estrecho": "Soporte Cervical Delgado: Anchura del cuello marcadamente inferior al marco gonial.",
    "transicion_suavizada": "Transición Cervicomandibular Suave: Curvatura intermedia con acumulación tisular moderada."
}

TAXONOMIA_SUBTONO = {
    "frio": "Subtono Frío: Predominio de pigmentos azulados y rosáceos; responde a paletas plateadas y pigmentos base azul.",
    "neutro_frio": "Subtono Neutro con Tendencia Fría: Equilibrio carotenoide con ligera predominancia rosácea.",
    "neutro": "Subtono Neutro Verdadero: Balance óptimo entre matices cálidos y fríos, permitiendo versatilidad cromática.",
    "neutro_calido": "Subtono Neutro con Tendencia Cálida: Matiz dorado sutil con buena tolerancia a tonos tierra.",
    "calido": "Subtono Cálido: Predominio de reflejos dorados y amarillos; responde a metales dorados y pigmentos cobrizos/tierra.",
    "oliva": "Subtono Oliva / Cetrino: Combinación de pigmento verde/grisáceo sobre base neutra, requiere neutralizadores específicos."
}

TAXONOMIA_FOTOTIPO_ITA = {
    "muy_claro": "Fototipo Muy Claro (Muy Pálido): Alta reactividad lumínica, luminosidad L* elevada.",
    "claro": "Fototipo Claro: Dermis clara con moderada sensibilidad y rápida respuesta a saturaciones suaves.",
    "intermedio": "Fototipo Intermedio (Trigueño / Beige): Tono medio con balance de melanina homogéneo.",
    "bronceado": "Fototipo Bronceado / Moreno Claro: Dermis pigmentada resistente con profundidad media-alta.",
    "oscuro": "Fototipo Oscuro / Moreno: Alta densidad melánica con reflejos profundos.",
    "muy_oscuro": "Fototipo Profundo: Máxima concentración melánica con contraste superficial bajo."
}

TAXONOMIA_CONTRASTE = {
    "alto": "Contraste Facial Alto: Discrepancia marcada de luminancia entre cabello/cejas y la tez; soporta delineados y labios protagónicos.",
    "medio": "Contraste Facial Medio: Transición armónica entre ojos, cabello y piel; ideal para difuminados y tonos de intensidad intermedia.",
    "bajo": "Contraste Facial Suave / Bajo: Luminancia similar entre cabello, iris y dermis; favorece técnicas monocromáticas y sombras etéreas."
}

TAXONOMIA_ESTACION = {
    "invierno": "Estación Analítica Invierno: Base fría con contraste medio-alto; indicada para tonos puros, saturados y fríos.",
    "verano": "Estación Analítica Verano: Base fría con contraste bajo-medio; indicada para tonos pastel, lavandas y empolvados.",
    "otono": "Estación Analítica Otoño: Base cálida con contraste medio-bajo; indicada para tonos ocres, mostazas y terracotas.",
    "primavera": "Estación Analítica Primavera: Base cálida con contraste medio-alto; indicada para tonos coral, melocotón y dorados vivos."
}
