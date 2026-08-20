// emailService.js
const nodemailer = require('nodemailer');
const db = require('../connection');

const transporter = nodemailer.createTransport({
    host: 'mail.eliteinfotec.in',
    port: 465,
    secure: true,
    auth: {
        user: 'contact@eliteinfotec.in',
        pass: 'PV4oi-H6[AKmpF~u'
    }
});

// ✅ FOLLOW-UP NOTIFICATION
async function sendFollowupNotification(clientId, bdeId, followupDate, notes, status) {
    try {
        // Fetch client details
        const [clientRows] = await db.query('SELECT fullName, email FROM clients WHERE id = ?', [clientId]);
        const client = clientRows[0];

        // Fetch BDE (employee) details
        const [bdeRows] = await db.query('SELECT fullName, email FROM employees WHERE id = ?', [bdeId]);
        const bde = bdeRows[0];

        if (!client || !bde) {
            console.warn(`Client or BDE not found. Client ID: ${clientId}, BDE ID: ${bdeId}`);
            return;
        }

        const formatDate = (dateStr) => {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        };

        const subject = `New Follow-up Added for ${client.fullName}`;

        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="color: #2c3e50; text-align: center;">Client Follow-up Notification</h2>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Client:</td>
                    <td style="padding: 8px;">${client.fullName}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Follow-up Date:</td>
                    <td style="padding: 8px;">${formatDate(followupDate)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Status:</td>
                    <td style="padding: 8px; color: ${status === 'Completed' ? 'green' : 'orange'};">${status}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Notes:</td>
                    <td style="padding: 8px;">${notes}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">BDE:</td>
                    <td style="padding: 8px;">${bde.fullName}</td>
                </tr>
            </table>

            <p style="margin-top: 30px; color: #7f8c8d;">If you have any questions, please contact your BDE.</p>
            <p style="text-align: right; font-weight: bold; color: #34495e;">— BDE Department</p>
        </div>
        `;

        await transporter.sendMail({
            from: '"Eliteinfotec" <contact@eliteinfotec.in>',
            to: [bde.email, 'info@eliteinfotec.in'], // optional CC to admin
            subject,
            html
        });

        console.log(`Follow-up notification sent to: ${bde.email}`);
    } catch (err) {
        console.error('Error sending follow-up email:', err);
    }
}

module.exports = { sendFollowupNotification };
