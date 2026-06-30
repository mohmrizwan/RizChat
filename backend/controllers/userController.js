import express from "express";
import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken.js";


export const createUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "All Fields are required" });
    }

    const existingUser = await userModel.findOne({ email });
    const existingPhone = await userModel.findOne({ phone });

    if (existingUser) {
      return res.status(409).json({ message: "Email Already Taken" });
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
    const user = await userModel.find().select("name email");

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};
