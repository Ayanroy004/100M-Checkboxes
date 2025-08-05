import express, { Request, Response } from "express";
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import path from "path";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 8000;

let checkbox = new Array(10).fill(false); // Can be 100_000_000 for real use

io.on("connection", (socket: Socket) => {
  console.log("User Connected:", socket.id);

  socket.on("checkboxChange", (data: { index: number; checked: boolean }) => {
    const { index, checked } = data;
    console.log(`Checkbox at index ${index} changed to ${checked}`);
    checkbox[index] = checked;
    io.emit("checkboxUpdate", { index, checked });
  });
});

app.get("/state", (req: Request, res: Response) => {
  console.log("Sending current checkbox state:", checkbox);
  return res.json(checkbox);
});

// ✅ Fix for production - use absolute path to public folder
app.use(express.static(path.join(__dirname, "../public")));

httpServer.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
