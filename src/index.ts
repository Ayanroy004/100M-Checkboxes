import express, { Request, Response } from "express";
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import path from "path";
import Redis from "ioredis";
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 8000;

const redis = new Redis();
const publisher = new Redis();
const subscriber = new Redis();

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
  } else {
    const flag = 1;
    io.emit("checkboxUpdate", { checkbox, flag });
  }
});

io.on("connection", async (socket: Socket) => {
  console.log("User Connected:", socket.id);

  socket.on(
    "checkboxChange",
    async (data: { index: number; checked: boolean }) => {
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
        } catch (e) {
          console.log("Err : ", e);
        }
      }
      await publisher.publish(
        "server:broker",
        JSON.stringify({ checked, index })
      );

      // io.emit("checkboxUpdate", { index, checked });
    }
  );

  socket.on("clear", async () => {
    await redis.del("checkbox");
    await redis.del("totalCheckboxTic");

    publisher.publish("server:broker", "");
  });
});

app.get("/state", async (req: Request, res: Response) => {
  const cachedCheckbox = await redis.get("checkbox");
  const totalTic = await redis.get("totalCheckboxTic");
  if (cachedCheckbox) {
    try {
      const cachedParseData = await JSON.parse(cachedCheckbox);

      console.log("Mil gaya", totalTic);
      return res.json({ cachedParseData, totalTic });
    } catch (error) {
      console.error("Error parsing checkbox state from Redis:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  await redis.set("checkbox", JSON.stringify(checkbox));
  await redis.set("totalCheckboxTic", "0");
  return res.json(checkbox);
});

// ✅ Just use __dirname directly — it's built-in
app.use(express.static(path.join(__dirname, "../public")));

httpServer.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
