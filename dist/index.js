"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const ioredis_1 = __importDefault(require("ioredis"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer);
const PORT = process.env.PORT || 8000;
const redis = new ioredis_1.default({ host: "localhost", port: 6379 });
const publisher = new ioredis_1.default({ host: "localhost", port: 6379 });
const subscriber = new ioredis_1.default({ host: "localhost", port: 6379 });
let checkbox = new Array(10).fill(false);
// redis.set("checkbox", JSON.stringify(checkbox)); // Update Redis with new state
subscriber.subscribe("server:broker");
subscriber.on("message", async (channel, message) => {
    if (message !== "") {
        const { checked, index } = JSON.parse(message);
        const updatedCheckbox = await redis.get("checkbox");
        const TotalTic = await redis.get("totalCheckboxTic");
        console.log("Count : ", TotalTic);
        if (updatedCheckbox) {
            const final = await JSON.parse(updatedCheckbox);
            console.log("updated checkbox : ", final);
        }
        const count = Number(TotalTic);
        io.emit("checkboxUpdate", { index, checked, count });
    }
    else {
        const flag = 1;
        io.emit("checkboxUpdate", { checkbox, flag });
    }
});
io.on("connection", async (socket) => {
    console.log("User Connected:", socket.id);
    socket.on("checkboxChange", async (data) => {
        const { index, checked } = data;
        const cachedCheckbox = await redis.get("checkbox");
        if (cachedCheckbox) {
            try {
                const jsonCached = JSON.parse(cachedCheckbox);
                jsonCached[index] = checked;
                const totalTic = await redis.get("totalCheckboxTic");
                console.log("update tic", totalTic);
                await redis.incr("totalCheckboxTic");
                await redis.set("checkbox", JSON.stringify(jsonCached));
            }
            catch (e) {
                console.log("Err : ", e);
            }
        }
        await publisher.publish("server:broker", JSON.stringify({ checked, index }));
        // io.emit("checkboxUpdate", { index, checked });
    });
    socket.on("clear", async () => {
        await redis.del("checkbox");
        await redis.del("totalCheckboxTic");
        publisher.publish("server:broker", "");
    });
});
app.get("/state", async (req, res) => {
    const cachedCheckbox = await redis.get("checkbox");
    const totalTic = await redis.get("totalCheckboxTic");
    if (cachedCheckbox) {
        try {
            const cachedParseData = await JSON.parse(cachedCheckbox);
            console.log("Mil gaya", totalTic);
            return res.json({ cachedParseData, totalTic });
        }
        catch (error) {
            console.error("Error parsing checkbox state from Redis:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }
    await redis.set("checkbox", JSON.stringify(checkbox));
    await redis.set("totalCheckboxTic", "0");
    return res.json(checkbox);
});
// ✅ Just use __dirname directly — it's built-in
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
httpServer.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
