"use strict";

const { createTestServer, closeDatabasePool } = require("../helpers/apiClient");

afterAll(async () => {
    await closeDatabasePool();
});

test("user profile retrieval, updates, and password changes work as expected", async () => {
    const server = createTestServer();
    const stamp = Date.now();

    try {
        // 1. Register a test user
        const registered = await server.request("POST", "/auth/register", {
            body: {
                name: "Settings Student",
                email: `settings-${stamp}@studyflow.test`,
                password: "StrongPass123!",
                role: "student"
            }
        });
        expect(registered.status).toBe(201);
        const token = registered.body.data.accessToken;

        // 2. GET profile
        const profile = await server.request("GET", "/users/profile", { token });
        expect(profile.status).toBe(200);
        expect(profile.body.data.profile.name).toBe("Settings Student");
        expect(profile.body.data.profile.email).toBe(`settings-${stamp}@studyflow.test`);

        // 3. PATCH profile (Update name & email)
        const updated = await server.request("PATCH", "/users/profile", {
            token,
            body: {
                name: "Updated Name",
                email: `settings-updated-${stamp}@studyflow.test`
            }
        });
        expect(updated.status).toBe(200);
        expect(updated.body.data.profile.name).toBe("Updated Name");
        expect(updated.body.data.profile.email).toBe(`settings-updated-${stamp}@studyflow.test`);

        // 4. Duplicate email validation check
        // Register another user
        const otherUser = await server.request("POST", "/auth/register", {
            body: {
                name: "Other Student",
                email: `settings-other-${stamp}@studyflow.test`,
                password: "StrongPass123!",
                role: "student"
            }
        });
        expect(otherUser.status).toBe(201);

        // Try to update current user's email to other user's email
        const conflict = await server.request("PATCH", "/users/profile", {
            token,
            body: {
                email: `settings-other-${stamp}@studyflow.test`
            }
        });
        expect(conflict.status).toBe(409);
        expect(conflict.body.error.code).toBe("DUPLICATE_RESOURCE");

        // 5. POST change password
        // Correct old password
        const passwordChange = await server.request("POST", "/users/change-password", {
            token,
            body: {
                oldPassword: "StrongPass123!",
                newPassword: "NewStrongPass123!"
            }
        });
        expect(passwordChange.status).toBe(200);
        expect(passwordChange.body.data.success).toBe(true);

        // Incorrect old password
        const wrongOldPassword = await server.request("POST", "/users/change-password", {
            token,
            body: {
                oldPassword: "WrongPass123!",
                newPassword: "SomeNewPass123!"
            }
        });
        expect(wrongOldPassword.status).toBe(401);
        expect(wrongOldPassword.body.error.code).toBe("INVALID_CREDENTIALS");

        // Weak password validation check
        const weakNewPassword = await server.request("POST", "/users/change-password", {
            token,
            body: {
                oldPassword: "NewStrongPass123!",
                newPassword: "weak"
            }
        });
        expect(weakNewPassword.status).toBe(400);
        expect(weakNewPassword.body.error.code).toBe("VALIDATION_ERROR");

        // Verify we can log in with the new password
        const loginCheck = await server.request("POST", "/auth/login", {
            body: {
                email: `settings-updated-${stamp}@studyflow.test`,
                password: "NewStrongPass123!"
            }
        });
        expect(loginCheck.status).toBe(200);
        expect(loginCheck.body.data.user.name).toBe("Updated Name");
    } finally {
        await server.close();
    }
});
