const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: process.env.SMTP_PORT || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * 发送验证码邮件
 * @param {string} to 接收方邮箱
 * @param {string} code 验证码
 */
const sendVerifyCode = async (to, code) => {
  const mailOptions = {
    from: `"职引星系统" <${process.env.SMTP_USER}>`,
    to,
    subject: '【职引星】登录验证码',
    html: `
      <div style="background-color: #f6f9fc; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">职引星 · 身份核验</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">您好！</p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">您正在尝试登录“职引星”智能校园招聘平台。请使用以下验证码完成核验：</p>
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <span style="font-size: 36px; font-weight: 900; color: #4f46e5; letter-spacing: 12px; margin-left: 12px;">${code}</span>
            </div>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">该验证码将在 5 分钟后失效。为了保障您的账号安全，请勿将验证码转发给他人。</p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="color: #cbd5e1; font-size: 12px; margin: 0;">© 2024 职引星 · AI 驱动校园招聘新范式</p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[mailUtils] Email sent: ' + info.messageId);
    return true;
  } catch (err) {
    console.error('[mailUtils] Error sending email:', err);
    throw err;
  }
};

module.exports = {
  sendVerifyCode,
};
