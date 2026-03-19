import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

interface SendPINEmailParams {
  to: string;
  bookingReference: string;
  pin: string;
  providerName: string;
  depositAmount: number;
}

export async function sendPINEmail({
  to,
  bookingReference,
  pin,
  providerName,
  depositAmount,
}: SendPINEmailParams) {
  try {
    await resend.emails.send({
      from: "HoldPay <noreply@yourdomain.com>",
      to,
      subject: `Your HoldPay Confirmation PIN - ${bookingReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Payment Confirmed</h1>
          <p>Your deposit of <strong>$${(depositAmount / 100).toFixed(2)}</strong> with ${providerName} has been secured in escrow.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Your Confirmation PIN</h2>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #1f2937;">${pin}</p>
          </div>
          <p><strong>Important:</strong></p>
          <ul>
            <li>Give this PIN to ${providerName} ONLY after service completion</li>
            <li>This PIN releases your deposit from escrow</li>
            <li>Keep this email safe for reference</li>
          </ul>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Booking Reference: ${bookingReference}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send PIN email:", error);
    throw error;
  }
}

interface SendPaymentNotificationParams {
  to: string;
  bookingReference: string;
  clientEmail: string;
  depositAmount: number;
}

export async function sendPaymentNotification({
  to,
  bookingReference,
  clientEmail,
  depositAmount,
}: SendPaymentNotificationParams) {
  try {
    await resend.emails.send({
      from: "HoldPay <noreply@yourdomain.com>",
      to,
      subject: `Deposit Received - ${bookingReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Deposit Received</h1>
          <p>Great news! Your client has paid their deposit.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Booking Reference:</strong> ${bookingReference}</p>
            <p><strong>Client Email:</strong> ${clientEmail}</p>
            <p><strong>Deposit Amount:</strong> $${(depositAmount / 100).toFixed(2)}</p>
          </div>
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Deliver the service as agreed</li>
            <li>Ask your client for their confirmation PIN</li>
            <li>Enter the PIN in your HoldPay dashboard to release funds</li>
          </ol>
          <p>The deposit is held securely in escrow until you confirm service completion.</p>
          <p style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/${bookingReference}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Booking Details
            </a>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send payment notification:", error);
    throw error;
  }
}