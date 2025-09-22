const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Configure transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// API to send emails with uploaded HTML file
app.post('/send-email', upload.single('htmlFile'), async (req, res) => {
  const { recipients, subject } = req.body;

  if (!recipients || recipients.length === 0) {
    return res.status(400).json({ message: 'Recipients are required.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'HTML file is required.' });
  }

  // Read uploaded HTML file
  const filePath = path.join(__dirname, req.file.path);
  let htmlContent = fs.readFileSync(filePath, 'utf8');

  // Optional: replace dynamic placeholder {{name}} for each recipient
  const results = [];
  for (const recipient of JSON.parse(recipients)) {
    const personalizedHtml = htmlContent.replace(/{{name}}/g, recipient.name);

    const mailOptions = {
      from: process.env.EMAIL,
      to: recipient.email,
      subject: subject || 'Dynamic HTML Email',
      html: personalizedHtml,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      results.push({ email: recipient.email, status: 'sent', messageId: info.messageId });
    } catch (error) {
      results.push({ email: recipient.email, status: 'failed', error: error.message });
    }
  }

  // Delete uploaded file after sending
  fs.unlinkSync(filePath);

  res.json({ results });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
