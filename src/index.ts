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

let jsonData: any[] = [];

app.use(express.json());

const loadData = async () => {
  const data = await redis.get('excelData');
  if (data) {
    jsonData = JSON.parse(data);
  }
};

loadData();

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = path.resolve(req.file.path);
  const fileBuffer = fs.readFileSync(filePath);

  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellText: false, cellDates: true });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const json = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

  await redis.set('excelData', JSON.stringify(json));

  jsonData = json;

  res.send('File uploaded and data stored in Redis.');
});

app.post('/search', async (req, res) => {
  const query = req.body.query;
  const field = req.body.field;

  if (!query) {
    return res.status(400).send('No query provided.');
  }

  if (!field) {
    return res.status(400).send('No specific search field provided.');
  }
  const results = jsonData.filter(item=>item[field].includes(query));
  res.json(results);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
