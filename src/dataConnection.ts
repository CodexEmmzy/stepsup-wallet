import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { User } from "./entities/User";

dotenv.config()

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  // ssl: true,
  entities: [User],
  synchronize: true,
});
