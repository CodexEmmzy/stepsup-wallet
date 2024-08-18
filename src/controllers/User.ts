import { Request, Response, NextFunction } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { User } from "../entities/User";
import { TOKEN_PASSWORD } from "../tokens/password.token";
import crypto from "crypto";
import { BadRequestError, NotFoundError } from "../errors/CustomError";
import { ethers } from "ethers";
import { validateMnemonic } from "bip39"; // Import a function to validate mnemonics

const avt: any = process.env.TOKEN_CONTRACT_ADDRESS;
const staking: any = process.env.STAKING_CONTRACT_ADDRESS;
const tokenAbi = require("../../contract_abis/Advanteum.json");
const stakingAbi = require("../../contract_abis/Staking.json");
const provider = new ethers.providers.JsonRpcProvider(
  process.env.SEPOLIA_API_URL
);

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthTokenPayload {
  userId: string;
}

const generateAccessToken = (userId: string, email: string) => {
  return jwt.sign({ userId, email }, TOKEN_PASSWORD, { expiresIn: "1440m" }); // Access token with a 15-minute expiry
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      return next(new BadRequestError("Refresh token is required"));
    }

    // Validate refreshToken by finding the user associated with it
    const user = await User.findOne({ where: { refreshToken } });

    if (!user) {
      return next(new BadRequestError("Invalid refresh token"));
    }

    // Generate a new access token
    const newAccessToken = generateAccessToken(user.id, user.email);

    res.json({
      message: "Access token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Error refreshing access token:", error);
    next(error);
  }
};

export const renewRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      return next(new BadRequestError("Refresh token is required"));
    }

    // Validate the provided refresh token
    const user = await User.findOne({ where: { refreshToken } });

    if (!user) {
      return next(new BadRequestError("Invalid refresh token"));
    }

    // Generate a new refresh token
    const newRefreshToken = generateRefreshToken();

    // Update the user's refresh token in the database
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      message: "Refresh token renewed successfully",
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Error renewing refresh token:", error);
    next(error);
  }
};
export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new BadRequestError("Name, email, and password are required"));
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new BadRequestError("Invalid email format"));
  }

  try {
    // Check if the email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return next(new BadRequestError("Email already in use"));
    }

    const wallet = ethers.Wallet.createRandom();
    const hashedPassword = await argon2.hash(password);
    const id = crypto
      .createHash("sha256")
      .update(`${email}${Date()}${name}`)
      .digest("hex");

    const user = User.create({
      id,
      name,
      email,
      password: hashedPassword,
      address: wallet.address,
      private_key: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
      amount: "0",
    });

    await user.save();

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        mnemonic: user.mnemonic,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    next(error);
  }
};

export const loginLifeStyleController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new BadRequestError("Email and password are required"));
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return next(new NotFoundError("User not found"));
    }

    const isPasswordValid = await argon2.verify(user.password, password);

    if (!isPasswordValid) {
      return next(new BadRequestError("Invalid credentials"));
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      message: "User logged in successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        steps: user.steps,
        tokens: user.tokens,
        amount: user.amount,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    next(error);
  }
};

export const mnemonicLoginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, mnemonic } = req.body;

  if (!email || !mnemonic) {
    return next(new BadRequestError("Email and Mnemonic are required"));
  }

  if (!validateMnemonic(mnemonic)) {
    return next(new BadRequestError("Invalid mnemonic"));
  }

  try {
    const user = await User.findOne({ where: { email, mnemonic } });

    if (!user) {
      return next(
        new NotFoundError("User not found or mnemonic does not match")
      );
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      message: "Login successful with Mnemonic",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        steps: user.steps,
        tokens: user.tokens,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    next(error);
  }
};

export const findAllUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const userId = req.params.id;

  try {
    const user = await User.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    res.status(200).json({ message: "User found successfully", user });

    next();
  } catch (error) {
    console.error("Error retrieving user:", error);
    next(error);
  }
};

