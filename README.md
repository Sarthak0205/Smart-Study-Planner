# 🧠 Smart Study Planner

A multi-user adaptive study planning system that allows students to create personalized study schedules and follow expert-designed plans.

---

## 🚀 Features

### 👤 User Roles
- **Student** – Create personal plans, follow teacher plans
- **Teacher** – Create and publish public study plans
- **Admin** – System-level control

---

### 📚 Plan System
- Create reusable study plans
- Public plan discovery
- Follow plans created by teachers

---

### 🔁 Follow & Clone Model
- Students follow a plan
- System creates a **personal copy**
- Original plan remains unchanged

---

### 🔗 Traceable Architecture
- Each cloned plan tracks its source using `sourcePlanId`
- Enables future sync and analytics

---

### 📅 Smart Scheduling Engine
- Generates study schedules based on:
  - Difficulty
  - Remaining work
  - Deadlines
  - Priority scoring

---

## 🏗️ Tech Stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Auth:** JWT
- **Architecture:** MVC + Service Layer

---

## 📂 Project Structure
# 🧠 Smart Study Planner

A multi-user adaptive study planning system that allows students to create personalized study schedules and follow expert-designed plans.

---

## 🚀 Features

### 👤 User Roles
- **Student** – Create personal plans, follow teacher plans
- **Teacher** – Create and publish public study plans
- **Admin** – System-level control

---

### 📚 Plan System
- Create reusable study plans
- Public plan discovery
- Follow plans created by teachers

---

### 🔁 Follow & Clone Model
- Students follow a plan
- System creates a **personal copy**
- Original plan remains unchanged

---

### 🔗 Traceable Architecture
- Each cloned plan tracks its source using `sourcePlanId`
- Enables future sync and analytics

---

### 📅 Smart Scheduling Engine
- Generates study schedules based on:
  - Difficulty
  - Remaining work
  - Deadlines
  - Priority scoring

---

## 🏗️ Tech Stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Auth:** JWT
- **Architecture:** MVC + Service Layer

---

## 📂 Project Structure
models/
routes/
services/
middleware/
config/


---

## 🔐 Authentication

- JWT-based authentication
- Role-based access control

---

## 🧪 Key APIs

### Auth
- `POST /auth/register`
- `POST /auth/login`

### Plans
- `POST /plans` → Create plan
- `GET /plans/public` → Explore plans
- `POST /plans/:id/follow` → Follow + clone
- `GET /plans/my` → Get user plans

### Schedule
- `POST /schedule/generate`
- `GET /schedule`
- `GET /schedule/today`

---

## 🧠 Core Concept

> Plans are created once and followed many times.

- Ownership ≠ Usage
- Users operate on independent copies
- Enables scalability and personalization

---

## 🚀 Future Improvements

- Plan versioning & sync
- Progress tracking per topic
- AI-based adaptive scheduling
- Analytics dashboard

---

## ⚙️ Setup Instructions

```bash
git clone <repo-url>
cd smart-study-planner
npm install

Configure DB
Update config/db.js
Run Server
node server.js

📌 Author
Built by Sarthak 