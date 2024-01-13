//framework untuk membangun web ini
const express = require('express');
//untuk mengelola pengunggahan file pada server
const multer = require('multer');
//library Node.js kriptografi yang berguna untuk mengamankan dan melindungi data
const crypto = require('crypto');
//untuk membaca, menulis, menghapus, memindahkan, dan mengelola berkas dan direktori pada sistem file.
const fs = require('fs');
//untuk mengelola jalur (path) file dan direktori 
const path = require('path');
//instance
const app = express();
//protokol untuk menjalankan http
const port = 4000;

// Mengizinkan Express untuk membaca data dari form
app.use(express.static(path.join(__dirname, 'public')));

// Menampilkan halaman index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan pada http://localhost:${port}`);
});

// Static file middleware
app.use(express.static(path.join(__dirname, 'public')));

app.get('/public', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
});

app.use((req, res, next) => {
  if (!fs.existsSync('encryption.log')) {
    fs.writeFileSync('encryption.log', '');
  }

  if (!fs.existsSync('decryption.log')) {
    fs.writeFileSync('decryption.log', '');
  }

  next();
});

// ...

const storage = multer.diskStorage({
  destination: './uploads',
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

// Endpoint untuk mengenkripsi file
app.post('/encrypt', upload.single('file'), (req, res) => {
  const { file } = req;

  // Baca file yang diunggah
  const data = fs.readFileSync(file.path);

  // Enkripsi file menggunakan AES-256
  const key = req.body.key; // Kunci yang sama digunakan untuk enkripsi dan dekripsi
  const cipher = crypto.createCipher('aes-256-cbc', key);
  const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);

  // Simpan file terenkripsi
  fs.writeFileSync(`./uploads/encrypted_${file.originalname}`, encryptedData);

  // Tambahkan entri riwayat enkripsi ke file log
  fs.appendFileSync('encryption.log', `${file.originalname}\n`);

  // Hapus file asli yang diunggah
  fs.unlinkSync(file.path);

  res.redirect('/');
});

// Endpoint untuk mendekripsi file
app.post('/decrypt', upload.single('file'), (req, res) => {
  const { file } = req;

  // Baca file yang diunggah
  const data = fs.readFileSync(file.path);

  // Dekripsi file menggunakan AES-256
  const key = req.body.key; // Kunci yang sama digunakan untuk enkripsi dan dekripsi
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  const decryptedData = Buffer.concat([decipher.update(data), decipher.final()]);

  // Simpan file terdekripsi
  fs.writeFileSync(`./uploads/decrypted_${file.originalname}`, decryptedData);

  // Tambahkan entri riwayat dekripsi ke file log
  fs.appendFileSync('decryption.log', `${file.originalname}\n`);

  // Hapus file asli yang diunggah
  fs.unlinkSync(file.path);

  res.redirect('/');
});

// ...

app.get('/', (req, res) => {
  const encryptionLog = fs.readFileSync('encryption.log', 'base64');
  const decryptionLog = fs.readFileSync('decryption.log', 'base64');

  // Split entri-entri log menjadi array berdasarkan baris baru
  const encryptionEntries = encryptionLog.split('\n').filter(entry => entry !== '');
  const decryptionEntries = decryptionLog.split('\n').filter(entry => entry !== '');

  // Fungsi utilitas untuk menghasilkan HTML untuk setiap entri log
  const generateLogEntryHTML = (filename, type) => {
    const filePath = `./uploads/${type}_${filename}`;

    return `
      <div>
        <span>${filename}</span>
        <a href="/download/${type}/${filename}" download> Download Disini</a>
      </div>
    `;
  };

  const encryptionLogHTML = encryptionEntries.map(filename => generateLogEntryHTML(filename, 'encrypted')).join('');
  const decryptionLogHTML = decryptionEntries.map(filename => generateLogEntryHTML(filename, 'decrypted')).join('');

  fs.readFile('./public/enkripsi.html', 'base64', (err, data) => {
    if (err) {
      res.status(500).send('Terjadi kesalahan pada server.');
      return;
    }

    const modifiedHTML = data.replace('{{encryptionLogHTML}}', encryptionLogHTML).replace('{{decryptionLogHTML}}', decryptionLogHTML);

    res.send(modifiedHTML);
  });
});

app.get('/download/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const filePath = `./uploads/${type}_${filename}`;
  res.download(filePath);
});

app.listen(3000, () => {
  console.log('Server berjalan pada port 4000');
});
