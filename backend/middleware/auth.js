const jwt = require("jsonwebtoken");
const { User } = require("../models");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, "SECRET_KEY");

        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // 🔥 CRITICAL: attach ONLY required data
        req.user = {
            id: user.id,
            role: user.role
        };

        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = authMiddleware;