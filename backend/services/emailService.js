const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Configure Transporter from .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Generate PDF Invoice Buffer
 */
const generateInvoicePDF = (invoiceData) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc
            .fillColor('#444444')
            .fontSize(20)
            .text('Vlite Furnitech', 110, 57)
            .fontSize(10)
            .text('123 Furniture Lane', 200, 65, { align: 'right' })
            .text('New Delhi, India', 200, 80, { align: 'right' })
            .moveDown();

        // Invoice Title
        doc
            .fillColor('#000000')
            .fontSize(25)
            .text('INVOICE', 50, 160);

        // Invoice Details
        doc
            .fontSize(10)
            .text(`Invoice Number: ${invoiceData.invoiceNumber}`, 50, 200)
            .text(`Date: ${new Date().toLocaleDateString()}`, 50, 215)
            .text(`Balance Due: 0.00`, 50, 130, { align: 'right' });

        // User Details
        doc
            .text(`Bill To:`, 50, 250)
            .font('Helvetica-Bold')
            .text(invoiceData.customerName, 50, 265)
            .font('Helvetica')
            .text(invoiceData.customerEmail, 50, 280)
            .moveDown();

        // Table Header
        const tableTop = 330;
        doc
            .font('Helvetica-Bold')
            .text('Item', 50, tableTop)
            .text('Description', 150, tableTop)
            .text('Amount', 400, tableTop, { align: 'right' });

        doc
            .moveTo(50, tableTop + 15)
            .lineTo(550, tableTop + 15)
            .stroke();

        // Table Row
        const itemTop = tableTop + 30;
        doc
            .font('Helvetica')
            .text(invoiceData.itemName, 50, itemTop)
            .text(invoiceData.itemDescription, 150, itemTop)
            .text(`Rs. ${invoiceData.amount.toLocaleString()}`, 400, itemTop, { align: 'right' });

        // Total
        const totalTop = itemTop + 30;
        doc
            .moveTo(50, totalTop)
            .lineTo(550, totalTop)
            .stroke();

        doc
            .font('Helvetica-Bold')
            .text('Total', 300, totalTop + 15)
            .text(`Rs. ${invoiceData.amount.toLocaleString()}`, 400, totalTop + 15, { align: 'right' });

        // Footer
        doc
            .fontSize(10)
            .text('Thank you for your business.', 50, 700, { align: 'center', width: 500 });

        doc.end();
    });
};

/**
 * Send Subscription Invoice Email
 */
exports.sendSubscriptionInvoice = async (user, purchaseDetails) => {
    try {
        console.log(`📧 Preparing invoice email for: ${user.email}`);

        const invoiceData = {
            invoiceNumber: `INV-${Date.now()}`, // Simple invoice number
            customerName: `${user.firstName} ${user.lastName}`,
            customerEmail: user.email,
            itemName: purchaseDetails.planName || 'Subscription Plan',
            itemDescription: purchaseDetails.description || 'Monthly Subscription with AI Features',
            amount: purchaseDetails.amount,
        };

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Email Options
        const mailOptions = {
            from: process.env.SMTP_FROM || '"Vlite Accounts" <notification@vlitefurnitech.com>',
            to: user.email,
            subject: `Invoice for your purchase - ${invoiceData.invoiceNumber}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Thank you for your purchase!</h2>
                    <p>Hi ${user.firstName},</p>
                    <p>We have received your payment of <strong>Rs. ${invoiceData.amount}</strong> for <strong>${invoiceData.itemName}</strong>.</p>
                    <p>Please find the invoice attached.</p>
                    <br>
                    <p>Best Regards,</p>
                    <p>Vlite Furnitech Team</p>
                </div>
            `,
            attachments: [
                {
                    filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        };

        // Send Email
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Invoice Email sent:', info.messageId);
        return true;

    } catch (error) {
        console.error('❌ Error sending invoice email:', error);
        // Do not throw, just log. Subscription flow should not fail if email fails.
        return false;
    }
};

/**
 * Send Simple Test Email
 */
exports.sendTestEmail = async (to) => {
    // ... verify smtp works ... -> keeping it simple
};

/**
 * Send Follow-up Reminder Email
 */
exports.sendFollowUpReminderEmail = async (salesman, inquiries) => {
    try {
        console.log(`📧 Sending follow-up reminder to: ${salesman.email}`);

        const subject = 'Action Required: Pending Inquiries Needing Follow-up';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #d32f2f; margin: 0;">Follow-up Reminder</h1>
            </div>
            
            <p style="color: #333; font-size: 16px;">Hello <strong>${salesman.name}</strong>,</p>
            
            <p style="color: #555; line-height: 1.5;">
                This is a friendly reminder that you have <strong>${inquiries.length}</strong> inquiries that require your attention.
                These inquiries have not been updated recently.
            </p>
            
            <div style="margin: 20px 0;">
                <h3 style="color: #333; border-bottom: 2px solid #f5f5f5; padding-bottom: 10px;">Pending Inquiries</h3>
                <ul style="list-style: none; padding: 0;">
                  ${inquiries.map(inquiry => `
                    <li style="background: #f9f9f9; padding: 15px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid #d32f2f;">
                        <a href="${process.env.FRONTEND_URL}/inquiries/${inquiry._id}" style="text-decoration: none; color: inherit; display: block;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #333; font-size: 15px;">${inquiry.customerName}</strong>
                                <span style="font-size: 12px; color: #888; background: #fff; padding: 2px 8px; border-radius: 12px; border: 1px solid #eee;">
                                    ${inquiry.leadStatus || 'Status N/A'}
                                </span>
                            </div>
                            <div style="margin-top: 5px; font-size: 13px; color: #666;">
                                Contact: ${inquiry.contact || 'N/A'}
                            </div>
                            <div style="margin-top: 5px; font-size: 12px; color: #999;">
                                Last Updated: ${new Date(inquiry.updatedAt).toLocaleDateString()}
                            </div>
                        </a>
                    </li>
                  `).join('')}
                </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL}/salesman-dashboard" style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Open Dashboard
                </a>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 40px;">
                Best regards,<br/>Vlite Sales Team
            </p>
          </div>
        `;

        const mailOptions = {
            from: process.env.SMTP_FROM || '"Vlite Sales" <notification@vlitefurnitech.com>',
            to: salesman.email,
            subject: subject,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Reminder Email sent:', info.messageId);
        return true;

    } catch (error) {
        console.error(`❌ Error sending reminder email to ${salesman.email}:`, error);
        throw error; // Rethrow so controller knows it failed
    }
};
