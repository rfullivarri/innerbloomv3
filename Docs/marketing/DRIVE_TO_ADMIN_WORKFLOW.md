# Operación mensual de renders de marketing

Este flujo separa pensamiento de mecánica:

1. **CMO / Head of Content / Creative Director**: producen o enriquecen `campaign.json`. Es el único tramo que usa criterio.
2. **GitHub Action `Render campaign and send it to Admin`**: código determinista. Descarga los assets aprobados, renderiza los PNG, los sube a Drive y crea los posts en el Admin.
3. **Humano en Admin**: aprueba o rechaza cada post.
4. **Admin**: al pulsar **Upload approved assets to R2**, sube los aprobados. Cuando todos estén en R2, **Download Metricool CSV** genera el CSV para importar.

## Configuración de Drive (una sola vez)

El workflow requiere estos secretos de GitHub:

| Secreto | Qué contiene |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` | El JSON de la cuenta de servicio de Google, codificado en base64. |
| `MARKETING_DRIVE_STAGING_FOLDER_ID` | ID de la carpeta de Drive donde se guardarán los PNGs de revisión: `1x1hkC8VZclb6zvCVnNb3mNh7TLk76CWo` (`Generated Marketing Reviews`). |
| `DATABASE_URL` | Ya se usa para crear los posts dentro del Admin. |

Permisos que debe recibir la cuenta de servicio:

- Comparte la carpeta **Innerbloom Marketing** (la vigente) o los archivos registrados, como **Lector**.
- Comparte la carpeta de staging de renders como **Editor**.

No hay que mandar la clave privada por chat. La dirección exacta que hay que compartir es `client_email` dentro del JSON de la cuenta de servicio.

## Ejecución mensual

Cuando el Creative Director haya dejado `marketing/agent-outputs/YYYY-MM/campaign.json` con `creative_direction` válido, ejecuta:

- GitHub Actions → **Render campaign and send it to Admin**
- `period_key`: por ejemplo `2026-07`

La Action falla temprano si falta un secreto, si el contrato creativo no está completo, o si un asset no está en el registro. Nunca improvisa pantallas, logos ni textos.

## Qué entra al Admin

Cada post llega como `needs_review` con:

- copy, hipótesis, métrica y URL de tracking del `campaign.json`;
- sus PNGs de revisión desde Drive;
- metadatos de que fue renderizado de forma determinista.

El administrador conserva la decisión final: aprobar, rechazar, subir a R2 y exportar CSV.
