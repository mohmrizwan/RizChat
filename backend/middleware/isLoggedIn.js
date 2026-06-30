import jwt from "jsonwebtoken";

const isLoggedIn = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Unauthorized. Please login first.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Token not found",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
   

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or Expired Token",
    });
  }
};

export default isLoggedIn;
