import express from "express";
import {
  createUser,
  getAllUsers,
  loginUser,
  Logout,
  updateUser,
  getProfile,
} from "../controllers/userController.js";
import isLoggedIn from "../middleware/isLoggedIn.js";
import upload from "../middleware/multer.js";
const router = express.Router();

router.post("/createAccount", createUser);
router.post("/login", loginUser);
router.post("/logout", Logout);
router.put("/updateProfile", isLoggedIn, upload.single("profilePic"), updateUser);
router.get("/allUsers", isLoggedIn, getAllUsers);
router.get("/profile", isLoggedIn, getProfile);

export default router;
