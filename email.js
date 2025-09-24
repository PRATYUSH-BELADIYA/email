// const dotenv = require('dotenv');
// dotenv.config();
// const express = require('express');
// const nodemailer = require('nodemailer');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const bodyParser = require('body-parser');

// const app = express();
// app.use(bodyParser.json());

// // Configure transporter
// const transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com',
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL,
//     pass: process.env.PASS,
//   },
// });

// // Multer setup for file uploads
// const upload = multer({ dest: 'uploads/' });

// // API to send emails with uploaded HTML file
// app.post('/send-email', upload.single('htmlFile'), async (req, res) => {
//   const { recipients, subject } = req.body;

//     if (typeof recipients === "string") {
//     try {
//       recipients = JSON.parse(recipients);
//     } catch {
//       return res.status(400).json({ message: 'Recipients must be a valid JSON array.' });
//     }
//   }

  
//   if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
//     return res.status(400).json({ message: 'Recipients must be a non-empty array of emails.' });
//   }

//   if (!req.file) {
//     return res.status(400).json({ message: 'HTML file is required.' });
//   }

//   // Read uploaded HTML file
//   const filePath = path.join(__dirname, req.file.path);
//   let htmlContent = fs.readFileSync(filePath, 'utf8');

//   const results = [];
//   for (const email of recipients) {
//     const mailOptions = {
//       from: process.env.EMAIL,
//       to: email,
//       subject: subject || 'Dynamic HTML Email',
//       html: htmlContent, // no {{name}} replacement since we only have emails
//     };

//     try {
//       const info = await transporter.sendMail(mailOptions);
//       results.push({ email: email, status: 'sent', messageId: info.messageId });
//     } catch (error) {
//       results.push({ email: email, status: 'failed', error: error.message });
//     }
//   }

//   // Delete uploaded file after sending
//   fs.unlinkSync(filePath);

//   res.json({ results });
// });

// // Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port http://localhost:${PORT}`);
// });

const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;


const app = express();
app.use(cors());

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Transporter setup
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

app.post('/send-email', upload.single('htmlFile'), async (req, res) => {
  let { recipients, subject } = JSON.parse(req.body.data || "{}"); 
  // "data" will carry JSON (recipients array, subject, etc.)

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ message: 'Recipients must be a non-empty array of emails.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'HTML file is required.' });
  }

  const filePath = path.join(__dirname, req.file.path);
  let htmlContent = fs.readFileSync(filePath, 'utf8');

  const results = [];
  for (const email of recipients) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: subject || 'Dynamic HTML Email',
        html: htmlContent,
      });
      results.push({ email, status: 'sent', messageId: info.messageId });
    } catch (err) {
      results.push({ email, status: 'failed', error: err.message });
    }
  }

  fs.unlinkSync(filePath); // cleanup
  res.json({ results });
});


app.post('/upload-music', upload.single('music'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload file to Cloudinary as audio
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'video', // for audio or video files
      folder: 'music_uploads', // optional folder
    });

    // Delete local file after upload
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Music uploaded successfully',
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Upload failed', error });
  }
});


app.get('/get-audios', async (req, res) => {
  try {
    // List all resources in folder "music_uploads"
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'video', // audio is considered "video" in Cloudinary
      prefix: 'music_uploads/', // folder name
      max_results: 100, // adjust as needed
    });

    // Map to only send necessary info
    const audios = result.resources.map(file => ({
      name: file.public_id.split('/').pop() + '.' + file.format, // get file name
      url: file.secure_url,
      public_id: file.public_id,
    }));

    res.json(audios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch audio files', error });
  }
});


// Start server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
