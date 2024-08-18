import jwt from "jsonwebtoken";
import { TOKEN_PASSWORD } from "../tokens/password.token";

export const saltRound = 10;


export const generateSessionToken = (userId: string): string => {
    const expiration = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 5 days expiration
    return jwt.sign({ userId, exp: expiration }, TOKEN_PASSWORD as jwt.Secret);
  };