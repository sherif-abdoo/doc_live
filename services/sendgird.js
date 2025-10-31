const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


async function sendOTPEmail(email,otp){
    const msg ={
        to: email,
        from: "mostpha.mo2006@gmail.com",
        subject: "Password Reset OTP",
        text: `Your OTP for password reset is ${otp}. It will expire in 5 minutes.`,
        html: `<p>Your one-time password (OTP) to reset your account password is:</p>
            <h2 style="background:#f3f4f6; padding:10px; border-radius:6px; display:inline-block;">${otp}</h2>
            <p>This code will expire in <strong>5 minutes</strong>.</p>
            <p>If you didn't request this, please ignore this email.</p>
            `

    }
    await sgMail.send(msg);
}

module.exports = { 
    sendOTPEmail,
}