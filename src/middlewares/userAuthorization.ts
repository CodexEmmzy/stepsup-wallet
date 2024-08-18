import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { User } from "../entities/User";
import { TOKEN_PASSWORD } from "../tokens/password.token";
import { BadRequestError, NotFoundError } from "../errors/CustomError";

declare global {
  namespace Express {
    interface Request {
      user?: User; // Define the user property on the Request interface
    }
  }
}

export interface AuthTokenPayload {
  userId: string;
}

export const auth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      throw new BadRequestError("Authorization header is missing");

    }
    const tokenParts = header.split(" ");

    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      throw new BadRequestError("Invalid authorization header format");
    }

    const token = tokenParts[1];

    if (!token) {
      throw new BadRequestError("Token is missing");
    }

    const decodedToken = jwt.verify(token, TOKEN_PASSWORD) as AuthTokenPayload;

    if (!decodedToken)  {
      throw new BadRequestError("Token has expired");
    }

    const user = await User.findOne({ where: { id: decodedToken.userId } });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    req.user = user; 

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    next(error); // Pass the error to the error handler
  }
};

