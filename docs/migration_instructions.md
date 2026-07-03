# StudyFlow Database Migration and Seeding Instructions

This document explains how to run database migrations and seed data in production when deploying StudyFlow on Neon PostgreSQL and Render.

---

## 🛠️ Running Migrations Automatically on Render (Recommended)

Render provides a feature called **Release Command** for Web Services. A Release Command runs after the build succeeds but before the new container version is deployed. If the migration fails, Render aborts the deployment automatically, which keeps your application safe from database-schema inconsistencies.

1.  **Configure Release Command in Render Dashboard:**
    *   Open your Web Service settings on Render.
    *   Navigate to **Advanced Settings**.
    *   Find the **Release Command** field.
    *   Enter: `npm run db:migrate` (or `npx sequelize-cli db:migrate`).
2.  **Verify environment variables are set:** Ensure `DATABASE_URL` is set in the Environment section, as the Release Command runs with access to these environment variables.
3.  **Deploy:** During deployment, watch the Render logs. You will see a separate log category for the "Release Command" where the migrations run.

*Note:* Because `sequelize-cli` is listed in `devDependencies` in `backend/package.json`, you must ensure that Render installs `devDependencies` during the build phase (or move `sequelize-cli` to `dependencies`). See the Blocker section of the Audit Report for how to handle this correctly.

---

## 💻 Running Migrations Locally (Alternative)

If you need to run migrations manually from your local machine against the production Neon database:

1.  **Ensure you have the production connection string:** Get your `DATABASE_URL` from Neon.
2.  **Execute migrations using your local CLI:**
    Run the following command from the `backend` directory:
    ```bash
    DATABASE_URL="postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/studyflow?sslmode=require" NODE_ENV=production npx sequelize-cli db:migrate
    ```
    *Warning:* Ensure your local IP address is allowed in the Neon security settings if you have IP restrictions enabled.

---

## 📊 Seeding Demo Data in Production

Seeding demo data is optional and should generally only be done in staging or sandbox environments, not production. If you need to seed the system with the pre-defined demo study plans, users, and logs:

1.  **Using Render Shell:**
    *   Navigate to the **Shell** tab of your Render Web Service.
    *   Run:
        ```bash
        npm run db:seed
        ```
        This runs the Sequelize CLI seeder `20260519000200-seed-acadence-demo-data.js` to seed the database.
    *   To seed more comprehensive performance showcase data:
        ```bash
        node scripts/seedPerformanceShowcase.js
        ```
2.  **Using Local CLI (Direct Connection):**
    Run from the `backend` directory:
    ```bash
    DATABASE_URL="your-production-database-url?sslmode=require" NODE_ENV=production npm run db:seed
    ```

---

## ⚠️ Troubleshooting & Edge Cases

### 1. Neon DB Cold Starts
Neon databases on the Free Tier automatically suspend after 5 minutes of inactivity. When a request is received, Neon resumes the database, which can take 3 to 10 seconds.
*   **Symptom:** Connection timeouts during startup or during the migration command.
*   **Resolution:** The backend configuration contains built-in connection retry logic in `backend/src/config/database.js` that retries connection up to 5 times. If migrations fail, retry the build/release on Render.

### 2. `pgcrypto` Extension Permissions
The initial migration runs `CREATE EXTENSION IF NOT EXISTS pgcrypto;`.
*   **Symptom:** Migration fails with permission errors (`must be superuser to create extension`).
*   **Resolution:** Neon PostgreSQL allows standard users to create common extensions like `pgcrypto` out of the box. If this error occurs on other custom PostgreSQL hosts, ensure your database user has superuser privileges or manually run `CREATE EXTENSION pgcrypto;` as an administrator first, then comment out line 13 in `20260519000100-create-acadence-core-schema.js`.
