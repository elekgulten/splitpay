const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SplitPay backend running' });
});

// Grup oluştur
app.post('/api/groups', (req, res) => {
  const { title, totalAmount, members } = req.body;
  const groupId = Date.now().toString();
  const perPerson = (totalAmount / members).toFixed(2);
  
  res.json({
    success: true,
    group: {
      id: groupId,
      title,
      totalAmount,
      members,
      perPerson,
      paid: 0,
      createdAt: new Date().toISOString()
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SplitPay backend running on port ${PORT}`);
});