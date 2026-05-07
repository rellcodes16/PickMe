const dotenv = require('dotenv')
const path = require("path");

process.on('uncaughtException', err => {
    console.log('UNHANDLED EXCEPTION: Shutting down...')
    console.log(err.name, err.message)
    process.exit(1)
})

dotenv.config({ path: './.env'})

const app = require('./app')
const prisma = require('./src/config/prisma') 

require(path.join(__dirname, "utils", "cronJobs"));

prisma.$connect()
    .then(() => {
        console.log('DB connection successful');
    })
    .catch((err) => {
        console.error('Error connecting to the database:', err);
        process.exit(1)
    });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`)
});

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION: Shutting down...')
    console.log(err.name, err.message)
    server.close(() => {
        process.exit(1)
    })
})