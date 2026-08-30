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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const className = (req.body.className || 'Uncategorized').replace(/___/g, '');
    const subjectName = (req.body.subjectName || 'Uncategorized').replace(/___/g, '');
    cb(null, `${uniqueSuffix}___${className}___${subjectName}___${file.originalname}`);
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
      const parts = file.split('___');
      let className = 'Uncategorized', subjectName = 'Uncategorized', displayName = file;
      
      if (parts.length >= 4) {
        className = parts[1];
        subjectName = parts[2];
        displayName = parts.slice(3).join('___');
      } else {
        // Fallback for older files uploaded before this feature
        displayName = file.replace(/^\d+-/, '');
      }

      return {
        filename: file,
        className,
        subjectName,
        displayName,
        url: `/uploads/${file}`,
        createdAt: stats.mtime
      };
    }).sort((a, b) => b.createdAt - a.createdAt);

    res.json(filesWithStats);
  });
});

// Delete presentation endpoint
app.delete('/api/presentations/:filename', (req, res) => {
  const { secretCode } = req.body;
  
  if (secretCode !== SECRET_CODE) {
    return res.status(401).json({ error: 'Invalid secret code' });
  }

  const filename = req.params.filename;
  const safeFilename = path.basename(filename); // Prevent directory traversal
  const filePath = path.join(UPLOADS_DIR, safeFilename);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      res.json({ message: 'File deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Explicit route for / just in case express.static misses it
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
