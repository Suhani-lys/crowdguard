import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Incident from "./models/Incident";
import User from "./models/User";
import Comment from "./models/Comment";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// MongoDB Connection
let isMongoConnected = false;

const localIncidents: any[] = [
  {
    id: '1',
    type: 'theft',
    latitude: 40.7128,
    longitude: -74.0060,
    description: 'Bicycle stolen from bike rack.',
    timestamp: '2023-10-27T10:00:00Z',
    verified: true,
    reporterId: 'u1',
    upvotes: 12
  },
  {
    id: '2',
    type: 'suspicious',
    latitude: 40.7150,
    longitude: -74.0100,
    description: 'Suspicious individual looking into cars.',
    timestamp: '2023-10-27T11:30:00Z',
    verified: false,
    reporterId: 'u2',
    upvotes: 5
  },
  {
    id: '3',
    type: 'accident',
    latitude: 40.7200,
    longitude: -73.9900,
    description: 'Minor collision between taxi and sedan.',
    timestamp: '2023-10-27T09:15:00Z',
    verified: true,
    reporterId: 'u3',
    upvotes: 20
  }
];

const localUsers: any[] = [
  {
    id: "u1",
    name: "Alex Chen",
    rank: 1,
    points: 2450,
    badges: ["Guardian", "First Responder", "Top Reporter"],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  },
  {
    id: "u2",
    name: "Sarah Jones",
    rank: 2,
    points: 1980,
    badges: ["Scout", "Helper"],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    id: "u3",
    name: "Mike Ross",
    rank: 3,
    points: 1850,
    badges: ["Watcher"],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
  },
];

const localComments: any[] = [];

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/crowdguard";

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
  .then(async () => {
    console.log("Connected to MongoDB successfully.");
    isMongoConnected = true;

    // Seed Users if empty
    try {
      const count = await User.countDocuments();
      if (count === 0) {
        console.log("Seeding initial users into MongoDB...");
        await User.insertMany(localUsers);
        console.log("Seeding complete.");
      }
    } catch (err) {
      console.error("Seeding error:", err);
    }
  })
  .catch((err) => {
    console.warn("MongoDB connection failed (Timeout 2s). Falling back to in-memory local mock database.");
    isMongoConnected = false;
  });

interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
}

// Store connected users
const users: Record<string, LocationData> = {};

