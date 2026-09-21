/**
 * OnTime Email Service Test Suite
 *
 * Tests:
 * 1. HTML & Plaintext Template Rendering (Auth, Orders, Orgs, Security)
 * 2. Immediate Email Dispatching & Test History Tracking
 * 3. Asynchronous Worker Queue (Concurrency, Error Retries, Stats, Draining)
 * 4. SMTP Transporter & Connection Verification
 * 5. Sanitization & HTML Escaping (XSS Prevention)
 */

import assert from 'node:assert';
import { emailService } from '../lib/email.service';
import { EmailQueue } from '../lib/email/email.queue';
import {
  escapeHtml,
  renderLoginOtpTemplate,
  renderPasswordResetOtpTemplate,
  renderRegistrationOtpTemplate,
  renderStaffCredentialsTemplate,
  renderPasswordChangedTemplate,
  renderOrderConfirmationTemplate,
  renderOrderStatusUpdateTemplate,
  renderOrderCancelledTemplate,
  renderOrganisationWelcomeTemplate,
  renderOrganisationStatusChangeTemplate,
  renderOrganisationInvitationTemplate,
} from '../lib/email/templates';

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 RUNNING OPTIMISED EMAIL SERVICE TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  ✔ [PASS] ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ❌ [FAIL] ${name}`);
        console.error(err);
        failed++;
      });
  }

  // Clear previous test records
  emailService.clearSentEmails();

  // -------------------------------------------------------------
  // Test 1: HTML Escaping & Sanitization
  // -------------------------------------------------------------
  await test('HTML sanitizer escapes unsafe characters properly', () => {
    const malicious = '<script>alert("XSS")</script> & \'test\' "quotes"';
    const escaped = escapeHtml(malicious);
    assert(!escaped.includes('<script>'), 'Should not contain raw script tags');
    assert(escaped.includes('&lt;script&gt;'), 'Should escape < and >');
    assert(escaped.includes('&amp;'), 'Should escape &');
    assert(escaped.includes('&quot;'), 'Should escape "');
    assert(escaped.includes('&#039;'), 'Should escape single quote');
  });

  // -------------------------------------------------------------
  // Test 2: Auth Templates Rendering
  // -------------------------------------------------------------
  await test('Login OTP Template renders valid HTML and Plaintext', () => {
    const rendered = renderLoginOtpTemplate('481920', 10);
    assert(rendered.subject.includes('481920'), 'Subject must contain OTP');
    assert(rendered.html.includes('481920'), 'HTML must contain OTP');
    assert(rendered.html.includes('Valid for 10 minutes'), 'HTML must mention expiry');
    assert(rendered.text.includes('481920'), 'Plaintext must contain OTP');
    assert(rendered.html.includes('⚡ OnTime'), 'HTML must include brand header');
  });

  await test('Password Reset OTP Template renders with security notice', () => {
    const rendered = renderPasswordResetOtpTemplate('928374', 15);
    assert(rendered.subject.includes('928374'), 'Subject must contain OTP');
    assert(rendered.html.includes('928374'), 'HTML must contain OTP');
    assert(rendered.html.includes('Reset your password'), 'HTML must contain title');
    assert(rendered.text.includes('15 minutes'), 'Plaintext must include expiry');
  });

  await test('Registration OTP Template renders with business context', () => {
    const rendered = renderRegistrationOtpTemplate('123456', 10, 'Apex Supermarkets');
    assert(rendered.subject.includes('123456'), 'Subject must contain OTP');
    assert(rendered.html.includes('Apex Supermarkets'), 'HTML must contain business name');
    assert(rendered.text.includes('Apex Supermarkets'), 'Plaintext must contain business name');
  });

  await test('Staff Credentials Template renders credentials cleanly', () => {
    const rendered = renderStaffCredentialsTemplate({
      name: 'Jane Doe',
      username: 'jane@apex.com',
      temporaryPassword: 'TempPassword#2026',
      organisationName: 'Apex Retailers',
      loginUrl: 'https://app.ontime.com/login',
    });
    assert(rendered.html.includes('Jane Doe'), 'Must greet user by name');
    assert(rendered.html.includes('jane@apex.com'), 'Must show username');
    assert(rendered.html.includes('TempPassword#2026'), 'Must display temporary password');
    assert(rendered.html.includes('Apex Retailers'), 'Must include organisation name');
    assert(rendered.html.includes('https://app.ontime.com/login'), 'Must include login link');
  });

  await test('Password Changed Template renders security alert', () => {
    const rendered = renderPasswordChangedTemplate('Jane Doe');
    assert(rendered.subject.includes('password was changed'), 'Subject should alert user');
    assert(rendered.html.includes('Password Changed Successfully'), 'HTML should have alert heading');
    assert(rendered.text.includes('Jane Doe'), 'Plaintext must greet user');
  });

  // -------------------------------------------------------------
  // Test 3: Order Templates Rendering
  // -------------------------------------------------------------
  await test('Order Confirmation Template renders itemized line items and totals', () => {
    const orderData = {
      orderNumber: 'ORD-20260921-8841',
      organisationName: 'Apex Store #4',
      customerName: 'John Manager',
      subtotal: 12500,
      taxAmount: 625,
      totalAmount: 13125,
      deliveryAddress: '123 Market St, Mumbai, MH',
      notes: 'Please ring back door bell on arrival.',
      items: [
        {
          name: 'Premium Basmati Rice 5kg',
          sku: 'RICE-BAS-5KG',
          variant: '5kg Pack',
          quantity: 10,
          unitPrice: 500,
          totalPrice: 5000,
        },
        {
          name: 'Refined Sunflower Oil 1L',
          sku: 'OIL-SUN-1L',
          variant: '1L Pouch',
          quantity: 50,
          unitPrice: 150,
          totalPrice: 7500,
        },
      ],
      createdAt: new Date(),
    };

    const rendered = renderOrderConfirmationTemplate(orderData);
    assert(rendered.subject.includes('ORD-20260921-8841'), 'Subject must contain order number');
    assert(rendered.html.includes('ORD-20260921-8841'), 'HTML must contain order number');
    assert(rendered.html.includes('Premium Basmati Rice 5kg'), 'HTML must list line items');
    assert(rendered.html.includes('Refined Sunflower Oil 1L'), 'HTML must list line items');
    assert(rendered.html.includes('13,125.00'), 'HTML must display formatted total');
    assert(rendered.html.includes('123 Market St, Mumbai, MH'), 'HTML must display delivery address');
    assert(rendered.text.includes('ORD-20260921-8841'), 'Plaintext must contain order number');
  });

  await test('Order Status Update & Cancelled Templates render correctly', () => {
    const orderData = {
      orderNumber: 'ORD-20260921-9999',
      organisationName: 'Apex Store',
      customerName: 'John',
      subtotal: 500,
      taxAmount: 0,
      totalAmount: 500,
      cancellationReason: 'Out of stock at central warehouse',
      items: [],
      createdAt: new Date(),
    };

    const updateRendered = renderOrderStatusUpdateTemplate(orderData, 'PROCESSING', 'DISPATCHED');
    assert(updateRendered.subject.includes('DISPATCHED'), 'Status update subject must have new status');
    assert(updateRendered.html.includes('DISPATCHED'), 'HTML must have new status badge');
    assert(updateRendered.html.includes('PROCESSING'), 'HTML must reference previous status');

    const cancelRendered = renderOrderCancelledTemplate(orderData);
    assert(cancelRendered.subject.includes('Cancelled'), 'Cancel subject must mention cancelled');
    assert(cancelRendered.html.includes('Out of stock at central warehouse'), 'HTML must show reason');
  });

  // -------------------------------------------------------------
  // Test 4: Organisation Templates Rendering
  // -------------------------------------------------------------
  await test('Organisation Welcome, Status, and Invitation Templates', () => {
    const welcome = renderOrganisationWelcomeTemplate('Apex Wholesale', 'Mr. Apex', 'https://portal.ontime.com');
    assert(welcome.html.includes('Apex Wholesale'), 'Welcome must contain org name');
    assert(welcome.html.includes('https://portal.ontime.com'), 'Welcome must contain portal URL');

    const status = renderOrganisationStatusChangeTemplate({
      organisationName: 'Apex Wholesale',
      previousStatus: 'ACTIVE',
      newStatus: 'SUSPENDED',
      reason: 'Periodic compliance verification pending.',
    });
    assert(status.html.includes('SUSPENDED'), 'Status must show new status');
    assert(status.html.includes('compliance verification'), 'Status must show reason');

    const invite = renderOrganisationInvitationTemplate(
      'Apex Wholesale',
      'https://app.ontime.com/invitation/tok_123',
      'STAFF',
      'Alice Admin',
    );
    assert(invite.html.includes('Alice Admin'), 'Invite must mention inviter');
    assert(invite.html.includes('tok_123'), 'Invite must contain link');
  });

  // -------------------------------------------------------------
  // Test 5: Email Service Immediate Dispatch & Test History
  // -------------------------------------------------------------
  await test('EmailService immediate send logs and updates sent history', async () => {
    emailService.clearSentEmails();

    await emailService.sendLoginOtpEmail('user1@example.com', '778899', 10);
    await emailService.sendPasswordResetOtpEmail('user2@example.com', '112233', 10);

    const history = emailService.sentEmails;
    assert.strictEqual(history.length, 2, 'Must have recorded 2 sent emails');

    const lastToUser1 = emailService.getLastEmailTo('user1@example.com');
    assert(lastToUser1, 'Should find email to user1');
    assert(lastToUser1.subject.includes('778899'), 'Should match user1 OTP subject');

    const lastToUser2 = emailService.getLastEmailTo('user2@example.com');
    assert(lastToUser2, 'Should find email to user2');
    assert(lastToUser2.subject.includes('112233'), 'Should match user2 OTP subject');
  });

  // -------------------------------------------------------------
  // Test 6: Asynchronous Queue & Background Worker
  // -------------------------------------------------------------
  await test('EmailQueue processes jobs concurrently and drains properly', async () => {
    let processedCount = 0;
    const customQueue = new EmailQueue(2);

    customQueue.setHandler(async (_options) => {
      await new Promise((res) => setTimeout(res, 20));
      processedCount++;
    });

    customQueue.enqueue({ to: 'queue1@example.com', subject: 'Job 1' });
    customQueue.enqueue({ to: 'queue2@example.com', subject: 'Job 2' });
    customQueue.enqueue({ to: 'queue3@example.com', subject: 'Job 3' });

    await customQueue.drain();
    assert.strictEqual(processedCount, 3, 'All 3 enqueued jobs must be processed');
    const stats = customQueue.getStats();
    assert.strictEqual(stats.completed, 3, 'Stats completed should be 3');
    assert.strictEqual(stats.pending, 0, 'Stats pending should be 0');
  });

  await test('EmailQueue retries transient failures with backoff', async () => {
    let attempts = 0;
    const customQueue = new EmailQueue(1);

    customQueue.setHandler(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Transient network error');
      }
    });

    customQueue.enqueue({ to: 'retry@example.com', subject: 'Retry Job' }, 3);

    await customQueue.drain();
    assert.strictEqual(attempts, 2, 'Job should have succeeded on attempt 2');
    const stats = customQueue.getStats();
    assert.strictEqual(stats.completed, 1, 'Stats completed should be 1');
    assert.strictEqual(stats.failed, 0, 'Stats failed should be 0');
  });

  // -------------------------------------------------------------
  // Test 7: EmailService Health & Stats Check
  // -------------------------------------------------------------
  await test('EmailService verifyConnection and getQueueStats return operational status', async () => {
    const health = await emailService.verifyConnection();
    assert(typeof health.configured === 'boolean', 'Health must have configured boolean');
    assert(typeof health.connected === 'boolean', 'Health must have connected boolean');

    const stats = emailService.getQueueStats();
    assert(typeof stats.completed === 'number', 'Queue stats must have completed count');
    assert(typeof stats.pending === 'number', 'Queue stats must have pending count');
  });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} EMAIL SERVICE TESTS PASSED!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } else {
    console.error(`💥 ${failed} TESTS FAILED out of ${passed + failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
