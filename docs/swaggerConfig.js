const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Voting App API",
      version: "1.0.0",
      description: "API documentation for the voting app",
    },
    servers: [{ url: "http://localhost:3000/api/v1" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [
    path.join(__dirname, "../routes/*.js"),  
    path.join(__dirname, "./*.js"),           
  ],
};  

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
