const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());

// Cloudinary Config
cloudinary.config({
  cloud_name: "dvuu8jdi5",
  api_key: "455356842469718",
  api_secret: "PZVXNaLfBZHkyEzkwxe7X8MHxks",
});

// Multer temp upload folder
const upload = multer({ dest: "uploads/" });

// -------------------------
// UPLOAD MUSIC
// -------------------------
app.post("/upload-music", upload.single("music"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const originalName = req.file.originalname.split(".")[0]; // filename without extension

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video", // audio is treated as video
      folder: "music_uploads",
      public_id: originalName, // store original name
      overwrite: false, // do not overwrite if same name exists
    });

    // Remove temporary local file
    fs.unlinkSync(req.file.path);

    res.json({
      message: "Music uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
      original_name: req.file.originalname,
    });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ message: "Upload failed", error });
  }
});

// -------------------------
// GET ALL AUDIO FILES
// -------------------------
app.get("/get-audios", async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      resource_type: "video",
      prefix: "music_uploads/",
      max_results: 100,
    });

    const audios = result.resources.map(file => ({
      name: file.public_id.split("/").pop() + "." + file.format,
      url: file.secure_url,
      public_id: file.public_id,
    }));

    res.json(audios);

  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch audio files", error });
  }
});

// -------------------------
// START SERVER
// -------------------------
app.listen(3000, () =>
  console.log("Server running on http://localhost:3000")
);
