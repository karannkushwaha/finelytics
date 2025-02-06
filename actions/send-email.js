import { Resend } from "resend";

export const sendEmail = async ({ to, subject, react }) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
    return { success: false, error: "Missing API Key" };
  }

  if (!to || !subject || !react) {
    console.error("Missing required email parameters");
    return { success: false, error: "Invalid email parameters" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const data = await resend.emails.send({
      from: "Finelytics <onboarding@resend.dev>",
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
    });

    return { success: true, data };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
};
