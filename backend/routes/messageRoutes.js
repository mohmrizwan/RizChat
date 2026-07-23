import express from "express";
import {
  sendMessage,
  getMessages,
  seenMessages,
  deleteMessage,
  editMessage,
} from "../controllers/messageControllers.js";
import isLoggedIn from "../middleware/isLoggedIn.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.post("/sendMessage", upload.single("media"), isLoggedIn, sendMessage);
router.get("/getMessages/:roomId", isLoggedIn, getMessages);
router.put("/seen/:roomId", isLoggedIn, seenMessages);
router.put("/editMessage/:messageId", isLoggedIn, editMessage);
router.delete("/deleteMessage/:messageId", isLoggedIn, deleteMessage);

export default router;