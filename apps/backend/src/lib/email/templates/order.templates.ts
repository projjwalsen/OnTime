import { renderBaseTemplate } from './base.template';
import {
  escapeHtml,
  formatCurrency,
  renderAlertBox,
  renderDetailGrid,
} from './components';
import type { OrderEmailData, RenderedEmail } from '../email.types';

/**
 * Render order items HTML table.
 */
function renderOrderItemsTable(items: OrderEmailData['items'], subtotal: number, tax: number, total: number): string {
  const rows = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px; font-size: 13px; color: #0f172a; font-weight: 500;">
          <div>${escapeHtml(item.name)}</div>
          ${item.variant ? `<div style="font-size: 12px; color: #64748b;">${escapeHtml(item.variant)}</div>` : ''}
          ${item.sku ? `<div style="font-size: 11px; color: #94a3b8; font-family: monospace;">SKU: ${escapeHtml(item.sku)}</div>` : ''}
        </td>
        <td style="padding: 12px 10px; font-size: 13px; color: #475569; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 10px; font-size: 13px; color: #475569; text-align: right;">
          ${formatCurrency(item.unitPrice)}
        </td>
        <td style="padding: 12px 10px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">
          ${formatCurrency(item.totalPrice)}
        </td>
      </tr>
    `,
    )
    .join('');

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;">
          <th style="padding: 10px 10px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
          <th style="padding: 10px 10px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Qty</th>
          <th style="padding: 10px 10px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Rate</th>
          <th style="padding: 10px 10px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr style="background-color: #ffffff; border-top: 1px solid #e2e8f0;">
          <td colspan="3" style="padding: 8px 10px; text-align: right; font-size: 13px; color: #64748b;">Subtotal:</td>
          <td style="padding: 8px 10px; text-align: right; font-size: 13px; color: #0f172a; font-weight: 600;">${formatCurrency(subtotal)}</td>
        </tr>
        ${
          tax > 0
            ? `
        <tr style="background-color: #ffffff;">
          <td colspan="3" style="padding: 4px 10px; text-align: right; font-size: 13px; color: #64748b;">Tax / GST:</td>
          <td style="padding: 4px 10px; text-align: right; font-size: 13px; color: #0f172a; font-weight: 600;">${formatCurrency(tax)}</td>
        </tr>`
            : ''
        }
        <tr style="background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
          <td colspan="3" style="padding: 12px 10px; text-align: right; font-size: 14px; font-weight: 700; color: #0f172a;">Grand Total:</td>
          <td style="padding: 12px 10px; text-align: right; font-size: 16px; font-weight: 800; color: #2563eb;">${formatCurrency(total)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

/**
 * Render Order Confirmation Email.
 */
export function renderOrderConfirmationTemplate(data: OrderEmailData): RenderedEmail {
  const subject = `Order Confirmed #${data.orderNumber} - OnTime`;
  const previewText = `Thank you for your order #${data.orderNumber}. We have received your order for ${formatCurrency(data.totalAmount)}.`;

  const details = [
    { label: 'Order Number', value: `#${data.orderNumber}`, isMono: true, isHighlight: true },
    { label: 'Organisation', value: data.organisationName },
    { label: 'Placed By', value: data.customerName },
    ...(data.deliveryAddress
      ? [{ label: 'Delivery Address', value: data.deliveryAddress }]
      : []),
    ...(data.notes ? [{ label: 'Order Notes', value: data.notes }] : []),
  ];

  const content = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 13px; font-weight: 700; padding: 4px 14px; border-radius: 9999px;">
        ORDER RECEIVED
      </span>
    </div>

    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
      Thank you for your order! 📦
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
      We've received your order <strong>#${escapeHtml(data.orderNumber)}</strong> and are processing it.
    </p>

    ${renderDetailGrid(details)}

    <h3 style="margin: 24px 0 10px 0; color: #0f172a; font-size: 15px; font-weight: 700;">
      Order Summary
    </h3>
    ${renderOrderItemsTable(data.items, data.subtotal, data.taxAmount, data.totalAmount)}

    ${renderAlertBox(
      'Next Steps',
      'Our dispatch team will verify inventory and prepare your order for dispatch. You will receive updates as the order status changes.',
      'info',
    )}
  `;

  const itemsText = data.items
    .map((item) => ` - ${item.name} (${item.quantity}x) @ ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.totalPrice)}`)
    .join('\n');

  const text = `Order Confirmation #${data.orderNumber}\n\nHello ${data.customerName},\n\nThank you for placing your order with OnTime for ${data.organisationName}.\n\nOrder Number: #${data.orderNumber}\nTotal Amount: ${formatCurrency(data.totalAmount)}\n\nItems:\n${itemsText}\n\nSubtotal: ${formatCurrency(data.subtotal)}\nTax: ${formatCurrency(data.taxAmount)}\nGrand Total: ${formatCurrency(data.totalAmount)}\n\nBest regards,\nOnTime Distribution Team`;

  const html = renderBaseTemplate({
    title: `Order #${data.orderNumber} Confirmation`,
    previewText,
    content,
    footerNote: 'Need assistance with your order? Reach out to support@ontime.com',
  });

  return { subject, html, text };
}

