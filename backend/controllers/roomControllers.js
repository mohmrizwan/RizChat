import roomModel from "../models/roomModel.js";
import userModel from "../models/userModel.js";
import generateRoomCode from "../utils/RoomCode.js";
import { getReceiverSocketId } from "../socket.io/Chat.js";

export const createRoom = async (req, res) => {
  try {
    const { roomName } = req.body;
    const userId = req.user.id;

    let roomCode;
    let existingRoom;

    if (!roomName) {
      return res.status(400).json({
        message: "Room name is required",
      });
    }

    do {
      roomCode = generateRoomCode();
      existingRoom = await roomModel.findOne({ roomCode });
    } while (existingRoom);

    const room = await roomModel.create({
      roomName,
      roomCode,
      createdBy: userId,
      members: [userId],
      type: "group",
    });

    return res.status(201).json({
      message: "Room Created Successfully",
      room,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getAllRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const myRooms = await roomModel
      .find({ members: userId })
      .populate("createdBy", "name email")
      .populate("members", "name emails");

    return res.status(200).json({ myRooms });
  } catch (error) {
    // console.error(error);1+

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.body;
    const userId = req.user.id;

    if (!roomCode) {
      return res.status(400).json({ message: "Enter Room Code" });
    }

    const findRoom = await roomModel.findOne({ roomCode });

    if (!findRoom) {
      return res.status(404).json({ message: "No Room Exist With Given code" });
    }
    if (findRoom.members.includes(userId)) {
      return res.status(409).json({ message: "You are already in the group" });
    }

    findRoom.members.push(userId);
    await findRoom.save();
    res.status(200).json({ message: "Joined Room Succesfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.id;

    const roomFind = await roomModel.findById(roomId);
    if (!roomFind) {
      return res.status(404).json({ message: "No Room Found" });
    }
    const userFind = roomFind.members.includes(userId);
    if (!userFind) {
      return res
        .status(400)
        .json({ message: "You are not member of this group" });
    }

    const io = req.app.get("io");
    roomFind.members.pull(userId);

    if (roomFind.members.length === 0) {
      io.to(roomId).emit("roomDeleted", { roomId });
      await roomModel.findByIdAndDelete(roomId);
      return res.status(200).json({
        message: "Room deleted because no members are left",
      });
    }

    if (roomFind.createdBy.toString() === userId) {
      roomFind.createdBy = roomFind.members[0];
    }

    await roomFind.save();

    const updatedRoom = await roomModel
      .findById(roomId)
      .populate("members", "name")
      .populate("createdBy", "name");

    const currentSocketIds = getReceiverSocketId(userId);
    currentSocketIds.forEach((socketId) => {
      io.of("/").sockets.get(socketId)?.leave(roomId);
    });

    io.to(roomId).emit("memberLeft", {
      roomId,
      userId,
      updatedRoom,
      isRemoved: false,
    });

    res.status(200).json({ message: "Leave Group Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const addMembers = async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    const adminId = req.user.id;
    const findRoom = await roomModel.findById(roomId);

    if (!findRoom) {
      return res.status(404).json({ message: "No Group Found" });
    }

    if (findRoom.createdBy.toString() !== adminId) {
      return res
        .status(403)
        .json({ message: "You Are Not Eligible For This Task" });
    }

    const findUser = await userModel.findById(userId);

    if (!findUser) {
      return res.status(404).json({ message: "No User Found" });
    }
    const alreadyMember = findRoom.members.some(
      (member) => member.toString() === userId,
    );

    if (alreadyMember) {
      return res.status(409).json({ message: "User Already in the Group" });
    }
    const io = req.app.get("io");
    findRoom.members.push(userId);
    await findRoom.save();
    const updatedRoom = await roomModel
      .findById(roomId)
      .populate("members", "name")
      .populate("createdBy", "name");
    io.to(roomId).emit("memberAdded", updatedRoom);
    return res.status(200).json({
      message: "Member added successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    const adminId = req.user.id;
    const findRoom = await roomModel.findById(roomId);

    if (!findRoom) {
      return res.status(404).json({ message: "No Room Found" });
    }

    if (findRoom.createdBy.toString() !== adminId) {
      return res
        .status(403)
        .json({ message: "You Are Not Eligible For This Task" });
    }

    if (userId === adminId) {
      return res
        .status(400)
        .json({ message: "Admin must use Leave Group to exit the room" });
    }

    const isMember = findRoom.members.some(
      (member) => member.toString() === userId,
    );
    if (!isMember) {
      return res.status(400).json({ message: "User is not in the group" });
    }

    findRoom.members.pull(userId);
    await findRoom.save();

    const updatedRoom = await roomModel
      .findById(roomId)
      .populate("members", "name")
      .populate("createdBy", "name");

    const io = req.app.get("io");
    const removedSocketIds = getReceiverSocketId(userId);
    removedSocketIds.forEach((socketId) => {
      const removedSocket = io.sockets.sockets.get(socketId);
      if (removedSocket) {
        removedSocket.leave(roomId);
        removedSocket.emit("removedFromRoom", {
          roomId,
          updatedRoom,
          removedBy: adminId,
        });
      }
    });

    io.to(roomId).emit("memberLeft", {
      roomId,
      userId,
      updatedRoom,
      isRemoved: true,
      removedBy: adminId,
    });

    return res.status(200).json({
      message: "Member removed successfully",
      updatedRoom,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const findRoom = await roomModel.findById(roomId);
    if (!findRoom) {
      return res.status(404).json({ message: "No Room Found" });
    } 
    const isAdmin = findRoom.createdBy.toString() === userId;
    if(!isAdmin) {
      return  res.status(403).json({ message: "You Are Not Eligible For This Task" });
    }
    const io = req.app.get("io");
    io.to(roomId).emit("roomDeleted", { roomId });
    await roomModel.findByIdAndDelete(roomId);
    return res.status(200).json({
      message: "Room Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};