// API Routes
app.get("/api/incidents", async (req, res) => {
  try {
    if (isMongoConnected) {
      const incidents = await Incident.find().sort({ timestamp: -1 });
      res.json(incidents);
    } else {
      res.json(localIncidents);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

app.post("/api/incidents", async (req, res) => {
  try {
    if (isMongoConnected) {
      const newIncident = new Incident(req.body);
      await newIncident.save();
      io.emit("newIncident", newIncident);
      res.status(201).json(newIncident);
    } else {
      const newIncident = {
        ...req.body,
        id: req.body.id || Date.now().toString(),
        timestamp: req.body.timestamp || new Date().toISOString(),
        verified: req.body.verified || false,
        upvotes: req.body.upvotes || 0,
        severity: req.body.severity || 1
      };
      localIncidents.unshift(newIncident);
      io.emit("newIncident", newIncident);
      res.status(201).json(newIncident);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to create incident" });
  }
});

app.post("/api/incidents/:id/upvote", async (req, res) => {
  try {
    if (isMongoConnected) {
      const incident = await Incident.findOne({ id: req.params.id });
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      incident.upvotes += 1;
      if (incident.upvotes >= 5) {
        incident.verified = true;
      }
      await incident.save();
      io.emit("incidentUpdated", incident); // Re-emit to update clients
      res.json(incident);
    } else {
      const incident = localIncidents.find(i => i.id === req.params.id);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      incident.upvotes = (incident.upvotes || 0) + 1;
      if (incident.upvotes >= 5) {
        incident.verified = true;
      }
      io.emit("incidentUpdated", incident);
      res.json(incident);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to upvote incident" });
  }
});

app.get("/api/incidents/:id/comments", async (req, res) => {
  try {
    if (isMongoConnected) {
      const comments = await Comment.find({ incidentId: req.params.id }).sort({
        timestamp: -1,
      });
      res.json(comments);
    } else {
      const comments = localComments.filter(c => c.incidentId === req.params.id);
      res.json(comments);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

app.post("/api/incidents/:id/comments", async (req, res) => {
  try {
    if (isMongoConnected) {
      const newComment = new Comment({
        ...req.body,
        incidentId: req.params.id,
      });
      await newComment.save();
      io.emit("newComment", newComment);
      res.status(201).json(newComment);
    } else {
      const newComment = {
        ...req.body,
        id: req.body.id || Date.now().toString(),
        incidentId: req.params.id,
        timestamp: req.body.timestamp || new Date().toISOString()
      };
      localComments.unshift(newComment);
      io.emit("newComment", newComment);
      res.status(201).json(newComment);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

import multer from "multer";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Serve static files from uploads directory
app.use("/uploads", express.static(uploadDir));

app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const imageUrl = `http://localhost:4000/uploads/${req.file.filename}`;

    // Gemini Analysis
    let analysis = null;

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing. Using mock analysis.");
      analysis =
        "Analysis unavailable (Missing API Key). Please add GEMINI_API_KEY to .env for real image analysis.";
    } else {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imagePath = req.file.path;
        const imageData = fs.readFileSync(imagePath);
        const imageBase64 = imageData.toString("base64");

        const prompt =
          "Analyze this image. If it depicts a safety incident (theft, accident, fire, assault, suspicious activity, etc.), provide a short, factual description (max 2 sentences). If it does not appear to be a safety incident or is unclear, return 'Not a safety incident'.";

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: imageBase64,
              mimeType: req.file.mimetype,
            },
          },
        ]);
        const response = await result.response;
        analysis = response.text();
      } catch (geminiError) {
        console.error("Gemini analysis failed:", geminiError);
        analysis = "Verification unavailable";
      }
    }

    res.json({ imageUrl, analysis });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    if (isMongoConnected) {
      const users = await User.find().sort({ points: -1 }).limit(10);
      // Assign ranks
      const rankedUsers = users.map((user, index) => ({
        ...user.toObject(),
        rank: index + 1,
      }));
      res.json(rankedUsers);
    } else {
      const sorted = [...localUsers].sort((a, b) => b.points - a.points).slice(0, 10);
      const ranked = sorted.map((user, index) => ({
        ...user,
        rank: index + 1
      }));
      res.json(ranked);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { id, name, avatar } = req.body;
    if (isMongoConnected) {
      let user = await User.findOne({ id });
      if (!user) {
        user = new User({ id, name, avatar, points: 0, badges: ["Newcomer"] });
        await user.save();
      }
      res.json(user);
    } else {
      let user = localUsers.find(u => u.id === id);
      if (!user) {
        user = { id, name, avatar, points: 0, badges: ["Newcomer"] };
        localUsers.push(user);
      }
      res.json(user);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to create/fetch user" });
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send existing users to the new client
  socket.emit("currentUsers", users);

  // Handle location updates from a client
  socket.on("updateLocation", (data: LocationData) => {
    console.log(`Received location from ${socket.id}:`, data);
    // data should contain { latitude, longitude, ... }
    users[socket.id] = { ...data, id: socket.id };

    // Broadcast to all other clients
    socket.broadcast.emit("locationUpdate", { ...data, id: socket.id });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    delete users[socket.id];
    io.emit("userDisconnected", socket.id);
  });

  // Handle SOS Alerts
  socket.on("sosAlert", (data: { userId: string; location: LocationData }) => {
    console.log(`SOS Alert from ${data.userId}`, data);
    // Broadcast to all clients (in a real app, filter by radius)
    io.emit("sosAlert", data);
  });
});

// News API Proxy
app.get("/api/news", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    let locationName = "Local";

    if (lat && lon) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
          {
            headers: { "User-Agent": "CrowdGuard/1.0" },
          }
        );
        const geoData = await geoRes.json();
        locationName =
          geoData.address?.city ||
          geoData.address?.town ||
          geoData.address?.village ||
          geoData.address?.county ||
          "Local";
      } catch (e) {
        console.error("Geocoding failed:", e);
      }
    }

    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      locationName + " safety crime"
    )}&hl=en-US&gl=US&ceid=US:en`;
    // We can fetch directly from the server without CORS issues
    const newsRes = await fetch(rssUrl);
    const text = await newsRes.text();

    res.send(text); // Send XML to frontend to parse, or parse here. Sending XML is fine for now as frontend has parser.
  } catch (error) {
    console.error("News fetch error:", error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.get("/api/nearby-responders", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    // Overpass API query for police stations within 5km (5000m)
    const query = `
            [out:json];
            (
              node["amenity"="police"](around:5000,${lat},${lon});
              way["amenity"="police"](around:5000,${lat},${lon});
              relation["amenity"="police"](around:5000,${lat},${lon});
            );
            out center;
        `;

    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
      query
    )}`;
    const response = await fetch(overpassUrl);
    const data = await response.json();

    const responders = data.elements
      .map((element: any) => {
        const name = element.tags.name || "Police Station";
        const type = "police";
        // Calculate rough distance (Euclidean approximation for simplicity, or use Haversine if needed)
        // For display purposes, we can just return the raw data and let frontend handle distance or just show "Nearby"
        // Let's do a simple distance calc here for the "distance" field
        const pLat = element.lat || element.center.lat;
        const pLon = element.lon || element.center.lon;

        // Haversine formula
        const R = 6371; // Radius of the earth in km
        const dLat = (pLat - Number(lat)) * (Math.PI / 180);
        const dLon = (pLon - Number(lon)) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(Number(lat) * (Math.PI / 180)) *
            Math.cos(pLat * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km

        return {
          id: element.id.toString(),
          name: name,
          type: type,
          eta: `${Math.ceil(d * 3)} min`, // Rough estimate: 3 mins per km driving
          distance: `${d.toFixed(1)} km`,
        };
      })
      .slice(0, 5); // Limit to top 5

    res.json(responders);
  } catch (error) {
    console.error("Failed to fetch responders:", error);
    res.status(500).json({ error: "Failed to fetch nearby responders" });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
