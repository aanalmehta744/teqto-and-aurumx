const nodemailer = require('nodemailer');
const db = require('../connection'); // Import your DB connection

const transporter = nodemailer.createTransport({
    host: 'mail.eliteinfotec.in',
    port: 465,
    secure: true,
    auth: {
        user: 'contact@eliteinfotec.in',
        pass: 'PV4oi-H6[AKmpF~u'
    }
});


async function sendLeaveNotification(employeeId, leaveType, startDate, endDate, numberOfDays, reason, status, mode = 'new') {
    try {
        const [employee] = await db.query('SELECT fullName, email FROM employees WHERE id = ?', [employeeId]);

        if (!employee || employee.length === 0) {
            console.warn(`Employee not found for ID ${employeeId}`);
            return;
        }

        const emp = employee[0];

        const subject = mode === 'update'
            ? `Leave Request for ${emp.fullName}`
            : `Leave Request for ${emp.fullName}`;

        const text = `
Hello ${emp.fullName},

Your ${mode === 'update' ? 'updated ' : ''}leave request has been approved.
Status: ${status}
Type: ${leaveType}
From: ${startDate}
To: ${endDate}
Days: ${numberOfDays}
Reason: ${reason}

Please contact HR for any queries.

Regards,
HR Department
        `;
        const formatDate = (dateStr) => {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        };
        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="color: #2c3e50; text-align: center;">Leave Notification</h2>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Employee:</td>
                    <td style="padding: 8px;">${emp.fullName}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Status:</td>
                    <td style="padding: 8px; color: green;">${status}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Leave Type:</td>
                    <td style="padding: 8px;">${leaveType}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">From:</td>
                    <td style="padding: 8px;">${formatDate(startDate)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">To:</td>
                    <td style="padding: 8px;">${formatDate(endDate)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Days:</td>
                    <td style="padding: 8px;">${numberOfDays}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Reason:</td>
                    <td style="padding: 8px;">${reason}</td>
                </tr>
            </table>

            <p style="margin-top: 30px; color: #7f8c8d;">If you have any questions, please contact HR.</p>
            <p style="text-align: right; font-weight: bold; color: #34495e;">— HR Department</p>
        </div>
        `;

        await transporter.sendMail({
            from: '"Eliteinfotec" <contact@eliteinfotec.in>',
            to: [emp.email, 'info@eliteinfotec.in'],
            subject,
            text,
            html
        });

        console.log(`✅ Leave ${mode} notification sent to:`, emp.email);
    } catch (err) {
        console.error("❌ Error sending leave notification:", err.message);
    }
}

module.exports = { sendLeaveNotification };
