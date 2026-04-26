const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const nodemailer = require('nodemailer');

// Email configuration (using Gmail for demo)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// GET /forgot-password - Show forgot password form
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { title: 'Forgot Password' });
});

// POST /forgot-password - Handle forgot password request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error_msg', 'No account with that email address exists.');
      return res.redirect('/forgot-password');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token and expiry (1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset URL
    const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

    // Send email (in production, you'd use a real email service)
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@fitlive.com',
        to: user.email,
        subject: 'FitLive - Password Reset Request',
        html: `
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset for your FitLive account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetURL}" style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Thanks,<br>FitLive Team</p>
        `
      };

      await transporter.sendMail(mailOptions);
      
      // Password reset link sent successfully
      req.flash('success_msg', 'Password reset link sent! Check your email.');
      res.redirect('/forgot-password');
      
    } catch (emailError) {
      console.error('Email error:', emailError);
      req.flash('error_msg', 'Error sending reset email. Please try again.');
      res.redirect('/forgot-password');
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    req.flash('error_msg', 'Something went wrong. Please try again.');
    res.redirect('/forgot-password');
  }
});

// GET /reset-password/:token - Show reset password form
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Hash the token to compare with stored token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash('error_msg', 'Password reset link is invalid or has expired.');
      return res.redirect('/forgot-password');
    }

    res.render('reset-password', { 
      title: 'Reset Password', 
      token: token 
    });

  } catch (error) {
    console.error('Reset password page error:', error);
    req.flash('error_msg', 'Something went wrong. Please try again.');
    res.redirect('/forgot-password');
  }
});

// POST /reset-password/:token - Handle password reset
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Validate passwords match
    if (password !== confirmPassword) {
      req.flash('error_msg', 'Passwords do not match.');
      return res.redirect(`/reset-password/${token}`);
    }

    // Hash the token to compare with stored token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash('error_msg', 'Password reset link is invalid or has expired.');
      return res.redirect('/forgot-password');
    }

    // Update password and clear reset fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash('success_msg', 'Password reset successfully! Please login with your new password.');
    res.redirect('/login');

  } catch (error) {
    console.error('Reset password error:', error);
    req.flash('error_msg', 'Something went wrong. Please try again.');
    res.redirect('/forgot-password');
  }
});

module.exports = router;
