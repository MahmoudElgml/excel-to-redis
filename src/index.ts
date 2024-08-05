import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;
const redis = new Redis();
const upload = multer({ dest: 'uploads/' });

// Middleware to parse JSON bodies
app.use(express.json());

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = path.resolve(req.file.path);
  const fileBuffer = fs.readFileSync(filePath);

  // Read the uploaded file with proper encoding
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellText: false, cellDates: true });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert sheet to JSON
  const json = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

  // Store JSON in Redis
  await redis.set('excelData', JSON.stringify(json));

  res.send('File uploaded and data stored in Redis.');
});

app.post('/search', async (req, res) => {
  const query = req.body.q;

  if (!query) {
    return res.status(400).send('No query provided.');
  }

  // Get data from Redis
  const data = await redis.get('excelData');

  if (!data) {
    return res.status(404).send('No data found.');
  }

  // Parse JSON
  const jsonData = JSON.parse(data);

  // Filter data based on query
  const results = jsonData.filter((item: any) => {
    return Object.values(item).some((value: any) => 
      String(value).toLowerCase().includes(query.toLowerCase())
    );
  });

  res.json(results);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
