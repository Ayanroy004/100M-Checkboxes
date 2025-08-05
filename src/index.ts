import express, { Request, Response } from "express";
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import path from "path";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 8000;

let checkbox = new Array(10).fill(false);

io.on("connection", (socket: Socket) => {
  console.log("User Connected:", socket.id);

  socket.on("checkboxChange", (data: { index: number; checked: boolean }) => {
    const { index, checked } = data;
    checkbox[index] = checked;
    io.emit("checkboxUpdate", { index, checked });
  });
});

app.get("/state", (req: Request, res: Response) => {
  res.json(checkbox);
});

// ✅ Just use __dirname directly — it's built-in
app.use(express.static(path.join(__dirname, "../public")));

httpServer.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
