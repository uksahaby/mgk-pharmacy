/**
 * Development mailer: prints messages to the console.
 * Swap `send` for a real provider (Resend, Postmark, SES, Termii for SMS/WhatsApp) in production.
 */
export type Mail = { to: string; subject: string; text: string };

export async function sendMail(mail: Mail) {
  console.log(`\n[mail] to=${mail.to}\n[mail] subject=${mail.subject}\n${mail.text}\n`);
}
