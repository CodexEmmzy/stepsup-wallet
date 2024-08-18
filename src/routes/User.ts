import express from "express";
import {
  deleteUserController,
  loginLifeStyleController,
  mintingController,
  mnemonicLoginController,
  refreshAccessToken,
  registerController,
  renewRefreshToken,
  stakingController,
  stepToTokenController,
  updateUserController,
} from "../controllers/User";
import {
  transferByAddressController,
  transferByIdController,
  findAllUserController,
} from "../controllers/User";
import { auth } from "../middlewares/userAuthorization";
const router = express.Router();

router.post("/login/lifestyle", loginLifeStyleController);
router.post("/login/wallet", mnemonicLoginController);
router.post("/register", registerController);
router.post("/transfer/wallet", auth, transferByAddressController);
router.post("/transfer/id", auth, transferByIdController);
router.post("/minting", auth, mintingController);
router.get("/stepToToken", auth, stepToTokenController);
router.post("/staking", auth, stakingController);
router.get("/:id", auth, findAllUserController);
router.put("/update/:id", auth, updateUserController);
router.delete("/delete/:id", auth, deleteUserController);
router.post("/refresh-token", refreshAccessToken); 
router.post("/renew-refresh-token", renewRefreshToken);

module.exports = router;
