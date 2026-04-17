const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "SECRET_KEY";
const ALLOWED_ROLES = ["student", "teacher", "admin"];


// 🔥 REGISTER
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 🔴 VALIDATION
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        // 🔴 ROLE VALIDATION
        const userRole = "student";

        if (!ALLOWED_ROLES.includes(userRole)) {
            return res.status(400).json({
                message: "Invalid role"
            });
        }

        // 🔴 CHECK EXISTING USER
        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        // 🔐 HASH PASSWORD
        const hashedPassword = await bcrypt.hash(password, 10);

        // 🔥 CREATE USER
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: userRole
        });

        res.json({
            message: "User registered successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error("❌ REGISTER ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// 🔥 LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // 🔴 VALIDATION
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // 🔍 FIND USER
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // 🔐 CHECK PASSWORD
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // 🔥 GENERATE TOKEN (ROLE FROM DB, NOT REQUEST)
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error("❌ LOGIN ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;