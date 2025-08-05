"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer);
const PORT = process.env.PORT || 8000;
let checkbox = new Array(10).fill(false); // Can be 100_000_000 for real use
io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);
    socket.on("checkboxChange", (data) => {
        const { index, checked } = data;
        console.log(`Checkbox at index ${index} changed to ${checked}`);
        checkbox[index] = checked;
        io.emit("checkboxUpdate", { index, checked });
    });
});
app.get("/state", (req, res) => {
    console.log("Sending current checkbox state:", checkbox);
    return res.json(checkbox);
});
// ✅ Fix for production - use absolute path to public folder
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
httpServer.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
