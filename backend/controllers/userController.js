import express from "express";
import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export const createUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "All Fields are required" });
    }

    const existingUser = await userModel.findOne({ email });
    const existingPhone = await userModel.findOne({ phone });
    const existingName = await userModel.findOne({ name });

    if (existingUser) {
      return res.status(409).json({ message: "Email Already Taken" });
    }
    if (existingName) {
      return res.status(409).json({ message: "Username Already Taken" });
    }
    if (existingPhone) {
      return res.status(409).json({ message: "Phone Already Taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hasedPassword = await bcrypt.hash(password, salt);

    const userCreated = await userModel.create({
      name,
      email,
      phone,
      password: hasedPassword,
    });
    let token = generateToken(userCreated);
    return res
      .status(201)
      .json({ message: "Account Created Successfully", token, userCreated });
  } catch (error) {
    if (error) {
      console.log(error);
      res.status(500).json({ message: "Something went wrong on server" });
    }
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Fields Required",
      });
    }

    const userExist = await userModel.findOne({ email });

    if (!userExist) {
      return res.status(404).json({
        message: "Invalid Email",
      });
    }

    const passwordMatch = await bcrypt.compare(password, userExist.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid Password",
      });
    }

    const token = generateToken(userExist);

    return res.status(200).json({
      message: "Login Successfully",
      token,
      user: userExist,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const Logout = async (req, res) => {
  return res.status(200).json({ message: "Your account is loggoed out" });
};

export const getAllUsers = async (req, res) => {
  try {
    const user = await userModel.find().select("name email profilePic");

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // ✅ require at least one of: name or file
    if (!name && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Nothing to update — provide a name or profile picture",
      });
    }

    const updateData = {};

    if (name) {
      updateData.name = name;
    }

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: "rizchat/profile-pics",
        resource_type: "image",
      });
      updateData.profilePic = uploadResult.secure_url;
    }

    const updatedUser = await userModel.findByIdAndUpdate(userId, updateData, {
      new: true,
    });


    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await userModel.findById(userId).select("-password");
console.log(user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
