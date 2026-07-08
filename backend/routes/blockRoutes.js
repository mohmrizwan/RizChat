import express from "express";
import isLoggedin from "../middleware/isLoggedIn.js";
import { blockUser, checkBlockStatus, unblockUser } from "../controllers/blockController.js";

const router = express.Router();

router.post("/userBlock", isLoggedin, blockUser);
router.get("/status/:receiverId", isLoggedin, checkBlockStatus);
router.post("/unblockUser/:receiverId", isLoggedin, unblockUser);

export default router;
