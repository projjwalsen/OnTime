import { renderBaseTemplate } from './base.template';
import {
  escapeHtml,
  renderAlertBox,
  renderButton,
  renderDetailGrid,
} from './components';
import type { OrganisationStatusChangeEmailData, RenderedEmail } from '../email.types';

/**
 * Render Organisation Welcome / Activation Email.
 */
export function renderOrganisationWelcomeTemplate(
  orgName: string,
  contactName: string,
  portalUrl?: string,
): RenderedEmail {
  const subject = `Welcome to OnTime - ${orgName}`;
  const previewText = `Your retailer account for ${orgName} has been activated. Start ordering on OnTime today!`;

  const content = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Welcome to OnTime, ${escapeHtml(contactName)}! 🚀
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      We are delighted to confirm that your retailer organisation <strong>${escapeHtml(orgName)}</strong> is now active on the OnTime Distribution Platform.
    </p>

    ${renderAlertBox(
      'Account Ready',
      'You can now browse products, view live pricing and catalog updates, manage staff members, and place wholesale orders.',
      'success',
    )}

    ${portalUrl ? renderButton('Launch OnTime Portal', portalUrl) : ''}
  `;

  const text = `Welcome to OnTime!\n\nHello ${contactName},\n\nWe are delighted to confirm that your retailer organisation "${orgName}" is now active on the OnTime Distribution Platform.\n\nYou can now browse products, view live pricing, manage staff members, and place wholesale orders.\n\nBest regards,\nOnTime Distribution Team`;

  const html = renderBaseTemplate({
    title: `Welcome to OnTime - ${orgName}`,
    previewText,
    content,
  });

  return { subject, html, text };
}

/**
 * Render Organisation Status Change Email.
 */
export function renderOrganisationStatusChangeTemplate(
  data: OrganisationStatusChangeEmailData,
): RenderedEmail {
  const subject = `Organisation Account Status Update: ${data.newStatus} - ${data.organisationName}`;
  const previewText = `Your organisation account status has been updated to ${data.newStatus}.`;

  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: '#dcfce7', text: '#15803d' },
    INACTIVE: { bg: '#f1f5f9', text: '#475569' },
    SUSPENDED: { bg: '#fee2e2', text: '#b91c1c' },
  };

  const currentStyle = statusColors[data.newStatus] || { bg: '#f1f5f9', text: '#334155' };

  const content = `
    <div style="text-align: center; margin-bottom: 16px;">
      <span style="display: inline-block; background-color: ${currentStyle.bg}; color: ${currentStyle.text}; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 9999px;">
        STATUS: ${escapeHtml(data.newStatus)}
      </span>
    </div>

    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
      Organisation Status Updated
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
      The operational status of <strong>${escapeHtml(data.organisationName)}</strong> has been updated.
    </p>

    ${renderDetailGrid([
      { label: 'Organisation', value: data.organisationName },
      { label: 'Previous Status', value: data.previousStatus },
      { label: 'New Status', value: data.newStatus, isHighlight: true },
    ])}

    ${
      data.reason
        ? renderAlertBox('Notice Details', data.reason, data.newStatus === 'SUSPENDED' ? 'warning' : 'info')
        : ''
    }
  `;

  const text = `Organisation Status Update\n\nOrganisation: ${data.organisationName}\nNew Status: ${data.newStatus} (Previously: ${data.previousStatus})${data.reason ? `\nDetails: ${data.reason}` : ''}\n\nBest regards,\nOnTime Team`;

  const html = renderBaseTemplate({
    title: `Organisation Status Update: ${data.organisationName}`,
    previewText,
    content,
  });

  return { subject, html, text };
}

/**
 * Render Organisation Staff Invitation Email.
 */
export function renderOrganisationInvitationTemplate(
  orgName: string,
  inviteLink: string,
  role = 'STAFF',
  inviterName?: string,
): RenderedEmail {
  const subject = `Invitation to join ${orgName} on OnTime`;
  const previewText = `You have been invited to join ${orgName} as ${role} on OnTime.`;

  const content = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      You've been invited! 🎉
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      ${inviterName ? `<strong>${escapeHtml(inviterName)}</strong> has invited you` : 'You have been invited'} to join <strong>${escapeHtml(orgName)}</strong> on the OnTime platform as a <strong>${escapeHtml(role)}</strong>.
    </p>

    ${renderAlertBox(
      'Getting Started',
      'Click the button below to accept your invitation and set up your account credentials.',
      'info',
    )}

    ${renderButton('Accept Invitation', inviteLink)}

    <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
      If the button above does not work, copy and paste this URL into your browser:<br/>
      <a href="${escapeHtml(inviteLink)}" style="color: #2563eb; word-break: break-all;">${escapeHtml(inviteLink)}</a>
    </p>
  `;

  const text = `Invitation to join ${orgName} on OnTime\n\nYou have been invited to join ${orgName} as ${role} on the OnTime platform.\n\nAccept your invitation here:\n${inviteLink}\n\nBest regards,\nOnTime Team`;

  const html = renderBaseTemplate({
    title: `Invitation to join ${orgName}`,
    previewText,
    content,
    footerNote: 'This invitation link will expire in 7 days.',
  });

  return { subject, html, text };
}
