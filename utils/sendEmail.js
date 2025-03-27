const nodemailer = require('nodemailer')

const sendEmail = async options => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'devrellmara@gmail.com',
            pass: process.env.EMAIL_PASS
        }
    })

    const mailOptions = {
        from: 'PickMe <devrellmara@gmail.com',
        to: options.email,
        subject: options.subject,
        text: options.message
    }

    console.log(mailOptions)

    await transporter.sendMail(mailOptions)
}

module.exports = sendEmail