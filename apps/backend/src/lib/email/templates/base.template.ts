import { escapeHtml } from './components';

export interface BaseTemplateOptions {
  title?: string;
  previewText?: string;
  content: string;
  footerNote?: string;
}

/**
 * Responsive, cross-client compatible base HTML email layout.
 */
export function renderBaseTemplate(options: BaseTemplateOptions): string {
  const year = new Date().getFullYear();
  const preview = options.previewText
    ? `<div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
        ${escapeHtml(options.previewText)}
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(options.title || 'OnTime')}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        margin: auto !important;
      }
      .content-cell {
        padding: 24px 18px !important;
      }
      .header-cell {
        padding: 20px 18px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  ${preview}
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
    <tr>
      <td align="center" style="padding: 12px;">
        <!-- Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);" class="email-container">
          
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 28px 24px;" class="header-cell">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ⚡ OnTime
                    </span>
                    <div style="color: #bfdbfe; font-size: 12px; font-weight: 500; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase;">
                      Distribution Platform
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 30px; background-color: #ffffff;" class="content-cell">
              ${options.content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.6;">
              ${
                options.footerNote
                  ? `<p style="margin: 0 0 10px 0; color: #64748b;">${escapeHtml(options.footerNote)}</p>`
                  : ''
              }
              <p style="margin: 0 0 6px 0; color: #64748b;">
                This is an automated operational notification sent by the OnTime Platform.
              </p>
              <p style="margin: 0; color: #94a3b8;">
                &copy; ${year} OnTime Distribution. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
