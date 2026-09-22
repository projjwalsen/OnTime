import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import http from 'http';
import { SupportTopic } from '@ontime/shared';

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  console.log('🧪 Running Notifications, Support & Help integration tests...');

  try {
    // 1. Create test organisation and user
    const testEmail = `test.notif.${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Notification Test User',
        email: testEmail,
        password: 'Password123!',
        businessName: 'Notification Store',
      }),
    });

    const regData: any = await regRes.json();
    const token = regData.data.tokens.accessToken;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 2. Test Notification Preferences - GET
    const getPrefRes = await fetch(`${baseUrl}/notifications/preferences`, {
      method: 'GET',
      headers: authHeaders,
    });
    const getPrefData: any = await getPrefRes.json();
    console.assert(getPrefData.data.preferences.orderUpdates === true, 'Default orderUpdates should be true');
    console.assert(getPrefData.data.preferences.marketingUpdates === false, 'Default marketingUpdates should be false');
    console.log('  ✅ Fetched default notification preferences');

    // 3. Test Notification Preferences - PUT
    const putPrefRes = await fetch(`${baseUrl}/notifications/preferences`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        marketingUpdates: true,
      }),
    });
    const putPrefData: any = await putPrefRes.json();
    console.assert(putPrefData.data.preferences.marketingUpdates === true, 'marketingUpdates should be updated to true');
    console.log('  ✅ Updated notification preferences');

    // 4. Test Support Topics - GET
    const topicsRes = await fetch(`${baseUrl}/support/topics`);
    const topicsData: any = await topicsRes.json();
    console.assert(topicsData.data.topics.length >= 4, 'Expected at least 4 support topics');
    console.log('  ✅ Retrieved support topics list');

    // 5. Test Support Tickets - POST
    const ticketRes = await fetch(`${baseUrl}/support/tickets`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        topic: SupportTopic.ORDER_DELIVERY,
        orderNumber: 'ORD-20418',
        subject: 'Delivery delay inquiry',
        message: 'Could you please check when our shipment will arrive?',
      }),
    });
    const ticketData: any = await ticketRes.json();
    console.assert(ticketRes.status === 201, 'Expected 201 for ticket creation');
    console.assert(ticketData.data.ticket.ticketNumber.startsWith('TKT-'), 'Ticket number should start with TKT-');
    const ticketId = ticketData.data.ticket.id;
    console.log(`  ✅ Created support ticket (${ticketData.data.ticket.ticketNumber})`);

    // 6. Test Support Tickets - GET List & GET by ID
    const listTicketsRes = await fetch(`${baseUrl}/support/tickets`, {
      method: 'GET',
      headers: authHeaders,
    });
    const listTicketsData: any = await listTicketsRes.json();
    console.assert(listTicketsData.data.tickets.length >= 1, 'Expected ticket in list');

    const getTicketRes = await fetch(`${baseUrl}/support/tickets/${ticketId}`, {
      method: 'GET',
      headers: authHeaders,
    });
    const getTicketData: any = await getTicketRes.json();
    console.assert(getTicketData.data.ticket.subject === 'Delivery delay inquiry', 'Subject should match');
    console.log('  ✅ Listed and retrieved support ticket details');

    // 7. Test Help Center - Categories & Articles
    const helpCatRes = await fetch(`${baseUrl}/help/categories`);
    const helpCatData: any = await helpCatRes.json();
    console.assert(helpCatData.data.categories.length === 4, 'Expected 4 help categories');
    console.log('  ✅ Retrieved help categories');

    const helpArticlesRes = await fetch(`${baseUrl}/help/articles?category=${SupportTopic.ORDER_DELIVERY}`);
    const helpArticlesData: any = await helpArticlesRes.json();
    console.assert(helpArticlesData.data.articles.length >= 1, 'Expected articles in Order & delivery category');
    console.log('  ✅ Filtered help articles by category');

    // Cleanup
    await prisma.organisation.delete({ where: { id: regData.data.user.organisationId } }).catch(() => {});


    console.log('🎉 All Notifications, Support & Help tests passed successfully!\n');
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
