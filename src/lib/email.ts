import nodemailer from 'nodemailer';

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Utilitas untuk mengirim email notifikasi otomatis via Nodemailer (SMTP).
 * Menggunakan blok try-catch agar kegagalan pengiriman tidak mengganggu proses utama aplikasi.
 */
export async function sendNotification(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('[Email Notification] SMTP_USER atau SMTP_PASS belum dikonfigurasi di .env.local');
      return { success: false, error: 'Kredensial SMTP belum dikonfigurasi.' };
    }

    if (!to || !to.includes('@')) {
      console.warn(`[Email Notification] Alamat email penerima tidak valid: ${to}`);
      return { success: false, error: 'Email tujuan tidak valid.' };
    }

    // Templating HTML Minimalist Heritage
    const styledHtml = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e5e5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 32px 16px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #141414; border: 1px solid #2e2e2e; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 24px 28px; border-bottom: 1px solid #2e2e2e; background-color: #181818;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #d4af37; font-weight: 700;">CV BATIK LARASATI</span>
                            <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #ffffff; font-weight: 600;">Sistem Keuangan & Akuntansi</h2>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Content Body -->
                  <tr>
                    <td style="padding: 28px; font-size: 14px; line-height: 1.6; color: #d4d4d4;">
                      ${htmlBody}
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 18px 28px; background-color: #0f0f0f; border-top: 1px solid #222222; font-size: 11px; color: #737373; text-align: center;">
                      Email otomatis dari Sistem Akuntansi CV Batik Larasati · Jangan balas email ini langsung.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"CV Batik Larasati" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: styledHtml,
    });

    console.log(`[Email Notification] Email berhasil dikirim ke ${to} (MessageId: ${info.messageId})`);
    return { success: true, data: info };
  } catch (err: any) {
    console.error('[Email Notification] Error tak terduga saat pengiriman email:', err?.message || err);
    return { success: false, error: err?.message || 'Gagal mengirim email.' };
  }
}
