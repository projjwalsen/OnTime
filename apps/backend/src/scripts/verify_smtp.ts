import { emailService } from '../lib/email.service';

async function main() {
  console.log('Testing OnTime SMTP Configuration & Connectivity...\n');
  const status = await emailService.verifyConnection();
  console.log('SMTP Status:', status);
}

main().catch(console.error);
