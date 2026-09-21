/**
 * Reusable HTML/CSS components and helper utilities for OnTime email templates.
 */

/**
 * Escapes HTML characters to prevent XSS in email clients.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format currency amount.
 */
export function formatCurrency(amount: number, currency = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Render an OTP code display card.
 */
export function renderOtpCard(otp: string, expiresInMinutes: number, variant: 'primary' | 'danger' | 'success' = 'primary'): string {
  const styles = {
    primary: {
      bg: '#eff6ff',
      border: '#bfdbfe',
      text: '#1d4ed8',
      meta: '#1e40af',
    },
    danger: {
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#dc2626',
      meta: '#991b1b',
    },
    success: {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#16a34a',
      meta: '#15803d',
    },
  }[variant];

  return `
    <div style="background-color: ${styles.bg}; border: 2px dashed ${styles.border}; border-radius: 10px; padding: 22px 16px; text-align: center; margin: 24px 0;">
      <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: ${styles.text}; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; margin: 0; line-height: 1;">
        ${escapeHtml(otp)}
      </div>
      <p style="font-size: 13px; font-weight: 500; color: ${styles.meta}; margin: 10px 0 0 0;">
        ⏱️ Valid for ${expiresInMinutes} minutes
      </p>
    </div>
  `;
}

/**
 * Render a bulletproof CTA action button.
 */
export function renderButton(text: string, href: string, color = '#2563eb'): string {
  return `
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px auto; text-align: center;">
      <tr>
        <td align="center" style="border-radius: 8px; background: ${color};">
          <a href="${escapeHtml(href)}" target="_blank" style="font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${escapeHtml(text)} &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Render an Alert / Callout box.
 */
export function renderAlertBox(
  title: string,
  message: string,
  variant: 'warning' | 'info' | 'success' | 'security' | 'danger' | 'error' = 'info',
): string {
  const configs = {
    warning: {
      bg: '#fffbeb',
      border: '#fde68a',
      icon: '⚠️',
      titleColor: '#92400e',
      textColor: '#b45309',
    },
    security: {
      bg: '#f8fafc',
      border: '#e2e8f0',
      icon: '🔒',
      titleColor: '#0f172a',
      textColor: '#64748b',
    },
    info: {
      bg: '#eff6ff',
      border: '#bfdbfe',
      icon: 'ℹ️',
      titleColor: '#1e40af',
      textColor: '#2563eb',
    },
    success: {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      icon: '✅',
      titleColor: '#166534',
      textColor: '#15803d',
    },
    danger: {
      bg: '#fef2f2',
      border: '#fecaca',
      icon: '🚨',
      titleColor: '#991b1b',
      textColor: '#dc2626',
    },
    error: {
      bg: '#fef2f2',
      border: '#fecaca',
      icon: '❌',
      titleColor: '#991b1b',
      textColor: '#dc2626',
    },
  }[variant] || {
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: 'ℹ️',
    titleColor: '#1e40af',
    textColor: '#2563eb',
  };

  return `
    <div style="background-color: ${configs.bg}; border: 1px solid ${configs.border}; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.5;">
      <div style="font-weight: 700; color: ${configs.titleColor}; margin-bottom: 4px;">
        ${configs.icon} ${escapeHtml(title)}
      </div>
      <div style="color: ${configs.textColor};">
        ${escapeHtml(message)}
      </div>
    </div>
  `;
}

/**
 * Render a key-value detail list/table.
 */
export function renderDetailGrid(items: Array<{ label: string; value: string; isMono?: boolean; isHighlight?: boolean }>): string {
  const rows = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; color: #64748b; font-size: 13px; font-weight: 500; width: 40%; vertical-align: top;">
          ${escapeHtml(item.label)}
        </td>
        <td style="padding: 10px 12px; color: ${item.isHighlight ? '#2563eb' : '#0f172a'}; font-size: 14px; font-weight: 600; font-family: ${item.isMono ? "'SFMono-Regular', Consolas, monospace" : 'inherit'}; vertical-align: top;">
          ${escapeHtml(item.value)}
        </td>
      </tr>
    `,
    )
    .join('');

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; border-collapse: collapse;">
      ${rows}
    </table>
  `;
}
