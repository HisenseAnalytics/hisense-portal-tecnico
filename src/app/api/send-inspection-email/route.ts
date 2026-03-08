import { Resend } from "resend"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { technicianEmail, technicianName, storeName, storeCity, units } = await request.json()

  const unitsHtml = units.map((u: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${u.verified_model}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${u.verified_serial}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${u.fault_label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
        <span style="color:${u.matches ? '#16a34a' : '#d97706'}">${u.matches ? "✓ Coincide" : "⚠ Discrepancia"}</span>
      </td>
    </tr>
  `).join("")

  const { error } = await resend.emails.send({
    from: "Hisense Portal <soporte@hisense-iberia.com>",
    to: technicianEmail,
    subject: `Revision completada - ${storeName}`,
    html: `
      <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="margin-bottom:24px;">
          <h1 style="font-size:24px;font-weight:700;letter-spacing:4px;color:#2563eb;margin:0;">HISENSE</h1>
          <p style="color:#9ca3af;font-size:13px;margin:4px 0 0;">Portal Tecnico</p>
        </div>

        <h2 style="font-size:18px;font-weight:600;color:#1f2937;margin-bottom:4px;">
          Revision completada
        </h2>
        <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">
          Hola ${technicianName}, aqui tienes el resumen de tu revision en <strong>${storeName}</strong>, ${storeCity}.
        </p>

        <table style="width:100%;border-collapse:collapse;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Modelo</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">N Serie</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Clasificacion</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Coincidencia</th>
            </tr>
          </thead>
          <tbody>
            ${unitsHtml}
          </tbody>
        </table>

        <p style="color:#9ca3af;font-size:12px;margin-top:32px;text-align:center;">
          Hisense Iberia - Portal Tecnico de Revisiones
        </p>
      </div>
    `,
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}