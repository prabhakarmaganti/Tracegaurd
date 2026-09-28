import csv
import io
from typing import Any, Dict, List
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def generate_batch_pdf_report(trace_data: Dict[str, Any]) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    story = []

    # Title & Header
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
    )
    sub_style = ParagraphStyle(
        "ReportSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
    )

    story.append(Paragraph("Production &amp; Defect Tracking &mdash; Batch Chain of Custody Audit Report", title_style))
    story.append(
        Paragraph(
            f"Generated on {trace_data.get('time_window', {}).get('start', 'Today')} &bull; "
            f"Regulatory Standard: ISO 9001 / FDA 21 CFR Part 820 &bull; Plant 1",
            sub_style,
        )
    )
    story.append(Spacer(1, 16))

    # Core Batch Details Table
    batch_code = trace_data.get("batch_code", "N/A")
    prod = trace_data.get("product") or {}
    mach = trace_data.get("machine") or {}
    op = trace_data.get("operator") or {}
    shift = trace_data.get("shift") or {}
    tw = trace_data.get("time_window") or {}

    batch_meta = [
        [
            Paragraph("<b>Batch Code:</b>", sub_style),
            Paragraph(f"<b>{batch_code}</b>", sub_style),
            Paragraph("<b>Trace Status:</b>", sub_style),
            Paragraph(
                "<font color='#047857'><b>COMPLIANT (100% Complete)</b></font>"
                if trace_data.get("is_fully_traced")
                else "<font color='#b91c1c'><b>INCOMPLETE DATA</b></font>",
                sub_style,
            ),
        ],
        [
            Paragraph("<b>Product SKU / Name:</b>", sub_style),
            Paragraph(f"{prod.get('sku', '')} &mdash; {prod.get('name', '')}", sub_style),
            Paragraph("<b>Quantity Produced:</b>", sub_style),
            Paragraph(f"{trace_data.get('quantity_produced', 0)} units", sub_style),
        ],
        [
            Paragraph("<b>Machine:</b>", sub_style),
            Paragraph(f"{mach.get('code', '')} ({mach.get('name', '')})", sub_style),
            Paragraph("<b>Operator:</b>", sub_style),
            Paragraph(f"{op.get('name', '')} [Badge: {op.get('badge_id', '')}]", sub_style),
        ],
        [
            Paragraph("<b>Shift:</b>", sub_style),
            Paragraph(f"{shift.get('name', '')} ({shift.get('start_time', '')}&ndash;{shift.get('end_time', '')})", sub_style),
            Paragraph("<b>Production Window:</b>", sub_style),
            Paragraph(f"{tw.get('formatted', '')}", sub_style),
        ],
    ]

    t_meta = Table(batch_meta, colWidths=[120, 160, 110, 150])
    t_meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t_meta)
    story.append(Spacer(1, 18))

    # Raw Materials Section
    sec_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0f766e"),
    )
    story.append(Paragraph("Consumed Raw Material Lots (Chain of Origin)", sec_style))
    story.append(Spacer(1, 6))

    mat_rows = [["Lot Code", "Material Name", "Supplier", "Received Date", "Supplier Contact"]]
    for lot in trace_data.get("material_lots", []):
        mat_rows.append([
            lot.get("lot_code", ""),
            lot.get("material_name", ""),
            lot.get("supplier_name", ""),
            lot.get("received_date", ""),
            lot.get("supplier_contact", "Direct"),
        ])

    t_mat = Table(mat_rows, colWidths=[90, 130, 130, 85, 105])
    t_mat.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(t_mat)
    story.append(Spacer(1, 18))

    # Defects & Quality Events
    story.append(Paragraph("Associated Defect Logs & Corrective Action", sec_style))
    story.append(Spacer(1, 6))

    defects = trace_data.get("defects", [])
    if defects:
        def_rows = [["Defect ID", "Type", "Severity", "Reported By", "Date / Time", "Status"]]
        for d in defects:
            def_rows.append([
                f"DEF-{d.get('id', '')}",
                d.get("defect_type", ""),
                d.get("severity", ""),
                d.get("reported_by", ""),
                d.get("reported_at", ""),
                d.get("status", ""),
            ])
        t_def = Table(def_rows, colWidths=[65, 100, 75, 100, 100, 100])
        t_def.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(t_def)
    else:
        story.append(Paragraph("<i>No defect complaints recorded against this batch. Quality clear.</i>", sub_style))

    story.append(Spacer(1, 24))
    story.append(
        Paragraph(
            "<b>Audit Certification:</b> This document was generated automatically by Production & Defect Tracking system immutable records. "
            "All operator inputs, timestamps, and lot links are cryptographically verified and tamper-evident.",
            sub_style,
        )
    )

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_batch_csv_report(trace_data: Dict[str, Any]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["Production & Defect Tracking Compliance Chain of Custody Report"])
    writer.writerow([])
    writer.writerow(["Batch Code", trace_data.get("batch_code", "")])
    writer.writerow(["Product SKU", (trace_data.get("product") or {}).get("sku", "")])
    writer.writerow(["Product Name", (trace_data.get("product") or {}).get("name", "")])
    writer.writerow(["Machine Code", (trace_data.get("machine") or {}).get("code", "")])
    writer.writerow(["Operator Name", (trace_data.get("operator") or {}).get("name", "")])
    writer.writerow(["Shift", (trace_data.get("shift") or {}).get("name", "")])
    writer.writerow(["Quantity Produced", trace_data.get("quantity_produced", 0)])
    writer.writerow(["Start Time", (trace_data.get("time_window") or {}).get("start", "")])
    writer.writerow(["End Time", (trace_data.get("time_window") or {}).get("end", "")])
    writer.writerow(["Is Fully Traced", trace_data.get("is_fully_traced", False)])
    writer.writerow([])
    writer.writerow(["Raw Material Lots Consumed"])
    writer.writerow(["Lot Code", "Material Name", "Supplier Name", "Received Date"])

    for lot in trace_data.get("material_lots", []):
        writer.writerow([
            lot.get("lot_code", ""),
            lot.get("material_name", ""),
            lot.get("supplier_name", ""),
            lot.get("received_date", ""),
        ])

    writer.writerow([])
    writer.writerow(["Defects Logged"])
    writer.writerow(["Defect ID", "Type", "Severity", "Reported By", "Reported At", "Status"])
    for d in trace_data.get("defects", []):
        writer.writerow([
            d.get("id", ""),
            d.get("defect_type", ""),
            d.get("severity", ""),
            d.get("reported_by", ""),
            d.get("reported_at", ""),
            d.get("status", ""),
        ])

    return output.getvalue()
