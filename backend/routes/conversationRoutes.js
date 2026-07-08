import express from "express";
import isLoggedIn from "../middleware/isLoggedIn.js";
import { createConversation } from "../controllers/conversationController.js";
import {
  sendPrivateMessage,
  getPrivateMessages,
  deletePrivateMessage,
  seenPrivateMessages,
} from "../controllers/PrivateMessage.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.post("/start", isLoggedIn, createConversation);
router.post(
  "/sendMessage",

  isLoggedIn,
  upload.single("media"),
  sendPrivateMessage,
);
router.get("/getMessages/:conversationId", isLoggedIn, getPrivateMessages);
router.delete(
  "/deletePrivateMessage/:messageId",
  isLoggedIn,
  deletePrivateMessage,
);
router.put("/seen/:conversationId", isLoggedIn, seenPrivateMessages);

export default router;
