"use strict";

const { z } = require("zod");

const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, "Name cannot be empty").optional(),
        email: z.string().trim().email("Invalid email format").optional()
    }).refine(data => data.name !== undefined || data.email !== undefined, {
        message: "At least name or email must be provided to update profile",
        path: []
    })
});

const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: z.string().min(1, "Old password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters long")
            .regex(/[a-zA-Z]/, "New password must contain at least one letter")
            .regex(/[0-9]/, "New password must contain at least one number")
    })
});

module.exports = {
    updateProfileSchema,
    changePasswordSchema
};
