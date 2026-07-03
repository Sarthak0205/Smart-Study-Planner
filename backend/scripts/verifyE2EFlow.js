require("dotenv").config();

const { createTestServer, closeDatabasePool } = require("../tests/helpers/apiClient");

async function run() {
    console.log("🚀 Starting Programmatic E2E Verification Script...");
    const server = createTestServer();
    const stamp = Date.now();

    try {
        // Step 1: Register User
        console.log("1. Registering user...");
        const registered = await server.request("POST", "/auth/register", {
            body: {
                name: "E2E Tester",
                email: `e2e-tester-${stamp}@studyflow.dev`,
                password: "Password123!",
                role: "student"
            }
        });
        if (registered.status !== 201) {
            throw new Error(`Registration failed: ${JSON.stringify(registered.body)}`);
        }
        let token = registered.body.data.accessToken;
        console.log("✅ User registered successfully.");

        // Step 2: Fetch Profile
        console.log("2. Fetching profile info...");
        const profile = await server.request("GET", "/users/profile", { token });
        if (profile.status !== 200 || profile.body.data.profile.name !== "E2E Tester") {
            throw new Error(`Profile fetch mismatch: ${JSON.stringify(profile.body)}`);
        }
        console.log("✅ Profile fetched correctly.");

        // Step 3: Update Profile
        console.log("3. Updating display name and email address...");
        const updated = await server.request("PATCH", "/users/profile", {
            token,
            body: {
                name: "E2E Tester Updated",
                email: `e2e-tester-updated-${stamp}@studyflow.dev`
            }
        });
        if (updated.status !== 200 || updated.body.data.profile.name !== "E2E Tester Updated") {
            throw new Error(`Profile update mismatch: ${JSON.stringify(updated.body)}`);
        }
        console.log("✅ Profile fields updated correctly.");

        // Step 4: Duplicate Email Check
        console.log("4. Verifying duplicate email constraint...");
        const secondUser = await server.request("POST", "/auth/register", {
            body: {
                name: "Second Tester",
                email: `second-tester-${stamp}@studyflow.dev`,
                password: "Password123!",
                role: "student"
            }
        });
        if (secondUser.status !== 201) {
            throw new Error(`Second user registration failed`);
        }

        const conflict = await server.request("PATCH", "/users/profile", {
            token,
            body: {
                email: `second-tester-${stamp}@studyflow.dev`
            }
        });
        if (conflict.status !== 409) {
            throw new Error(`Expected conflict 409 but received ${conflict.status}`);
        }
        console.log("✅ Duplicate email updates correctly rejected.");

        // Step 5: Change Password
        console.log("5. Performing password change rotation...");
        const passChange = await server.request("POST", "/users/change-password", {
            token,
            body: {
                oldPassword: "Password123!",
                newPassword: "NewPassword123!"
            }
        });
        if (passChange.status !== 200 || passChange.body.data.success !== true) {
            throw new Error(`Password change request failed: ${JSON.stringify(passChange.body)}`);
        }
        console.log("✅ Password rotated successfully.");

        // Step 6: Verify Login Failures
        console.log("6. Verifying old credentials rejection...");
        const failLogin = await server.request("POST", "/auth/login", {
            body: {
                email: `e2e-tester-updated-${stamp}@studyflow.dev`,
                password: "Password123!"
            }
        });
        if (failLogin.status !== 401) {
            throw new Error(`Expected login failure with old password, but got ${failLogin.status}`);
        }
        console.log("✅ Login with stale password rejected correctly.");

        // Step 7: Verify Login Success
        console.log("7. Logging in with new updated credentials...");
        const successLogin = await server.request("POST", "/auth/login", {
            body: {
                email: `e2e-tester-updated-${stamp}@studyflow.dev`,
                password: "NewPassword123!"
            }
        });
        if (successLogin.status !== 200 || successLogin.body.data.user.name !== "E2E Tester Updated") {
            throw new Error(`Expected login success, but got status ${successLogin.status}`);
        }
        console.log("✅ Login with rotated password and updated email succeeded.");

        console.log("\n⭐️⭐️⭐️ PROGRAMMATIC E2E FLOW COMPLETELY VERIFIED ⭐️⭐️⭐️");
    } catch (err) {
        console.error("\n❌ Programmatic E2E Flow Failed:", err.message);
        process.exitCode = 1;
    } finally {
        await server.close();
        await closeDatabasePool();
    }
}

run();
