const nodemailer = require('nodemailer');
const path = require('path');
const logger = require('./logger');

/**
 * Email Service for system notifications
 * FR-550: Email notifications for critical events
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Send email
   */
  async sendEmail({ to, subject, text, html, attachments = [] }) {
    try {
      // Append Footer with Logo
      const footerHtml = `
        <br>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <img src="cid:vlite-logo" alt="Vlite Furnitures" style="max-height: 80px; width: auto;">
          <p style="color: #999; font-size: 12px; margin-top: 10px;">
            © ${new Date().getFullYear()} Vlite Furnitures. All rights reserved.
          </p>
        </div>
      `;

      // Check if html exists, if not use text wrapped in div, or just append to empty string if only text is sent (though usually html is sent)
      const finalHtml = (html || `<div>${text}</div>`) + footerHtml;

      const logoPath = path.join(__dirname, '../../logo/logo1.jpg');

      const emailAttachments = [
        ...attachments,
        {
          filename: 'logo1.jpg',
          path: logoPath,
          cid: 'vlite-logo'
        }
      ];

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'notification@vlitefurnitech.com',
        to,
        subject,
        text,
        html: finalHtml,
        attachments: emailAttachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Email sending failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * FR-551: Quotation Approval Notification
   */
  async sendQuotationApprovalEmail(quotation, users) {
    const subject = `Quotation ${quotation.quotationNumber} - Approval ${quotation.approvalStatus}`;
    const html = `
      <h2>Quotation Approval Notification</h2>
      <p><strong>Quotation Number:</strong> ${quotation.quotationNumber}</p>
      <p><strong>Customer:</strong> ${quotation.customer.fullName}</p>
      <p><strong>Total Amount:</strong> ${quotation.currency} ${quotation.totalAmount.toFixed(2)}</p>
      <p><strong>Status:</strong> ${quotation.approvalStatus}</p>
      <p><strong>Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString()}</p>
      <br>
      <p>Please review and take appropriate action.</p>
    `;

    const recipients = users.map(u => u.email).join(',');
    return await this.sendEmail({ to: recipients, subject, html });
  }

  /**
   * FR-552: Low Stock Alert
   */
  async sendLowStockAlert(material, users) {
    const subject = `Low Stock Alert - ${material.name}`;
    const html = `
      <h2>Low Stock Alert</h2>
      <p><strong>Material:</strong> ${material.name} (${material.materialCode})</p>
      <p><strong>Category:</strong> ${material.category}</p>
      <p><strong>Current Stock:</strong> ${material.currentStock} ${material.uom}</p>
      <p><strong>Minimum Level:</strong> ${material.minStockLevel} ${material.uom}</p>
      <p><strong>Reorder Point:</strong> ${material.reorderPoint} ${material.uom}</p>
      <br>
      <p style="color: red;"><strong>Action Required:</strong> Please initiate purchase order immediately.</p>
    `;

    const recipients = users.map(u => u.email).join(',');
    return await this.sendEmail({ to: recipients, subject, html });
  }

  /**
   * FR-553: Dispatch Completion Notification
   */
  async sendDispatchNotification(order, users) {
    const subject = `Order ${order.orderNumber} Dispatched`;
    const html = `
      <h2>Dispatch Notification</h2>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Customer:</strong> ${order.customer.fullName}</p>
      <p><strong>Delivery Address:</strong> ${order.deliveryAddress.street}, ${order.deliveryAddress.city}</p>
      <p><strong>Expected Delivery:</strong> ${new Date(order.expectedDeliveryDate).toLocaleDateString()}</p>
      <br>
      <p>The order has been dispatched and is on its way to the customer.</p>
      
      <!-- NEXT STEP SECTION -->
      <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">📋 NEXT STEP</h3>
        <p style="margin: 0; color: #856404; font-weight: 500;">Monitor delivery status in Post-Production Dashboard</p>
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/production/post-production" 
           style="background-color: #007bff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
           Track Order
        </a>
      </div>
    `;

    const recipients = users.map(u => u.email).join(',');
    return await this.sendEmail({ to: recipients, subject, html });
  }

  /**
   * FR-554: Advance Payment Received
   */
  async sendAdvancePaymentNotification(quotation, users) {
    const subject = `Advance Payment Received - ${quotation.quotationNumber}`;
    const html = `
      <h2>Advance Payment Received</h2>
      <p><strong>Quotation Number:</strong> ${quotation.quotationNumber}</p>
      <p><strong>Customer:</strong> ${quotation.customer.fullName}</p>
      <p><strong>Amount Received:</strong> ${quotation.currency} ${quotation.advancePaymentDetails.amount.toFixed(2)}</p>
      <p><strong>Payment Mode:</strong> ${quotation.advancePaymentDetails.paymentMode}</p>
      <p><strong>Transaction Reference:</strong> ${quotation.advancePaymentDetails.transactionReference}</p>
      <p><strong>Date:</strong> ${new Date(quotation.advancePaymentDetails.receivedDate).toLocaleDateString()}</p>
      <br>
      <p>You can now proceed with order processing.</p>
    `;

    const recipients = users.map(u => u.email).join(',');
    return await this.sendEmail({ to: recipients, subject, html });
  }

  /**
   * FR-555: Predictive Maintenance Alert
   */
  async sendPredictiveMaintenanceAlert(machine, users) {
    const subject = `Predictive Maintenance Alert - ${machine.name}`;
    const html = `
      <h2>Predictive Maintenance Alert</h2>
      <p><strong>Machine:</strong> ${machine.name} (${machine.machineCode})</p>
      <p><strong>Type:</strong> ${machine.type}</p>
      <p><strong>Risk Level:</strong> <span style="color: red; font-weight: bold;">${machine.aiMaintenancePrediction.failureRiskLevel}</span></p>
      <p><strong>Predicted Failure Date:</strong> ${new Date(machine.aiMaintenancePrediction.predictedFailureDate).toLocaleDateString()}</p>
      <br>
      <p><strong>Recommended Actions:</strong></p>
      <ul>
        ${machine.aiMaintenancePrediction.recommendedActions.map(action => `<li>${action}</li>`).join('')}
      </ul>
      <br>
      <p style="color: red;"><strong>Immediate attention required to prevent equipment failure!</strong></p>
    `;

    const recipients = users.map(u => u.email).join(',');
    return await this.sendEmail({ to: recipients, subject, html });
  }

  /**
   * Send notification to worker when a production task is assigned
   */
  async sendProductionTaskAssignmentEmail(task, user) {
    const taskTitle = task.title || 'Production Task';
    const taskNumber = task.taskNumber || 'N/A';
    const orderNumber = task.order?.orderNumber || 'N/A';
    const customerName = task.order?.customer?.fullName || 'N/A';
    const subject = `📥 New Task Assigned: ${taskTitle} (${taskNumber})`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c3e50;">New Task Assignment</h2>
        <p>Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
        <p>You have been assigned the following production task:</p>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
          <ul style="list-style: none; padding: 0;">
            <li><strong>Task:</strong> ${taskTitle}</li>
            <li><strong>Task ID:</strong> ${taskNumber}</li>
            <li><strong>Order #:</strong> ${orderNumber}</li>
            <li><strong>Customer:</strong> ${customerName}</li>
            <li><strong>Priority:</strong> <span style="color: ${task.priority === 'HIGH' || task.priority === 'URGENT' ? 'red' : 'inherit'}; font-weight: bold;">${task.priority}</span></li>
            <li><strong>Est. Duration:</strong> ${task.estimatedDurationMinutes} mins</li>
            <li><strong>Due Date:</strong> ${task.dueDate ? new Date(task.dueDate).toLocaleString() : 'N/A'}</li>
          </ul>
        </div>
        
        <!-- NEXT STEP SECTION -->
        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">📋 NEXT STEP</h3>
          <p style="margin: 0; color: #856404; font-weight: 500;">Start production task in Pre-Production Dashboard</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/production/pre-production" 
             style="background-color: #007bff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
             View Task
          </a>
        </div>
        
        <br>
        <p>Keep up the good work!<br><strong>Vlite Furniture Team</strong></p>
      </div>
    `;

    return await this.sendEmail({ to: user.email, subject, html });
  }

  /**
   * Send notification to designer when assigned to a customer/project
   */
  async sendDesignAssignmentEmail(customer, designer, assignerName = 'Design Head') {
    const customerName = (customer.firstName && customer.lastName)
      ? `${customer.firstName} ${customer.lastName}`
      : (customer.companyName || customer.firstName || 'New Customer');
    const subject = `🎨 New Design Project Assigned: ${customerName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c3e50;">New Design Assignment</h2>
        <p>Hello <strong>${designer.firstName} ${designer.lastName}</strong>,</p>
        <p>You have been assigned as the lead designer for the following project:</p>
        
        <div style="background-color: #f4f6f7; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1abc9c;">
          <ul style="list-style: none; padding: 0;">
            <li><strong>Customer Name:</strong> ${customerName}</li>
            <li><strong>Assigned By:</strong> ${assignerName}</li>
            <li><strong>Assignment Date:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
        </div>
        
        <p>Please review the customer requirements and start preparing the design drawings.</p>
        <br>
        <p>Best Regards,<br><strong>Vlite Furniture Team</strong></p>
      </div>
    `;

    return await this.sendEmail({ to: designer.email, subject, html });
  }

  /**
   * Send notification to salesman when an inquiry is assigned to them
   */
  async sendInquiryAssignmentEmail(inquiry, salesman, assignerName = 'Admin') {
    const customerName = inquiry.meta?.customerName || inquiry.companyName || 'Potential Customer';
    const productInterest = inquiry.items?.[0]?.description || 'Furniture Inquiry';
    const subject = `🎯 New Inquiry Assigned: ${customerName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c3e50;">New Inquiry Assignment</h2>
        <p>Hello <strong>${salesman.firstName} ${salesman.lastName}</strong>,</p>
        <p>A new inquiry has been assigned to you by <strong>${assignerName}</strong>.</p>
        
        <div style="background-color: #f4f6f7; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e67e22;">
          <ul style="list-style: none; padding: 0;">
            <li><strong>Customer:</strong> ${customerName}</li>
            <li><strong>Product Interest:</strong> ${productInterest}</li>
            <li><strong>Contact:</strong> ${inquiry.meta?.contact || 'N/A'}</li>
            <li><strong>Email:</strong> ${inquiry.meta?.email || 'N/A'}</li>
            <li><strong>Priority:</strong> <span style="font-weight: bold; color: ${inquiry.priority === 'high' ? 'red' : 'inherit'}">${inquiry.priority?.toUpperCase()}</span></li>
            <li><strong>Assigned At:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        
        <!-- NEXT STEP SECTION -->
        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">📋 NEXT STEP</h3>
          <p style="margin: 0; color: #856404; font-weight: 500;">Go to Inquiries page → Contact customer → Update lead status</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/inquiries" 
             style="background-color: #007bff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
             View Inquiry
          </a>
        </div>
        
        <br>
        <p>Good luck!</p>
        <p>Best Regards,<br><strong>Vlite Furniture Team</strong></p>
      </div>
    `;

    return await this.sendEmail({ to: salesman.email, subject, html });
  }

  /**
   * Send notification to HOD when an inquiry is assigned by POC
   */
  async sendInquiryAssignmentNotificationToHOD(inquiry, salesman, assignerName, hod) {
    const customerName = inquiry.meta?.customerName || inquiry.companyName || 'Potential Customer';
    const productInterest = inquiry.items?.[0]?.description || 'Furniture Inquiry';
    const subject = `📢 Assignment Alert: Inquiry assigned to ${salesman.firstName} ${salesman.lastName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c3e50;">Inquiry Assignment Notification</h2>
        <p>Hello <strong>${hod.firstName} ${hod.lastName}</strong>,</p>
        <p>This is to inform you that <strong>${assignerName}</strong> (POC) has assigned the following inquiry:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #8e44ad;">
          <ul style="list-style: none; padding: 0;">
            <li><strong>Assigned To:</strong> ${salesman.firstName} ${salesman.lastName}</li>
            <li><strong>Customer:</strong> ${customerName}</li>
            <li><strong>Product Interest:</strong> ${productInterest}</li>
            <li><strong>Contact:</strong> ${inquiry.meta?.contact || 'N/A'}</li>
            <li><strong>Assigned At:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        
        <!-- NEXT STEP SECTION -->
        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">📋 NEXT STEP</h3>
          <p style="margin: 0; color: #856404; font-weight: 500;">Monitor assignment progress in Salesman Dashboard</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/salesman-dashboard" 
             style="background-color: #007bff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
             View Dashboard
          </a>
        </div>
        
        <br>
        <p>Best Regards,<br><strong>Vlite Furniture Team</strong></p>
      </div>
    `;

    return await this.sendEmail({ to: hod.email, subject, html });
  }

  /**
   * Send notification to salesman when a customer approves a quotation via email link
   */
  async sendQuotationCustomerApprovalNotification(quotation, salesman) {
    const customerName = quotation.customerName ||
      (quotation.customer ? `${quotation.customer.firstName} ${quotation.customer.lastName}` : 'Customer');
    const subject = `✅ Quotation Approved by Customer: ${quotation.quotationNumber}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #27ae60; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Quotation Approved!</h1>
        </div>
        
        <div style="padding: 30px;">
          <p>Hello <strong>${salesman.firstName} ${salesman.lastName}</strong>,</p>
          <p>Great news! The following quotation has been approved by the customer via the email link.</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #edf2f7;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; color: #718096;">Quotation Number:</td>
                <td style="padding: 5px 0; text-align: right; font-weight: bold;">${quotation.quotationNumber}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #718096;">Customer:</td>
                <td style="padding: 5px 0; text-align: right;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #718096;">Total Amount:</td>
                <td style="padding: 5px 0; text-align: right; color: #27ae60; font-weight: bold;">Rs. ${quotation.totalAmount.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #718096;">Approval Date:</td>
                <td style="padding: 5px 0; text-align: right;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <!-- NEXT STEP SECTION -->
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">📋 NEXT STEP</h3>
            <p style="margin: 0; color: #856404; font-weight: 500;">Check the Orders page → An order has been automatically created from this quotation</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders" 
               style="background-color: #007bff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
               View Orders Dashboard
            </a>
          </div>
        </div>
        
        <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
          Vlite Furniture ERP - Sales Automation
        </div>
      </div>
    `;

    return await this.sendEmail({ to: salesman.email, subject, html });
  }

  /**
   * Send notification to Admin/Manager when a new inquiry is created manually
   */
  async sendNewInquiryNotification(inquiry, adminUsers) {
    if (!adminUsers || adminUsers.length === 0) return;

    const customerName = inquiry.meta?.customerName || inquiry.companyName || 'Potential Customer';
    const productInterest = inquiry.items?.[0]?.description || inquiry.meta?.productDemand || 'Furniture Inquiry';
    const subject = `🆕 New Inquiry Received: ${customerName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #34495e; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">New Inquiry Alert</h1>
        </div>
        
        <div style="padding: 30px;">
          <p>Hello Team,</p>
          <p>A new inquiry has been registered in the system.</p>
          
          <div style="background-color: #f4f6f7; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
            <ul style="list-style: none; padding: 0;">
              <li><strong>Customer:</strong> ${customerName}</li>
              <li><strong>Product:</strong> ${productInterest} ${inquiry.meta?.demandQuantity ? `(Qty: ${inquiry.meta.demandQuantity})` : ''}</li>
              <li><strong>Contact:</strong> ${inquiry.meta?.contact || 'N/A'}</li>
              <li><strong>Email:</strong> ${inquiry.meta?.email || 'N/A'}</li>
              <li><strong>Source:</strong> ${inquiry.leadPlatform || 'Manual'}</li>
              <li><strong>Created At:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <!-- NEXT STEP SECTION -->
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">📋 NEXT STEP</h3>
            <p style="margin: 0; color: #856404; font-weight: 500;">Assign inquiry to salesman in POC Assignment page</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/poc-assignment" 
               style="background-color: #007bff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
               Assign Now
            </a>
          </div>
        </div>
        
        <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
          Vlite Furniture ERP System
        </div>
      </div>
    `;

    const recipients = adminUsers.map(u => u.email).filter(e => e).join(',');
    if (!recipients) return;

    return await this.sendEmail({ to: recipients, subject, html });
  }

  /**
   * Send a summary notification for bulk imported inquiries
   */
  async sendBulkInquiryNotification(inquiries, adminUsers) {
    if (!adminUsers || adminUsers.length === 0 || !inquiries || inquiries.length === 0) return;

    const subject = `📊 Bulk Inquiries Imported: ${inquiries.length} New Leads`;

    const inquiryRows = inquiries.map((inq, index) => {
      const name = inq.meta?.customerName || inq.companyName || 'Unknown';
      const product = inq.meta?.productDemand || inq.items?.[0]?.description || 'N/A';
      const contact = inq.meta?.contact || 'N/A';
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${index + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${name}</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${product}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${contact}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${inq.leadPlatform || 'Sheet'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #e1e8ed; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2c3e50; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Bulk Import Summary</h1>
          <p style="margin: 5px 0 0; opacity: 0.8;">${inquiries.length} inquiries fetched from Google Sheets</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Hello Admin,</p>
          <p>The following inquiries were successfully imported and are now available in the inquiry pool:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
              <tr style="background-color: #f8f9fa; text-align: left;">
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6;">#</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6;">Customer</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6;">Requirement</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6;">Contact</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6;">Source</th>
              </tr>
            </thead>
            <tbody>
              ${inquiryRows}
            </tbody>
          </table>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/crm/inquiries" 
               style="background-color: #27ae60; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
               Manage Inquiries in Dashboard
            </a>
          </div>
        </div>
        
        <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
          Vlite Furniture ERP System - Automated Lead Import
        </div>
      </div>
    `;

    const recipients = adminUsers.map(u => u.email).filter(e => e).join(',');
    if (!recipients) return;

    return await this.sendEmail({ to: recipients, subject, html });
  }

  /**
   * Send follow-up reminder digest to salesman
   * FR-New: HOS Follow-up Reminders
   */
  async sendFollowUpReminderEmail(salesman, inquiries) {
    const subject = `⚠️ Action Required: ${inquiries.length} Pending Inquiries`;

    const inquiryRows = inquiries.map((inq, index) => {
      const name = inq.meta?.customerName || inq.companyName || 'Unknown';
      const product = inq.items?.[0]?.description || 'Furniture';
      const lastUpdate = inq.updatedAt ? new Date(inq.updatedAt).toLocaleDateString() : 'N/A';
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${index + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${name}</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${product}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${inq.leadStatus || 'PENDING'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: red;">${lastUpdate}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #e1e8ed; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #c0392b; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Pending Follow-ups</h1>
          <p style="margin: 5px 0 0; opacity: 0.9;">You have ${inquiries.length} inquiries that need attention</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Hello <strong>${salesman.firstName}</strong>,</p>
          <p>The Head of Sales has requested an update on the following inquiries which haven't been active recently:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
              <tr style="background-color: #f8f9fa; text-align: left;">
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6;">#</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6;">Customer</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6;">Product</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6;">Status</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6;">Last Update</th>
              </tr>
            </thead>
            <tbody>
              ${inquiryRows}
            </tbody>
          </table>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/crm/inquiries" 
               style="background-color: #c0392b; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
               Update Inquiries Now
            </a>
          </div>
        </div>
        
        <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
          Vlite Furniture ERP - Sales Performance
        </div>
      </div>
    `;

    return await this.sendEmail({ to: salesman.email, subject, html });
  }

  /**
   * Send drawing approval request to client
   */
  async sendDrawingApprovalToClient(drawing, customer, salesman, approvalToken) {
    const customerName = customer.firstName && customer.lastName
      ? `${customer.firstName} ${customer.lastName}`
      : customer.firstName || 'Valued Customer';
    const salesmanName = salesman.firstName && salesman.lastName
      ? `${salesman.firstName} ${salesman.lastName}`
      : drawing.salesmanName || 'Your Sales Representative';

    const subject = `📐 Drawing Approval Required - ${drawing.fileName}`;

    const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/drawings/approve/${approvalToken}`;
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:5000';

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Drawing Approval Request</h1>
          <p style="margin: 10px 0 0; opacity: 0.9; font-size: 14px;">Please review and approve your drawing</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>Your drawing is ready for review and approval. Please find the details below:</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #edf2f7;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #718096; font-weight: 500;">Drawing File:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${drawing.fileName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #718096; font-weight: 500;">File Size:</td>
                <td style="padding: 8px 0; text-align: right;">${drawing.fileSize ? (drawing.fileSize / 1024).toFixed(1) + ' KB' : 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #718096; font-weight: 500;">Uploaded On:</td>
                <td style="padding: 8px 0; text-align: right;">${new Date(drawing.createdAt).toLocaleDateString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #718096; font-weight: 500;">Sales Representative:</td>
                <td style="padding: 8px 0; text-align: right;">${salesmanName}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⏰ Important:</strong> This approval link is valid for 7 days from the date of this email.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${approvalUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              ✅ Approve Drawing
            </a>
          </div>
          
          <p style="font-size: 13px; color: #718096; margin-top: 30px;">
            If you have any questions or concerns about this drawing, please contact ${salesmanName} directly.
          </p>
          
          <p style="font-size: 13px; color: #718096; margin-top: 10px;">
            <em>Note: If the button doesn't work, you can copy and paste this link into your browser:</em><br>
            <a href="${approvalUrl}" style="color: #667eea; word-break: break-all;">${approvalUrl}</a>
          </p>
        </div>
        
        <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
          <p style="margin: 0;">Vlite Furnitures - Quality Furniture Solutions</p>
          <p style="margin: 5px 0 0;">This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `;

    return await this.sendEmail({ to: customer.email, subject, html });
  }

  /**
   * Send notification to salesman when client approves drawing
   */
  async sendDrawingClientApprovalNotificationToSalesman(drawing, customer, salesman) {
    const customerName = customer.firstName && customer.lastName
      ? `${customer.firstName} ${customer.lastName}`
      : customer.firstName || 'Customer';
    const salesmanName = salesman.firstName && salesman.lastName
      ? `${salesman.firstName} ${salesman.lastName}`
      : 'Sales Team';

    const subject = `✅ Drawing Approved by Client - ${drawing.fileName}`;

    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/salesman-drawing-dashboard`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #27ae60; color: #fff; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Drawing Approved!</h1>
          <p style="margin: 10px 0 0; opacity: 0.9; font-size: 14px;">Your client has approved the drawing</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Hello <strong>${salesmanName}</strong>,</p>
          <p>Great news! <strong>${customerName}</strong> has approved the following drawing:</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #155724; font-weight: 500;">Customer:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #155724;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #155724; font-weight: 500;">Drawing File:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #155724;">${drawing.fileName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #155724; font-weight: 500;">Approved On:</td>
                <td style="padding: 8px 0; text-align: right; color: #155724;">${new Date().toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>📋 Next Step:</strong> Please log in to the system and mark this drawing as "Done" to proceed with production.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #2c3e50; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(44, 62, 80, 0.3);">
              📊 Go to Drawing Dashboard
            </a>
          </div>
          
          <p style="font-size: 13px; color: #718096; margin-top: 30px;">
            Once you mark this drawing as done, the order will automatically move to the Pre-Production stage.
          </p>
        </div>
        
        <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
          <p style="margin: 0;">Vlite Furnitures ERP - Sales Automation</p>
          <p style="margin: 5px 0 0;">Keep up the excellent work!</p>
        </div>
      </div>
    `;

    return await this.sendEmail({ to: salesman.email, subject, html });
  }
}

module.exports = new EmailService();
