const express = require('express')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const path = require('path')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const favicon = require('serve-favicon')

const authRouter = require('./routes/authRoutes')
const orgRouter = require('./routes/orgRoutes')
const invitationRouter = require('./routes/invitationRoutes')

const app = express()

app.use(helmet())

app.use(cookieParser())

const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
}

app.use(cors(corsOptions))

if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'))
}

const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000, 
    message: 'Too many requests from this IP, please try again after an hour',
});


app.use('/api', limiter)

app.use(express.json({limit: '10kb'}))

app.use(mongoSanitize())

app.use(xss())

app.use((req, res, next) => {
    req.requestTime = new Date().toISOString()
    console.log(req.requestTime)

    next()
})

app.use((req, res, next) => {
    console.log('Cookies: ', req.cookies)

    next()
})

app.get('/', (req, res) => {
    res.status(200).send('Hello World!!')
})

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/org', orgRouter)
app.use('/api/v1/invitation', invitationRouter)

module.exports = app;