const express = require('express')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swaggerConfig");

const authRouter = require('./routes/authRoutes')
const orgRouter = require('./routes/orgRoutes')
const invitationRouter = require('./routes/invitationRoutes')
const votingSessRouter = require('./routes/votingSessRoutes')
const notificationRouter = require('./routes/notificationRoutes')
const candidateRouter = require('./routes/candidateRoutes')
const voteRouter = require('./routes/voteRoutes')
const resultRouter = require('./routes/resultRoutes')

const app = express()

app.use(helmet())

const corsOptions = {
    origin: ['http://localhost:5173', 'https://pickme-trz3.onrender.com'],
    credentials: true,
}
app.use(cors(corsOptions))

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again after an hour',
    standardHeaders: true, 
    legacyHeaders: false,
});
app.use('/api', limiter)

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10,
    message: 'Too many attempts, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/v1/auth/login', authLimiter)
app.use('/api/v1/auth/signup', authLimiter)
app.use('/api/v1/auth/forgotPassword', authLimiter)

app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

app.use(mongoSanitize()) 
app.use(xss())          
app.use(hpp())          

app.use((req, res, next) => {
    req.requestTime = new Date().toISOString()
    next()
})

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
    res.status(200).json({ status: 'success', message: 'PickMe API is running' })
})

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/org', orgRouter)
app.use('/api/v1/invitation', invitationRouter)
app.use('/api/v1/votingsess', votingSessRouter)
app.use('/api/v1/notification', notificationRouter)
app.use('/api/v1/candidate', candidateRouter)
app.use('/api/v1/vote', voteRouter)
app.use('/api/v1/result', resultRouter)

app.all('*', (req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server`
    })
})

app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'

    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            stack: err.stack,
            error: err
        })
    } else {
        const isOperational = err.isOperational

        res.status(err.statusCode).json({
            status: err.status,
            message: isOperational ? err.message : 'Something went wrong'
        })
    }
})

module.exports = app;