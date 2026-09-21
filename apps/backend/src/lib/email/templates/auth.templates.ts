import { renderBaseTemplate } from './base.template';
import {
  escapeHtml,
  renderAlertBox,
  renderButton,
  renderDetailGrid,
  renderOtpCard,
} from './components';
import type { RenderedEmail, StaffCredentialsEmailData } from '../email.types';

/**
 * Render Login OTP email (HTML + plain text).
 */
export function renderLoginOtpTemplate(otp: string, expiresInMinutes = 10): RenderedEmail {
  const subject = `${otp} is your OnTime verification code for Login`;
  const previewText = `Your OnTime verification code is ${otp}. Valid for ${expiresInMinutes} minutes.`;

  const content = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Sign in to your account
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Use the one-time verification code below to complete your login session.
    </p>

    ${renderOtpCard(otp, expiresInMinutes, 'primary')}

    ${renderAlertBox(
      'Security Reminder',
      'Never share this verification code with anyone. OnTime representatives will never ask for your code over phone or email.',
      'security',
    )}

    <p style="margin: 20px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
      If you did not initiate this sign-in request, please contact your administrator or secure your account immediately.
    </p>
  `;

  const text = `Sign in to your account\n\nYour One-Time Password (OTP) for logging into OnTime is: ${otp}\n\nThis code is valid for ${expiresInMinutes} minutes.\n\nSecurity Notice: Never share this code with anyone. If you did not initiate this login request, please contact support.\n\nBest regards,\nOnTime Team`;

  const html = renderBaseTemplate({
    title: 'OnTime Sign-In Verification',
    previewText,
    content,
    footerNote: 'Need help? Contact support@ontime.com',
  });

  return { subject, html, text };
}

/**
 * Render Password Reset OTP email.
 */
export function renderPasswordResetOtpTemplate(otp: string, expiresInMinutes = 10): RenderedEmail {
  const subject = `${otp} is your OnTime password reset code`;
  const previewText = `Your OnTime password reset code is ${otp}. Valid for ${expiresInMinutes} minutes.`;

  const content = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Reset your password
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      We received a request to reset your OnTime account password. Enter the code below to verify your identity and set a new password.
    </p>

    ${renderOtpCard(otp, expiresInMinutes, 'danger')}

    ${renderAlertBox(
      'Important Security Alert',
      'If you did not request a password reset, you can safely ignore this email. Your existing password remains unchanged.',
      'warning',
    )}
  `;

  const text = `Reset your password\n\nWe received a request to reset your password for OnTime. Your password reset code is: ${otp}\n\nThis code is valid for ${expiresInMinutes} minutes.\n\nIf you did not request a password reset, please ignore this email or secure your account.\n\nBest regards,\nOnTime Team`;

  const html = renderBaseTemplate({
    title: 'OnTime Password Reset',
    previewText,
    content,
    footerNote: 'For security reasons, never share this code with anyone.',
  });

  return { subject, html, text };
}

/**
 * Render Retailer Registration OTP email.
 */
export function renderRegistrationOtpTemplate(
  otp: string,
  expiresInMinutes = 10,
  businessName?: string,
): RenderedEmail {
  const orgSuffix = businessName ? ` for ${businessName}` : '';
  const subject = `${otp} is your OnTime verification code for Retailer Registration`;
  const previewText = `Welcome to OnTime! Use code ${otp} to verify your retailer registration.`;

  const content = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Welcome to OnTime! 🎉
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Thank you for registering your retailer account${businessName ? ` for <strong>${escapeHtml(businessName)}</strong>` : ''} on the OnTime platform. Please verify your email address to complete registration.
    </p>

    ${renderOtpCard(otp, expiresInMinutes, 'success')}

    ${renderAlertBox(
      'Account Verification',
      'Once verified, your account will be activated so you can browse catalog products and place orders immediately.',
      'info',
    )}
  `;

  const text = `Welcome to OnTime!\n\nThank you for registering your retailer account${orgSuffix} on OnTime.\n\nYour 6-digit email verification code is: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes. Please enter this code to verify your account.\n\nBest regards,\nOnTime Team`;

  const html = renderBaseTemplate({
    title: 'OnTime Registration Verification',
    previewText,
    content,
  });

  return { subject, html, text };
}

/**
 * Render Staff Credentials Welcome email.
 */
export function renderStaffCredentialsTemplate(data: StaffCredentialsEmailData): RenderedEmail {
  const orgContext = data.organisationName ? ` at ${data.organisationName}` : '';
  const subject = `Your OnTime account credentials${orgContext}`;
  const previewText = `Welcome to OnTime, ${data.name}! Your account credentials are inside.`;

  const details = [
    { label: 'Name', value: data.name },
    { label: 'Username (Email)', value: data.username, isMono: true, isHighlight: true },
    { label: 'Temporary Password', value: data.temporaryPassword, isMono: true, isHighlight: true },
    ...(data.organisationName
      ? [{ label: 'Organisation', value: data.organisationName }]
      : []),
  ];

  const content = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Welcome, ${escapeHtml(data.name)}! 👋
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      An account has been created for you${data.organisationName ? ` for <strong>${escapeHtml(data.organisationName)}</strong>` : ''} on the OnTime platform. You can log in using the temporary credentials below:
    </p>

    ${renderDetailGrid(details)}

    ${renderAlertBox(
      'Required Security Step',
      'For security purposes, you will be prompted to change your temporary password to a permanent password on your first sign-in.',
      'warning',
    )}

    ${data.loginUrl ? renderButton('Sign In to OnTime', data.loginUrl) : ''}
  `;

  const text = `Welcome, ${data.name}!\n\nAn account has been created for you on OnTime${orgContext}.\n\nYour login credentials are:\nUsername: ${data.username}\nTemporary Password: ${data.temporaryPassword}\n\nIMPORTANT: For your security, you are required to reset/change your password immediately upon your first sign in.\n\nBest regards,\nOnTime Team`;

  const html = renderBaseTemplate({
    title: 'Your OnTime Account Credentials',
    previewText,
    content,
    footerNote: 'Keep your credentials confidential and do not forward this email.',
  });

  return { subject, html, text };
}

/**
 * Render Password Changed notification email.
 */
export function renderPasswordChangedTemplate(name: string, timestamp = new Date()): RenderedEmail {
  const subject = 'Your OnTime account password was changed';
  const previewText = 'Security Alert: Your OnTime account password has been updated successfully.';
  const timeStr = timestamp.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const content = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Password Changed Successfully
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Hello ${escapeHtml(name)},
    </p>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      This email confirms that your OnTime account password was changed on <strong>${escapeHtml(timeStr)} (UTC)</strong>.
    </p>

    ${renderAlertBox(
      'Did you not make this change?',
      'If you did not change your password, someone else may have accessed your account. Please reset your password immediately or contact support.',
      'danger',
    )}
  `;

  const text = `Hello ${name},\n\nThis email confirms that your OnTime account password was changed on ${timeStr} (UTC).\n\nIf you did not perform this change, please reset your password immediately or contact support.\n\nBest regards,\nOnTime Team`;

  const html = renderBaseTemplate({
    title: 'Password Changed Alert',
    previewText,
    content,
  });

  return { subject, html, text };
}
