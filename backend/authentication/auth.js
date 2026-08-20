const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../connection'); // Ensure the path is correct
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.eliteinfotec.in',
  port: 465,
  secure: true,
  auth: {
    user: 'contact@eliteinfotec.in',
    pass: 'PV4oi-H6[AKmpF~u'
  }
});

// router.post('/login', async (req, res) => {
//   const { username, password, role } = req.body;
//   console.log("Received login request:", req.body);

//   if (!username || !password || !role) {
//     return res.status(400).json({ message: 'Email, password, and role are required' });
//   }

//   try {
//     // ✅ Always query the `employees` table
//     const [results] = await db.query(`SELECT * FROM employees WHERE email = ?`, [username]);

//     if (results.length === 0) {
//       console.log('Invalid username or password.');
//       return res.status(401).json({ message: 'Invalid username or password.' });
//     }

//     const user = results[0];
//     // ✅ Check if the employee is active
//     if (user.status !== 1) {
//       console.log('Account inactive. Please contact admin.');
//       return res.status(403).json({ message: 'Account inactive. Please contact admin.' });
//     }

//     // ✅ Ensure role matches case-insensitively
//     if (user.role.toLowerCase() !== role.toLowerCase()) {
//       console.log('Role mismatch.');
//       return res.status(403).json({ message: 'Access denied: Incorrect role.' });
//     }

//     // ✅ Compare hashed password safely
//     try {
//       const isMatch = await bcrypt.compare(password.trim(), user.password.trim());

//       if (!isMatch) {
//         console.log('Invalid username or password.');
//         return res.status(401).json({ message: 'Invalid username or password.' });
//       }
//     } catch (error) {
//       console.error('Error comparing passwords:', error);
//       return res.status(500).json({ message: 'Server error' });
//     }

//     // ✅ Generate JWT Token
//     const token = jwt.sign(
//       { userId: user.id, role: user.role },
//       process.env.JWT_SECRET || 'defaultSecret', // Ensure this is set in your .env file!

//     );

//     console.log('Login successful:', username);
//     res.json({
//       token,
//       user: {
//         id: user.id,
//         fullName: user.fullName || '',
//         role: user.role,
//         img: user.uploadImg,
//         uploadImg: user.uploadImg,
//         email: user.email,
//         gender: user.gender,
//         leave_balance: user.leave_balance,
//         department: user.department,
//         employee_level: user.employee_level || 'Junior',
//       }
//     });

//   } catch (err) {
//     console.error('Error during authentication:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// --- FORGOT PASSWORD ROUTE ---



router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  console.log('Received login request:', req.body);

  if (!username || !password) {
    return res.status(400).json({
      message: 'Email and password are required'
    });
  }

  try {
    // Find user by email only.
    // Role is no longer required during login.
    const [results] = await db.query(
      `SELECT * FROM employees WHERE email = ?`,
      [username]
    );

    if (results.length === 0) {
      console.log('Invalid username or password.');
      return res.status(401).json({
        message: 'Invalid username or password.'
      });
    }

    const user = results[0];

    // Check if employee is active
    if (user.status !== 1) {
      console.log('Account inactive. Please contact admin.');

      return res.status(403).json({
        message: 'Account inactive. Please contact admin.'
      });
    }

    // Compare password
    try {
      const isMatch = await bcrypt.compare(
        password.trim(),
        user.password.trim()
      );

      if (!isMatch) {
        console.log('Invalid username or password.');

        return res.status(401).json({
          message: 'Invalid username or password.'
        });
      }
    } catch (error) {
      console.error('Error comparing passwords:', error);

      return res.status(500).json({
        message: 'Server error'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        department: user.department
      },
      process.env.JWT_SECRET || 'defaultSecret'
    );

    console.log('Login successful:', username);
    console.log('Role:', user.role);
    console.log('Department:', user.department);

    return res.json({
      token,

      user: {
        id: user.id,
        fullName: user.fullName || '',

        // New structure
        role: user.role,
        department: user.department,

        img: user.uploadImg,
        uploadImg: user.uploadImg,
        email: user.email,
        gender: user.gender,
        leave_balance: user.leave_balance,
        employee_level: user.employee_level || 'Junior'
      }
    });

  } catch (err) {
    console.error('Error during authentication:', err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
});
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    // Check if email exists in employees table
    const [results] = await db.query(`SELECT * FROM employees WHERE email = ?`, [email]);
    if (results.length === 0) return res.status(404).json({ message: 'Email not found' });

    const user = results[0];

    // Generate a reset token (JWT, expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'defaultSecret',
      { expiresIn: '1h' }
    );

    // Create reset link
    const resetLink = `https://portal.eliteinfotec.in/authentication/reset-password/${resetToken}`;

    // Styled Email Template
    const mailOptions = {
      from: '"Elite Infotec" <contact@eliteinfotec.in>',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background: #d6d5ea; padding: 20px; color: white;">
            <h2 style="margin: 0;">Password Reset Request</h2>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 16px; color: #333;">Dear ${user.fullName || 'Employee'},</p>
            <p style="font-size: 15px; color: #555;">
              We received a request to reset your password for your <strong>Eliteinfotec</strong> account.
            </p>

            <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0; text-align: center;">
              <a href="${resetLink}" style="display: inline-block; padding: 12px 20px; background: #00383F; color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px;">Reset Password</a>
            </div>

            <p style="font-size: 15px; color: #555;">
              This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
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

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ message: 'Password reset link sent to your email.' });
  } catch (err) {
    console.error('Error sending forgot password email:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// ------------------- Reset Password -------------------
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultSecret');
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query('UPDATE employees SET password = ? WHERE id = ?', [hashedPassword, decoded.userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token has expired' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
