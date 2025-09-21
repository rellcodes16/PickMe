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

app.use(cookieParser())

const corsOptions = {
    origin: ['http://localhost:5173','https://pickme-trz3.onrender.com'],
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

// Swagger docs route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.get('/', (req, res) => {
    res.status(200).send('Hello World!!')
})

app.get('/api/v1/auth/test', (req, res) => {
    res.status(200).send('Test route is working');
});


app.use('/api/v1/auth', authRouter)
app.use('/api/v1/org', orgRouter)
app.use('/api/v1/invitation', invitationRouter)
app.use('/api/v1/votingsess', votingSessRouter)
app.use('/api/v1/notification', notificationRouter)
app.use('/api/v1/candidate', candidateRouter)
app.use('/api/v1/vote', voteRouter)
app.use('/api/v1/result', resultRouter)

module.exports = app;