export const updateUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { userId } = req.params;
    const {
      name,
      username,
      profilePicture,
      description,
    }: {
      name: string;
      username: string;
      profilePicture: string;
      description: string;
    } = req.body;

    // Validate request body as needed

    const user: any = await User.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    user.name = name;
    user.username = username;
    user.profilePicture = profilePicture;
    user.description = description;
    await User.save(user);

    const updateUser: any = await User.findOne({ where: { id: userId } });
    if (
      updateUser.name === name &&
      updateUser.username === username &&
      updateUser.profilePicture === profilePicture &&
      updateUser.description === description
    ) {
      res.send(updateUser);
    } else {
      throw new Error("Error updating user");
    }

    next();
  } catch (error) {
    console.error("Error updating user");
    next(error);
  }
};

export const deleteUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { userId } = req.params;

    const user = await User.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }
    await User.remove(user);
    res.status(200).send({ message: "User deleted successfully" });
    next();
  } catch (error) {
    console.error("Error deleting user:", error);
    next(error);
  }
};

export const getStep = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const userId = req.params.id;
  let steps: number | undefined;

  try {
    const user = await User.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: `User with ID ${userId} not found` });
    }

    steps = user?.steps;
    res.status(201).json({ message: "Total steps taken by user", steps });

    next();
  } catch (error) {
    console.error("Error retrieving data:", error);
    next(error);
  }
};

export const stepToTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const user: any = req?.user;
    console.log("user", user);

    if (!user) {
      throw new NotFoundError(`User with ID ${user.id} not found`);
    }

    const steps: number = 50000; // This value should come from the request or calculated
    const converted_amount = Math.floor(steps / 5000);

    user.tokens += converted_amount;
    await user.save();
    const token_balance = user.tokens;

    console.log("user", user);
    console.log("accessToken", user.tokens);

    res.status(201).json({
      message: "Steps successfully converted",
      converted_amount,
      token_balance,
    });

    next();
  } catch (error) {
    console.error("Error converting steps to tokens:", error);
    next(error); // Pass the error to the error-handling middleware
  }
};

export const mintingController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { amount }: { amount: string } = req.body;
    const user: any = req?.user;

    if (!amount) {
      return next(new BadRequestError("Amount is required"));
    }

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if the user has enough tokens for minting
    let tokenBalance = BigInt(user.tokens);
    if (tokenBalance < BigInt(amount)) {
      return next(new BadRequestError("Insufficient token balance"));
    }

    const wallet = new ethers.Wallet(user.private_key, provider);
    const contract = new ethers.Contract(avt, tokenAbi.abi, provider);
    const Contract = contract.connect(wallet);
    const amt = ethers.utils.parseUnits(amount, 18);

    // Call the mint function of the smart contract to mint tokens
    const tx = await Contract.mint(amt);
    await tx.wait();

    // Deduct the minted amount from the token balance and update the user's amount
    user.tokens = (tokenBalance - BigInt(amount)).toString();
    user.amount = (BigInt(user.amount) + BigInt(amount)).toString();
    await user.save();

    console.log("Updated user after minting: ", user);

    // Return success response with transaction hash
    res.status(200).json({ message: "Tokens minted successfully", transactionHash: tx.hash });
    next();
  } catch (error) {
    console.error("Error minting tokens:", error);
    next(error); // Pass the error to the error-handling middleware
  }
};

export const transferByAddressController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { recipientWallet, amount } = req.body;

  if (!recipientWallet || !amount) {
    return next(new BadRequestError("Recipient wallet and amount are required"));
  }

  try {
    const sender: any = await req?.user;
    if (!sender) {
      throw new NotFoundError("Sender not found");
    }

    if (BigInt(sender.amount) < BigInt(amount)) {
      throw new BadRequestError("Insufficient balance");
    }

    const recipient = await User.findOne({ where: { address: recipientWallet } });
    if (!recipient) {
      throw new NotFoundError("Recipient not found");
    }

    const wallet = new ethers.Wallet(sender.private_key, provider);
    const contract = new ethers.Contract(avt, tokenAbi.abi, provider);
    const Contract = contract.connect(wallet);
    const amt = ethers.utils.parseUnits(amount, 18);

    // Call the transfer function of the smart contract to transfer tokens
    const tx = await Contract.transfer(recipient.address, amt);
    await tx.wait();

    // Update sender's balance using BigInt for accurate calculations
    sender.amount = (BigInt(sender.amount) - BigInt(amount)).toString();
    await sender.save();

    // Update recipient's balance
    recipient.amount = (BigInt(recipient.amount) + BigInt(amount)).toString();
    await recipient.save();

    // Construct receipt
    const receipt = {
      sender: sender.address,
      recipient: recipient.address,
      amount: amount,
      senderBalance: sender.amount,
      transactionHash: tx.hash, // Add the transaction hash to the receipt
    };

    res.json({ message: "Transfer successful", receipt });
    next();
  } catch (error) {
    console.error("Error transferring funds:", error);
    next(error);
  }
};

