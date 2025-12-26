const nodemailer = require('nodemailer');

/**
 * Email Service Utility Functions
 */
class EmailUtils {

  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialize email transporter
  initializeTransporter() {
    try {
      // Check if SMTP credentials are configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS ||
        process.env.SMTP_USER === 'your-email@gmail.com' ||
        process.env.SMTP_PASS === 'your-app-specific-password') {
        console.warn('📧 Email service not configured. SMTP credentials missing or using default values.');
        console.warn('   To enable email features, update SMTP_USER and SMTP_PASS in your .env file');
        this.transporter = null;
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      console.log('📧 Email transporter initialized successfully');
    } catch (error) {
      console.error('📧 Email transporter initialization failed:', error.message);
      this.transporter = null;
    }
  }

  // Send OTP email
  async sendOTPEmail(email, otp, userName = '') {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      const mailOptions = {
        from: {
          name: 'Wellio Diet Tracker',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Your Wellio Login OTP',
        html: this.generateOTPEmailTemplate(otp, userName),
        text: `Your Wellio login OTP is: ${otp}. This OTP will expire in 5 minutes. Please do not share this OTP with anyone.`
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Failed to send OTP email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email, userName = '') {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      const mailOptions = {
        from: {
          name: 'Wellio Diet Tracker',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Welcome to Wellio!',
        html: this.generateWelcomeEmailTemplate(userName),
        text: `Welcome to Wellio! We're excited to help you on your diet tracking journey.`
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Failed to send welcome email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Generate OTP email template
  generateOTPEmailTemplate(otp, userName = '') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wellio Login Code</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        .header {
            background: linear-gradient(135deg, #A8C5BE 0%, #8BB3A3 100%);
            padding: 40px 20px;
            text-align: center;
        }
        
        .logo {
            max-width: 100px;
            margin: 0 auto 16px;
        }
        
        .header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 300;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }
        
        .header p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            letter-spacing: 1px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
            font-weight: 500;
        }
        
        .body-text {
            font-size: 14px;
            color: #555;
            margin-bottom: 20px;
            line-height: 1.8;
        }
        
        .otp-box {
            background-color: #f9fdf9;
            border: 2px solid #A8C5BE;
            border-radius: 8px;
            padding: 32px;
            text-align: center;
            margin: 32px 0;
        }
        
        .otp-label {
            color: #888;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 16px;
            font-weight: 600;
        }
        
        .otp-code {
            font-family: 'Courier New', monospace;
            font-size: 48px;
            font-weight: 700;
            color: #A8C5BE;
            letter-spacing: 6px;
            margin: 16px 0;
            word-break: break-all;
        }
        
        .otp-expiry {
            color: #999;
            font-size: 13px;
            margin-top: 12px;
        }
        
        .security-box {
            background-color: #f0f8f6;
            border-left: 4px solid #A8C5BE;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
        }
        
        .security-title {
            color: #A8C5BE;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .security-text {
            color: #555;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .warning-text {
            color: #d32f2f;
            font-size: 13px;
            margin-top: 10px;
            font-weight: 600;
        }
        
        .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 30px 0;
        }
        
        .footer {
            background-color: #f9fdf9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #777;
        }
        
        .footer-link {
            color: #A8C5BE;
            text-decoration: none;
            margin: 0 10px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/wellio_logo_v1-oZeGUjOIINIw0jrf35W91kgKcJpKmS.png" alt="Wellio Logo" class="logo">
            <h1>WELLIO</h1>
            <p>Login Verification</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <p class="greeting">${userName ? `Hi ${userName},` : 'Hello,'}</p>
            
            <p class="body-text">
                You've requested to log into your Wellio account. Use the code below to complete your login. This code is valid for 5 minutes.
            </p>
            
            <div class="otp-box">
                <div class="otp-label">Your Login Code</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-expiry">Valid for 5 minutes</div>
            </div>
            
            <div class="security-box">
                <div class="security-title">Security Reminder</div>
                <div class="security-text">
                    Never share this code with anyone. Wellio staff will never ask for your code via email or phone.
                </div>
                <div class="warning-text">
                    If you didn't request this code, you can safely ignore this email or contact support immediately.
                </div>
            </div>
            
            <div class="divider"></div>
            
            <p class="body-text">
                Need help? Our support team is here for you. Visit our help center or contact support@wellio.com.
            </p>
            
            <p class="body-text">
                Warm regards,<br>
                <strong>The Wellio Team</strong>
            </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p style="margin-bottom: 15px;">© 2025 Wellio. All rights reserved.</p>
            <p>
                <a href="#" class="footer-link">Help Center</a>
                <a href="#" class="footer-link">Privacy Policy</a>
                <a href="#" class="footer-link">Contact Support</a>
            </p>
            <p style="margin-top: 15px; font-size: 11px; color: #999;">This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>

    `;
  }

  // Generate welcome email template
  generateWelcomeEmailTemplate(userName = '') {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Wellio</title>
          <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }
              
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  background-color: #f5f5f5;
              }
              
              .email-container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
              }
              
              .header {
                  background: linear-gradient(135deg, #A8C5BE 0%, #8BB3A3 100%);
                  padding: 40px 20px;
                  text-align: center;
              }
              
              .logo {
                  max-width: 120px;
                  margin: 0 auto 20px;
              }
              
              .header h1 {
                  color: #ffffff;
                  font-size: 32px;
                  font-weight: 300;
                  letter-spacing: 2px;
                  margin-bottom: 10px;
              }
              
              .header p {
                  color: rgba(255, 255, 255, 0.9);
                  font-size: 14px;
                  letter-spacing: 1px;
              }
              
              .content {
                  padding: 40px 30px;
              }
              
              .greeting {
                  font-size: 18px;
                  color: #333;
                  margin-bottom: 20px;
                  font-weight: 500;
              }
              
              .body-text {
                  font-size: 14px;
                  color: #555;
                  margin-bottom: 20px;
                  line-height: 1.8;
              }
              
              .features {
                  background-color: #f9fdf9;
                  border-left: 4px solid #A8C5BE;
                  padding: 20px;
                  margin: 30px 0;
                  border-radius: 4px;
              }
              
              .features-title {
                  color: #A8C5BE;
                  font-size: 16px;
                  font-weight: 600;
                  margin-bottom: 15px;
              }
              
              .feature-item {
                  display: flex;
                  margin-bottom: 12px;
                  font-size: 14px;
                  color: #555;
              }
              
              .feature-dot {
                  color: #A8C5BE;
                  margin-right: 12px;
                  font-weight: bold;
                  min-width: 20px;
              }
              
              .cta-button {
                  display: inline-block;
                  background-color: #A8C5BE;
                  color: #ffffff;
                  padding: 14px 40px;
                  text-decoration: none;
                  border-radius: 4px;
                  font-size: 14px;
                  font-weight: 600;
                  letter-spacing: 0.5px;
                  margin: 30px 0;
                  transition: background-color 0.3s ease;
              }
              
              .cta-button:hover {
                  background-color: #8BB3A3;
              }
              
              .footer {
                  background-color: #f9fdf9;
                  padding: 30px;
                  text-align: center;
                  border-top: 1px solid #e0e0e0;
                  font-size: 12px;
                  color: #777;
              }
              
              .footer-link {
                  color: #A8C5BE;
                  text-decoration: none;
                  margin: 0 10px;
              }
              
              .divider {
                  height: 1px;
                  background-color: #e0e0e0;
                  margin: 30px 0;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <!-- Header -->
              <div class="header">
                  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/wellio_logo_v1-oZeGUjOIINIw0jrf35W91kgKcJpKmS.png" alt="Wellio Logo" class="logo">
                  <h1>WELLIO</h1>
                  <p>Your wellness journey starts here</p>
              </div>
              
              <!-- Content -->
              <div class="content">
                  <p class="greeting">${userName ? `Welcome, ${userName}!` : 'Welcome!'} 👋</p>
                  
                  <p class="body-text">
                      Thank you for joining Wellio. We're thrilled to have you on board as part of our growing wellness community. Whether you're looking to improve your daily habits, track your progress, or connect with others on their wellness journey, you're in the right place.
                  </p>
                  
                  <div class="features">
                      <div class="features-title">✨ Here's what you can do:</div>
                      <div class="feature-item">
                          <span class="feature-dot">•</span>
                          <span>Create personalized wellness goals tailored to your needs</span>
                      </div>
                      <div class="feature-item">
                          <span class="feature-dot">•</span>
                          <span>Track your daily habits and celebrate your progress</span>
                      </div>
                      <div class="feature-item">
                          <span class="feature-dot">•</span>
                          <span>Connect with a supportive community of wellness enthusiasts</span>
                      </div>
                      <div class="feature-item">
                          <span class="feature-dot">•</span>
                          <span>Access personalized insights and recommendations</span>
                      </div>
                  </div>
                  
                  <p class="body-text">
                      We've designed Wellio to make wellness simple, accessible, and enjoyable. Everything you need is just a few clicks away.
                  </p>
                  
                  <div style="text-align: center;">
                      <a href="${process.env.APP_URL}" class="cta-button">Get Started</a>
                  </div>
                  
                  <div class="divider"></div>
                  
                  <p class="body-text">
                      Have questions? Our support team is here to help. Just reply to this email or visit our help center.
                  </p>
                  
                  <p class="body-text">
                      Here's to your wellness journey! 🌿
                      <br><br>
                      <strong>The Wellio Team</strong>
                  </p>
              </div>
              
              <!-- Footer -->
              <div class="footer">
                  <p style="margin-bottom: 15px;">© 2025 Wellio. All rights reserved.</p>
                  <p>
                      <a href="#" class="footer-link">Settings</a>
                      <a href="#" class="footer-link">Privacy Policy</a>
                      <a href="#" class="footer-link">Contact</a>
                  </p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  // Send anonymous email template
  async sendAnonymousEmail(email) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      const mailOptions = {
        from: {
          name: 'Wellio Diet Tracker',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Welcome to Wellio',
        html: this.generateAnonymousEmailTemplate(),
        text: 'Thank you for your interest in Wellio. We will be in touch soon!'
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Anonymous email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Failed to send anonymous email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Generate anonymous email template (placeholder - to be customized later)
  generateAnonymousEmailTemplate() {
    // TODO: Add custom email template here
    return `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to WELLIO</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #F9F8F6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F9F8F6;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden;" class="email-container">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #A8C5BE; padding: 32px 40px; text-align: center;">
                            <img src="https://i.ibb.co/HD80cJrF/landscape.png" alt="WELLIO" style="max-width: 200px; height: auto; display: block; margin: 0 auto;">
                        </td>
                    </tr>

                    <!-- Hero Section -->
                    <tr>
                        <td style="padding: 48px 40px 32px; text-align: center;">
                            <h1 style="margin: 0 0 12px; font-size: 32px; font-weight: 600; color: #333333; line-height: 1.3;">Welcome to WELLIO 👋</h1>
                            <p style="margin: 0; font-size: 18px; color: #666666; line-height: 1.5;">You're officially on the early access list.</p>
                        </td>
                    </tr>

                    <!-- Intro Copy -->
                    <tr>
                        <td style="padding: 0 40px 32px;">
                            <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.6; text-align: center;">WELLIO helps you follow nutritionist- or trainer-prescribed diet plans through time-based meal reminders, simple meal check-ins, and calorie tracking.</p>
                        </td>
                    </tr>

                    <!-- Feature Highlights -->
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="background-color: #F9F8F6; border-radius: 8px; padding: 24px; margin-bottom: 12px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="font-size: 24px; padding-right: 16px; vertical-align: middle; width: 32px;">⏰</td>
                                                <td style="font-size: 16px; color: #333333; line-height: 1.5; vertical-align: middle;">Time-based meal reminders</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 12px;">
                                <tr>
                                    <td style="background-color: #F9F8F6; border-radius: 8px; padding: 24px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="font-size: 24px; padding-right: 16px; vertical-align: middle; width: 32px;">✅</td>
                                                <td style="font-size: 16px; color: #333333; line-height: 1.5; vertical-align: middle;">Easy meal check-ins (Yes / Not Yet / Skipped)</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 12px;">
                                <tr>
                                    <td style="background-color: #F9F8F6; border-radius: 8px; padding: 24px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="font-size: 24px; padding-right: 16px; vertical-align: middle; width: 32px;">📊</td>
                                                <td style="font-size: 16px; color: #333333; line-height: 1.5; vertical-align: middle;">Daily calorie & progress tracking</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Coming Soon Section -->
                    <tr>
                        <td style="padding: 0 40px 32px; text-align: center;">
                            <div style="background-color: #EEF4F2; border-radius: 8px; padding: 24px;">
                                <p style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #333333; line-height: 1.5;">WELLIO is launching soon on web & mobile.</p>
                                <p style="margin: 0; font-size: 15px; color: #666666; line-height: 1.5;">As an early access member, you'll be among the first to try WELLIO.</p>
                            </div>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 0 40px 48px; text-align: center;">
                            <a href="${process.env.APP_URL}" style="display: inline-block; background-color: #A8C5BE; color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; line-height: 1.5;">Stay on the Early Access List</a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 40px; border-top: 1px solid #E5E5E5; text-align: center;">
                            <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.5; font-style: italic;">"Consistency beats motivation."</p>
                            <p style="margin: 0 0 8px; font-size: 13px; color: #999999; line-height: 1.5;">You received this email because you signed up for updates from WELLIO.</p>
                            <p style="margin: 0; font-size: 13px; line-height: 1.5;"><a href="#" style="color: #A8C5BE; text-decoration: underline;">Unsubscribe</a></p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>

    `;
  }

  // Test email connection
  async testConnection() {
    try {
      if (!this.transporter) {
        return { success: false, error: 'Email service not configured' };
      }

      await this.transporter.verify();
      return { success: true, message: 'Email service is ready' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new EmailUtils();