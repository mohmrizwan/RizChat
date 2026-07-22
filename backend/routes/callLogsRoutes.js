import express from "express";
import { getMyCallLogs, getCallLogsBetweenUsers } from "../controllers/CallLogsController.js"
import isLoggedIn from "../middleware/isLoggedIn.js";

const router = express.Router();

router.get("/myCalls", isLoggedIn, getMyCallLogs);
router.get("/betweenUsers/:otherUserId", isLoggedIn, getCallLogsBetweenUsers);

export default router;