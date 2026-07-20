import express from "express";
import { getMyCallLogs } from "../controllers/CallLogsController.js";
import isLoggedIn from "../middleware/isLoggedIn.js";

const router = express.Router();

router.get("/myCalls", isLoggedIn, getMyCallLogs);

export default router;