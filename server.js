require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_CODE = process.env.SECRET_CODE || 'supersecret';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Keep original filename, but prepend timestamp to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// API Endpoints

// Upload endpoint
app.post('/api/upload', upload.single('presentation'), (req, res) => {
  const { secretCode } = req.body;
  
  if (secretCode !== SECRET_CODE) {
    if (req.file) {
      // Clean up uploaded file if code is wrong
      fs.unlinkSync(req.file.path);
    }
    return res.status(401).json({ error: 'Invalid secret code' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`
  });
});

// List presentations endpoint
app.get('/api/presentations', (req, res) => {
  fs.readdir(UPLOADS_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read presentations' });
    }
    
    // Sort files by creation time (newest first)
    const filesWithStats = files.map(file => {
      const stats = fs.statSync(path.join(UPLOADS_DIR, file));
      return {
        filename: file,
        url: `/uploads/${file}`,
        createdAt: stats.mtime
      };
    }).sort((a, b) => b.createdAt - a.createdAt);

    res.json(filesWithStats);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
