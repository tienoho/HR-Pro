
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Phục vụ các file tĩnh trong thư mục hiện tại
app.use(express.static(path.join(__dirname)));

// --- API BACKEND MOCK (Theo Blueprint) ---
// Đây là nơi bạn sẽ viết các logic DB thật sau này
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', message: 'HR Pro API is running' });
});

// Endpoint cho Nhân viên
app.get('/api/v1/employees', (req, res) => {
  // Logic lấy từ DB sẽ ở đây
  res.json({ message: "Endpoint đang được phát triển. Hiện đang dùng dữ liệu Mock từ Frontend." });
});

// Tất cả các request khác sẽ trả về index.html (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
