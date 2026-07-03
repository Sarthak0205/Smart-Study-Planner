"use strict";

const createApp = require("../../src/app");
const { sequelize } = require("../../src/db/models");
const supertest = require("supertest");

function createTestServer() {
    const app = createApp();

    async function request(method, path, { body, token } = {}) {
        let agent = supertest(app)[method.toLowerCase()](`/api/v1${path}`).set("content-type", "application/json");
        if (token) agent = agent.set("authorization", `Bearer ${token}`);
        if (body) agent = agent.send(body);

        const response = await agent;
        return { status: response.status, body: response.body, headers: response.headers };
    }

    async function close() {
        return Promise.resolve();
    }

    return { request, close };
}

async function closeDatabasePool() {
    await sequelize.close();
}

module.exports = {
    createTestServer,
    closeDatabasePool
};
