"""
exporters/pdf_exporter.py
"""
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def exportar_diagnostico_pdf(datos_frontal: dict, datos_ojos: dict, datos_perfil: dict, datos_color: dict, ruta_salida: str = "reporte_visagelab.pdf"):
    doc = SimpleDocTemplate(
        ruta_salida,
        pagesize=letter,
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )

    styles = getSampleStyleSheet()
    titulo_style = ParagraphStyle(
        'TituloDoc',
        parent=styles['Heading1'],
        fontSize=17,
        leading=21,
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=4
    )
    subtitulo_style = ParagraphStyle(
        'SubDoc',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#6B7280"),
        spaceAfter=12
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#111827")
    )
    body_desc = ParagraphStyle(
        'BodyDesc',
        parent=styles['Normal'],
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#374151")
    )

    elementos = []
    elementos.append(Paragraph("VISAGELAB | DOSSIER MORFOLÓGICO Y COLORIMÉTRICO", titulo_style))
    elementos.append(Paragraph(f"Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M')} | Protocolo Clínico 5 Tomas con Análisis CIE-Lab", subtitulo_style))
    elementos.append(Spacer(1, 6))

    tabla_data = [
        [
            Paragraph("<b>Estructura</b>", body_bold),
            Paragraph("<b>Métrica / Vector</b>", body_bold),
            Paragraph("<b>Clasificación Cualitativa / Taxonomía</b>", body_bold)
        ],
        # Frontal
        [Paragraph("Rostro", body_bold), Paragraph(f"Ratio {datos_frontal['forma_rostro']['ratio_alto_ancho']}", body_desc), Paragraph(datos_frontal['forma_rostro']['diagnostico'], body_desc)],
        [Paragraph("Tercios", body_bold), Paragraph(f"S:{datos_frontal['tercios']['superior']}% M:{datos_frontal['tercios']['medio']}% I:{datos_frontal['tercios']['inferior']}%", body_desc), Paragraph(datos_frontal['tercios']['diagnostico'], body_desc)],
        [Paragraph("Simetría", body_bold), Paragraph(f"Desv. {datos_frontal['simetria']['desviacion_media_px']} px", body_desc), Paragraph(datos_frontal['simetria']['diagnostico'], body_desc)],
        [Paragraph("Quintos", body_bold), Paragraph("Transversal", body_desc), Paragraph(datos_frontal['quintos']['diagnostico'], body_desc)],
        [Paragraph("Nariz", body_bold), Paragraph("Base Alar", body_desc), Paragraph(datos_frontal['ancho_nasal']['diagnostico'], body_desc)],
        # Periocular
        [Paragraph("Inclinación Cantal", body_bold), Paragraph(f"{datos_ojos['inclinacion_cantal']['angulo_promedio_deg']}°", body_desc), Paragraph(datos_ojos['inclinacion_cantal']['diagnostico'], body_desc)],
        [Paragraph("Párpados", body_bold), Paragraph(f"Ratio {datos_ojos['exposicion_palpebral']['ratio_apertura']}", body_desc), Paragraph(datos_ojos['exposicion_palpebral']['diagnostico'], body_desc)],
        [Paragraph("Arquetipo Ocular", body_bold), Paragraph("Contorno", body_desc), Paragraph(datos_ojos['arquetipo_ocular']['diagnostico'], body_desc)],
        [Paragraph("Cejas", body_bold), Paragraph("Densidad", body_desc), Paragraph(datos_ojos['cejas']['diagnostico'], body_desc)],
        # Cervical y Perfil
        [Paragraph("Cuello / Mandíbula", body_bold), Paragraph(f"Ratio {datos_perfil['cuello_mandibula']['ratio']}", body_desc), Paragraph(datos_perfil['cuello_mandibula']['diagnostico'], body_desc)],
        [Paragraph("Sínfisis Mentoniana", body_bold), Paragraph("González-Ulloa", body_desc), Paragraph(datos_perfil['menton_perfil']['diagnostico'], body_desc)],
        [Paragraph("Ángulo Nasolabial", body_bold), Paragraph(f"{datos_perfil['angulo_nasolabial']['grados']}°", body_desc), Paragraph(datos_perfil['angulo_nasolabial']['diagnostico'], body_desc)],
        # Colorimetría
        [Paragraph("Subtono Dérmico", body_bold), Paragraph(f"b*: {datos_color['lab']['b']}", body_desc), Paragraph(datos_color['subtono'], body_desc)],
        [Paragraph("Fototipo (ITA)", body_bold), Paragraph(f"{datos_color['ita_grados']}°", body_desc), Paragraph(datos_color['fototipo'], body_desc)],
        [Paragraph("Contraste", body_bold), Paragraph("Δ Luminancia", body_desc), Paragraph(datos_color['contraste'], body_desc)],
        [Paragraph("Armonía Estacional", body_bold), Paragraph("Paleta", body_desc), Paragraph(datos_color['estacion'], body_desc)],
    ]

    t = Table(tabla_data, colWidths=[95, 105, 340])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
        ('LINEBELOW', (0, 0), (-1, 0), 1.2, colors.HexColor("#1F2937")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
    ]))

    elementos.append(t)
    doc.build(elementos)
    return ruta_salida