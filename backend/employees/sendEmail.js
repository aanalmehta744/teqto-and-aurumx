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

/**
 * Send welcome email to employee
 * @param {Object} employeeData - { fullName, email, joiningDate }
 */
const sendWelcomeEmail = async (employeeData) => {
    const formattedDate = new Date(employeeData.joiningDate).toLocaleDateString();
    console.log(employeeData)
    const mailOptions = {
        from: '"Eliteinfotec HR" <contact@eliteinfotec.in>',
        to: employeeData.email,
        subject: ' Welcome to Eliteinfotec!',
        html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
      <div style="background: #d6d5ea; padding: 20px; color: white;">
        <h2 style="margin: 0;">Welcome Aboard, ${employeeData.fullName} </h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 16px; color: #333;">Dear ${employeeData.fullName},</p>
        <p style="font-size: 15px; color: #555;">
          We're thrilled to have you join <strong>Eliteinfotec</strong>. Your employee profile has been successfully created!
        </p>

        <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Email:</strong> ${employeeData.email}</p>
          <p style="margin: 4px 0;"><strong>Joining Date:</strong> ${employeeData.joiningDate}</p>
        </div>

        <p style="font-size: 15px; color: #555;">
          If you have any questions, feel free to contact the HR team anytime.
        </p>

        <p style="font-size: 15px; margin-top: 30px; color: #333;">Best Regards,</p>
        <p style="font-size: 15px; color: #333;"><strong>Eliteinfotec HR Team</strong></p>
      </div>
      <div style="background: #f9f9f9; text-align: center; padding: 10px; font-size: 13px; color: #999;">
        © ${new Date().getFullYear()} Eliteinfotec. All rights reserved.
      </div>
    </div>
  `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent to:', employeeData.email);
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
    }
};

module.exports = { sendWelcomeEmail };
