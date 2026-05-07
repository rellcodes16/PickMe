const bcrypt = require('bcryptjs')

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12)
}

const comparePassword = async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword)
}

module.exports = { hashPassword, comparePassword }