export const transferByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { recipientId, amount } = req.body;

  if (!recipientId || !amount) {
    return next(new BadRequestError("Recipient Id and amount are required"));
  }

  try {
    const sender: any = await req?.user;
    if (!sender) {
      throw new NotFoundError("Sender not found");
    }

    if (BigInt(sender.amount) < BigInt(amount)) {
      throw new BadRequestError("Insufficient balance");
    }

    const recipient = await User.findOne({ where: { id: recipientId } });
    if (!recipient) {
      throw new NotFoundError("Recipient not found");
    }

    const wallet = new ethers.Wallet(sender.private_key, provider);
    const contract = new ethers.Contract(avt, tokenAbi.abi, provider);
    const Contract = contract.connect(wallet);
    const amt = ethers.utils.parseUnits(amount, 18);

    // Call the transfer function of the smart contract to transfer tokens
    const tx = await Contract.transfer(recipient.address, amt);
    await tx.wait();

    // Update sender's balance using BigInt for accurate calculations
    sender.amount = (BigInt(sender.amount) - BigInt(amount)).toString();
    await sender.save();

    // Update recipient's balance
    recipient.amount = (BigInt(recipient.amount) + BigInt(amount)).toString();
    await recipient.save();

    // Construct receipt
    const receipt = {
      sender: sender.address,
      recipient: recipient.address,
      amount: amount,
      senderBalance: sender.amount,
      transactionHash: tx.hash, // Add the transaction hash to the receipt
    };

    res.json({ message: "Transfer successful", receipt });
    next();
  } catch (error) {
    console.error("Error transferring funds:", error);
    next(error);
  }
};


export const stakingController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { amount, duration } = req.body;

  try {
    if (!duration || !amount) {
      return next(new BadRequestError("Duration and amount are required"));
    }

    const user: any = req?.user;
    console.log("user", user);

    if (!user) {
      throw new NotFoundError(`User not found`);
    }

    // Check if the user has enough balance for staking
    let tokenBalance = BigInt(user.amount);
    if (tokenBalance < BigInt(amount)) {
      throw new BadRequestError(`Insufficient balance`);
    }

    // Check if the duration is valid (3, 6, or 12 months)
    if (![3, 6, 12].includes(duration)) {
      throw new BadRequestError(`Invalid staking duration`);
    }

    // Interacting with the token contract
    const tknWallet = new ethers.Wallet(user.private_key, provider);
    const tknContract = new ethers.Contract(avt, tokenAbi.abi, provider);
    const TknContract = tknContract.connect(tknWallet);
    const amt = ethers.utils.parseUnits(amount, 18);

    // Approve staking contract to use the tokens
    const txn = await TknContract.approve(staking, amt);
    await txn.wait();

    // Interacting with the staking contract
    const wallet = new ethers.Wallet(user.private_key, provider);
    const contract = new ethers.Contract(staking, stakingAbi.abi, provider);
    const Contract = contract.connect(wallet);
    const tkn = ethers.utils.parseUnits(amount, 18);

    // Call the stake function of the smart contract to stake tokens
    const tx = await Contract.stake(tkn, {
      gasLimit: ethers.utils.hexlify(3000000),
    });
    const receipt = await tx.wait();

    // Update the user's balance
    user.amount = (tokenBalance - BigInt(amount)).toString();
    await user.save();

    res.status(200).json({
      message: "Tokens staked successfully",
      transactionHash: receipt.transactionHash,
    });
    next();
  } catch (error) {
    console.error("Error staking amount:", error);
    next(error);
  }
};