/**
 * Render Order Status Update Email.
 */
export function renderOrderStatusUpdateTemplate(
  data: OrderEmailData,
  previousStatus: string,
  newStatus: string,
): RenderedEmail {
  const subject = `Order #${data.orderNumber} Status Update: ${newStatus}`;
  const previewText = `Your order #${data.orderNumber} is now ${newStatus}.`;

  const statusColors: Record<string, { bg: string; text: string }> = {
    CONFIRMED: { bg: '#eff6ff', text: '#1d4ed8' },
    PROCESSING: { bg: '#fef3c7', text: '#92400e' },
    DISPATCHED: { bg: '#f3e8ff', text: '#6b21a8' },
    DELIVERED: { bg: '#dcfce7', text: '#15803d' },
    CANCELLED: { bg: '#fee2e2', text: '#b91c1c' },
  };

  const currentStatusStyle = statusColors[newStatus] || { bg: '#f1f5f9', text: '#334155' };

  const content = `
    <div style="text-align: center; margin-bottom: 16px;">
      <span style="display: inline-block; background-color: ${currentStatusStyle.bg}; color: ${currentStatusStyle.text}; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 9999px; letter-spacing: 0.5px;">
        STATUS: ${escapeHtml(newStatus)}
      </span>
    </div>

    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
      Order Status Update
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
      The status of order <strong>#${escapeHtml(data.orderNumber)}</strong> has changed from <span style="text-decoration: line-through; color: #94a3b8;">${escapeHtml(previousStatus)}</span> to <strong>${escapeHtml(newStatus)}</strong>.
    </p>

    ${renderDetailGrid([
      { label: 'Order Number', value: `#${data.orderNumber}`, isMono: true, isHighlight: true },
      { label: 'Organisation', value: data.organisationName },
      { label: 'Total Amount', value: formatCurrency(data.totalAmount) },
      ...(data.deliveryAddress ? [{ label: 'Delivery Address', value: data.deliveryAddress }] : []),
    ])}

    ${
      newStatus === 'DELIVERED'
        ? renderAlertBox(
            'Order Delivered',
            'Your package has been marked as successfully delivered. Please inspect your goods and let us know if you need any assistance.',
            'success',
          )
        : newStatus === 'DISPATCHED'
          ? renderAlertBox(
              'Order Dispatched',
              'Your order is on its way to your delivery address!',
              'info',
            )
          : ''
    }
  `;

  const text = `Order #${data.orderNumber} Status Update\n\nHello ${data.customerName},\n\nThe status of your order #${data.orderNumber} has been updated to: ${newStatus} (previously: ${previousStatus}).\n\nOrganisation: ${data.organisationName}\nTotal Amount: ${formatCurrency(data.totalAmount)}\n\nBest regards,\nOnTime Distribution Team`;

  const html = renderBaseTemplate({
    title: `Order #${data.orderNumber} Status: ${newStatus}`,
    previewText,
    content,
  });

  return { subject, html, text };
}

/**
 * Render Order Cancellation Email.
 */
export function renderOrderCancelledTemplate(data: OrderEmailData): RenderedEmail {
  const subject = `Order #${data.orderNumber} Cancelled - OnTime`;
  const previewText = `Your order #${data.orderNumber} has been cancelled.`;

  const details = [
    { label: 'Order Number', value: `#${data.orderNumber}`, isMono: true },
    { label: 'Organisation', value: data.organisationName },
    { label: 'Total Amount', value: formatCurrency(data.totalAmount) },
    ...(data.cancellationReason
      ? [{ label: 'Cancellation Reason', value: data.cancellationReason }]
      : []),
  ];

  const content = `
    <div style="text-align: center; margin-bottom: 16px;">
      <span style="display: inline-block; background-color: #fee2e2; color: #b91c1c; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 9999px;">
        ORDER CANCELLED
      </span>
    </div>

    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
      Order #${escapeHtml(data.orderNumber)} has been cancelled
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
      We're notifying you that order <strong>#${escapeHtml(data.orderNumber)}</strong> has been cancelled.
    </p>

    ${renderDetailGrid(details)}

    ${renderAlertBox(
      'Cancellation Notice',
      data.cancellationReason
        ? `Reason: ${escapeHtml(data.cancellationReason)}`
        : 'If you have any questions or this cancellation was in error, please contact your distributor representative.',
      'warning',
    )}
  `;

  const text = `Order #${data.orderNumber} Cancelled\n\nHello ${data.customerName},\n\nYour order #${data.orderNumber} for ${data.organisationName} has been cancelled.${data.cancellationReason ? `\n\nReason: ${data.cancellationReason}` : ''}\n\nBest regards,\nOnTime Distribution Team`;

  const html = renderBaseTemplate({
    title: `Order #${data.orderNumber} Cancelled`,
    previewText,
    content,
  });

  return { subject, html, text };
}
