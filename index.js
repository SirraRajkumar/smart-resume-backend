const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('resume'), async (req, res) => {
  console.log("Received file:", req.file);

  try {
    const filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const resumeText = data.text;

    console.log("Extracted Resume Text:", resumeText.slice(0, 300));
    console.log("Launching Python script to analyze resume...");

    const pythonProcess = spawn('C:/Users/rajku/AppData/Local/Programs/Python/Python313/python.exe', ['../ml/score.py']);
    let result = '';

    pythonProcess.stdin.write(resumeText);
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python error:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      fs.unlinkSync(filePath);

      try {
        const output = JSON.parse(result);
        res.json(output);
      } catch (err) {
        console.error('Failed to parse JSON from Python:', err);
        res.status(500).json({ error: 'Invalid response from Python script' });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while processing resume' });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
