const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../connection');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// ==========================================
// MAIL TRANSPORTER
// ==========================================

const transporter = nodemailer.createTransport({
  host: 'mail.eliteinfotec.in',
  port: 465,
  secure: true,
  auth: {
    user: 'contact@eliteinfotec.in',
    pass: process.env.SMTP_PASSWORD
  }
});

// ==========================================
// LOGIN
// ==========================================

router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;

  console.log('1. LOGIN REQUEST RECEIVED');
  console.log({
    username,
    role
  });

  // ==========================================
  // VALIDATION
  // ==========================================

  if (!username || !password || !role) {
    return res.status(400).json({
      message: 'Email, password and role are required'
    });
  }

  try {
    // ==========================================
    // FIND USER BY EMAIL + SELECTED ROLE
    // ==========================================

    console.log('2. BEFORE DATABASE QUERY');

    const [results] = await db.query(
      `SELECT *
       FROM employees
       WHERE email = ?
       AND role = ?`,
      [
        username.trim(),
        role.trim()
      ]
    );

    console.log('3. AFTER DATABASE QUERY');
    console.log('Users found:', results.length);

    if (results.length === 0) {
      return res.status(401).json({
        message: 'Invalid username, password, or role.'
      });
    }

    const user = results[0];

    console.log('4. USER FOUND:', user.id);

    // ==========================================
    // CHECK ACCOUNT STATUS
    // ==========================================

    if (user.status !== 1) {
      console.log('Account inactive.');

      return res.status(403).json({
        message: 'Account inactive. Please contact admin.'
      });
    }

    // ==========================================
    // CHECK PASSWORD
    // ==========================================

    console.log('5. BEFORE BCRYPT');

    const isMatch = await bcrypt.compare(
      password.trim(),
      user.password.trim()
    );

    console.log('6. AFTER BCRYPT:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid username, password, or role.'
      });
    }

    // ==========================================
    // EXTRA ROLE VERIFICATION
    // ==========================================

    const selectedRole = String(role)
      .trim()
      .toLowerCase();

    const actualRole = String(user.role || '')
      .trim()
      .toLowerCase();

    if (selectedRole !== actualRole) {
      console.log('Role mismatch:', {
        selectedRole,
        actualRole
      });

      return res.status(401).json({
        message: 'Selected login role does not match this account.'
      });
    }

    console.log('7. PASSWORD AND ROLE CORRECT');

    // ==========================================
    // GENERATE JWT
    // ==========================================

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department
      },
      process.env.JWT_SECRET || 'defaultSecret',
      {
        expiresIn: '1d'
      }
    );

    console.log('8. JWT CREATED');

    // ==========================================
    // REMOVE PASSWORD FROM RESPONSE
    // ==========================================

    const safeUser = {
      ...user
    };

    delete safeUser.password;

    // ==========================================
    // SEND LOGIN RESPONSE
    // ==========================================

    console.log('9. SENDING LOGIN RESPONSE');

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: safeUser
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);

    return res.status(500).json({
      message: 'Server error during login'
    });
  }
});

// ==========================================
// FORGOT PASSWORD
// ==========================================

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: 'Email is required'
    });
  }

  try {
    // Check if email exists
    const [results] = await db.query(
      `SELECT * FROM employees WHERE email = ?`,
      [email]
    );

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Email not found'
      });
    }

    const user = results[0];

    // ==========================================
    // GENERATE RESET TOKEN
    // ==========================================

    const resetToken = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      process.env.JWT_SECRET || 'defaultSecret',
      {
        expiresIn: '1h'
      }
    );

    // ==========================================
    // CREATE RESET LINK
    // ==========================================

    const resetLink =
      `https://portal.eliteinfotec.in/authentication/reset-password/${resetToken}`;

    // ==========================================
    // EMAIL
    // ==========================================

    const mailOptions = {
      from: '"Elite Infotec" <contact@eliteinfotec.in>',
      to: email,
      subject: 'Password Reset Request',

      html: `
        <div style="
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          overflow: hidden;
        ">

          <div style="
            background: #d6d5ea;
            padding: 20px;
            color: white;
          ">
            <h2 style="margin: 0;">
              Password Reset Request
            </h2>
          </div>

          <div style="padding: 24px;">

            <p style="
              font-size: 16px;
              color: #333;
            ">
              Dear ${user.fullName || 'Employee'},
            </p>

            <p style="
              font-size: 15px;
              color: #555;
            ">
              We received a request to reset your password for your
              <strong>Eliteinfotec</strong> account.
            </p>

            <div style="
              background: #f3f4f6;
              padding: 16px;
              border-radius: 6px;
              margin: 16px 0;
              text-align: center;
            ">

              <a
                href="${resetLink}"
                style="
                  display: inline-block;
                  padding: 12px 20px;
                  background: #00383F;
                  color: #fff;
                  text-decoration: none;
                  border-radius: 6px;
                  font-size: 15px;
                "
              >
                Reset Password
              </a>

            </div>

            <p style="
              font-size: 15px;
              color: #555;
            ">
              This link will expire in
              <strong>1 hour</strong>.
              If you did not request a password reset,
              you can safely ignore this email.
            </p>

            <p style="
              font-size: 15px;
              margin-top: 30px;
              color: #333;
            ">
              Best Regards,
            </p>

            <p style="
              font-size: 15px;
              color: #333;
            ">
              <strong>Eliteinfotec HR Team</strong>
            </p>

          </div>

          <div style="
            background: #f9f9f9;
            text-align: center;
            padding: 10px;
            font-size: 13px;
            color: #999;
          ">
            © ${new Date().getFullYear()}
            Eliteinfotec. All rights reserved.
          </div>

        </div>
      `
    };

    // ==========================================
    // SEND EMAIL
    // ==========================================

    await transporter.sendMail(mailOptions);

    return res.json({
      message: 'Password reset link sent to your email.'
    });

  } catch (err) {
    console.error(
      'Error sending forgot password email:',
      err
    );

    return res.status(500).json({
      message: 'Server error'
    });
  }
});

// ==========================================
// RESET PASSWORD
// ==========================================

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      message: 'Token and password are required'
    });
  }

  try {
    // ==========================================
    // VERIFY TOKEN
    // ==========================================

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'defaultSecret'
    );

    // ==========================================
    // HASH NEW PASSWORD
    // ==========================================

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // ==========================================
    // UPDATE PASSWORD
    // ==========================================

    await db.query(
      'UPDATE employees SET password = ? WHERE id = ?',
      [
        hashedPassword,
        decoded.userId
      ]
    );

    return res.json({
      message: 'Password updated successfully'
    });

  } catch (err) {
    console.error(err);

    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({
        message: 'Token has expired'
      });
    }

    return res.status(500).json({
      message: 'Server error'
    });
  }
});

// ==========================================
// EXPORT
// ==========================================

module.exports = router;