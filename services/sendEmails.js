require('dotenv').config();
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

async function sendOTPEmail(email, otp) {
  const sentFrom = new Sender("support@dok-edu.com", "DOK-EDU");
  const recipients = [new Recipient(email, "User")];

  const htmlBody = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0;">
    <div style="text-align: center; padding-bottom: 10px;">
      <h2 style="color: #004aad; margin-bottom: 5px;">DOK-EDU Verification</h2>
      <p style="font-size: 14px; color: #555;">Secure One-Time Password (OTP)</p>
    </div>
    <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; text-align: center;">
      <p style="font-size: 16px; color: #333;">Hello,</p>
      <p style="font-size: 15px; color: #333;">Use the OTP code below to complete your verification process. The code is valid for the next <strong>5 minutes</strong>.</p>
      <h1 style="font-size: 32px; letter-spacing: 4px; color: #004aad; margin: 20px 0;">${otp}</h1>
      <p style="font-size: 14px; color: #666;">Do not share this code with anyone for your account's security.</p>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
      <p>If you didn't request this, please ignore this email.</p>
      <p>© ${new Date().getFullYear()} DOK-EDU. All rights reserved.</p>
    </div>
  </div>
  `;

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject("Your DOK-EDU OTP Code 🔐")
    .setHtml(htmlBody)
    .setText(`Your OTP Code is ${otp}. It's valid for 10 minutes. Do not share it with anyone.`);

  try {
    const response = await mailerSend.email.send(emailParams);
    console.log("✅ Email sent successfully:", response.statusCode);
  } catch (error) {
    console.error("❌ Failed to send email:", error.body || error);
  }
}

module.exports = { sendOTPEmail };
