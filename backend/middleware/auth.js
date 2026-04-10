const jwt = require("jsonwebtoken");
const { User } = require("../models");
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, "SECRET_KEY"); // ⚠️ move to env later
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user; // { id, role }
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = authMiddleware;