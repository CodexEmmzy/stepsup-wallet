import { Request, Response } from "express";
import { AppDataSource } from "./dataConnection";
const userRoutes = require('./routes/User');
const express = require('express');
const bodyParser = require('body-parser');
// import { json } from "body-parser";
import { errorHandler } from "./middlewares/error";
import "express-async-errors"; 

const app = express();
const port = 3000;


app.use(bodyParser.json());
app.get("/", (_req: Request, res: Response) => {
    res.send("Hello World!");
})

app.use(express.json());

// Error handling
app.use(errorHandler);

app.use("/api/v1/user", userRoutes)


AppDataSource.initialize()
  .then(() => {
    console.log("Database connected");
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });