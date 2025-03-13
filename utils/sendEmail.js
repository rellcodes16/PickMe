const nodemailer = require('nodemailer')

const sendEmail = async options => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'amarrell94@gmail.com',
            pass: process.env.PASS
        }
    })

    const mailOptions = {
        from: 'PickMe <amarrell94@gmail.com',
        to: options.email,
        subject: options.subject,
        text: options.message
    }

    console.log(mailOptions)

    await transporter.sendMail(mailOptions)
}

module.exports = sendEmail