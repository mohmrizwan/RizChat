import express from "express";
import {
  createUser,
  getAllUsers,
  loginUser,
  Logout,
} from "../controllers/userController.js";
const router = express.Router();

router.post("/createAccount", createUser);
router.post("/login", loginUser);
router.post("/logout", Logout);
router.get("/allUsers", getAllUsers)

export default router;
