import express from "express";
import {
  sendMessage,
  getMessages,
  seenMessages,
  deleteMessage,
} from "../controllers/messageControllers.js";
import isLoggedIn from "../middleware/isLoggedIn.js";

const router = express.Router();

router.post("/sendMessage", isLoggedIn, sendMessage);
router.get("/getMessages/:roomId", isLoggedIn, getMessages);
router.put("/seen/:roomId", isLoggedIn, seenMessages);
router.delete("/deleteMessage/:messageId",isLoggedIn, deleteMessage);

export default router;
