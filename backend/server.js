const express = require("express");
const cors = require("cors");

require("./config/db");
require("./models"); // IMPORTANT

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API Running");
});
app.use("/topics", require("./routes/topicRoutes"));
app.use("/schedule", require("./routes/scheduleRoutes"));
app.use("/log", require("./routes/logRoutes"));
app.listen(8000, () => {
    console.log("Server running on port 8000");
});