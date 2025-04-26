const mongoose = require('mongoose')
const dotenv  = require('dotenv')

const path = require("path");
require(path.join(__dirname, "utils", "cronJobs"));


process.on('uncaughtException', err => {
    console.log('UNHANDLED EXCEPTION: Shutting down...')
    console.log(err.name, err.message)
    process.exit(1)
})

dotenv.config({ path: './.env'})

const app = require('./app')

const DB = process.env.DATABASE.replace(
    '<password>',
    process.env.DATABASE_PASSWORD
);

console.log(DB)

mongoose.connect(DB)
.then(() => {
    console.log('DB connection successful');
})
.catch((err) => {
    console.error('Error connecting to the database:', err);
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

