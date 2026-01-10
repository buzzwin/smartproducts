import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipients, subject, message, pdfBase64, pdfFilename } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { message: "At least one recipient email is required" },
        { status: 400 }
      );
    }

    if (!pdfBase64) {
      return NextResponse.json(
        { message: "PDF attachment is required" },
        { status: 400 }
      );
    }

    // Get email configuration from environment variables
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpUser || !smtpPassword) {
      return NextResponse.json(
        {
          message:
            "Email configuration is missing. Please set SMTP_USER and SMTP_PASSWORD environment variables.",
        },
        { status: 500 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    // Send email
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: recipients.join(", "),
      subject: subject || "Feature Report",
      text: message || "Please find attached the feature report.",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>${message || "Please find attached the feature report."}</p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This email was sent from the SmartProducts Platform.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: pdfFilename || "feature-report.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({
      message: "Email sent successfully",
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      {
        message: error.message || "Failed to send email",
        error: error.toString(),
      },
      { status: 500 }
    );
  }
}

