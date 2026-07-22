import express from "express";
import isLoggedIn from "../middleware/isLoggedIn.js";
import {
  createConversation,
  getUserConversations,
} from "../controllers/conversationController.js";
import {
  sendPrivateMessage,
  getPrivateMessages,
  deletePrivateMessage,
  seenPrivateMessages,
  editPrivateMessage,
} from "../controllers/PrivateMessage.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.post("/start", isLoggedIn, createConversation);
router.get("/allConversations", isLoggedIn, getUserConversations);
router.post(
  "/sendMessage",

  isLoggedIn,
  upload.single("media"),
  sendPrivateMessage,
);
router.get("/getMessages/:conversationId", isLoggedIn, getPrivateMessages);
router.put("/editPrivateMessage/:messageId", isLoggedIn, editPrivateMessage);
router.delete(
  "/deletePrivateMessage/:messageId",
  isLoggedIn,
  deletePrivateMessage,
);
router.put("/seen/:conversationId", isLoggedIn, seenPrivateMessages);

export default router;