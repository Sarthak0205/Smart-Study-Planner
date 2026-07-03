"use strict";

const { createTestServer, closeDatabasePool } = require("../helpers/apiClient");

afterAll(async () => {
    await closeDatabasePool();
});

test("OpenAPI document is served and includes ownership-sensitive domains", async () => {
    const server = createTestServer();

    try {
        const response = await server.request("GET", "/docs/openapi.json");

        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe("3.0.3");
        expect(response.body.paths["/plans/{id}/follow"]).toBeTruthy();
        expect(response.body.paths["/execution/schedule-items/{id}/logs"]).toBeTruthy();
        expect(response.body.components.securitySchemes.bearerAuth).toBeTruthy();
    } finally {
        await server.close();
    }
});
