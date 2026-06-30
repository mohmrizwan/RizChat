import express from "express";
import {
  addMembers,
  createRoom,
  getAllRooms,
  joinRoom,
  leaveRoom,
} from "../controllers/roomControllers.js";
import isLoggedIn from "../middleware/isLoggedIn.js";
const router = express.Router();

router.post("/createRoom", isLoggedIn, createRoom);
router.get("/allRooms", isLoggedIn, getAllRooms);
router.post("/joinRoom", isLoggedIn, joinRoom);
router.post("/leaveRoom", isLoggedIn, leaveRoom)
router.post("/addMember", isLoggedIn, addMembers)

export default router;
