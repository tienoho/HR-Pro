
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support large imports
app.use(express.static(path.join(__dirname, 'dist'))); // Serve built frontend if available

// --- MOCK DATA STORE ---
const mockEmployees = [];

const mockShifts = [];

let db = {
  employees: [...mockEmployees],
  shifts: [...mockShifts],
  logs: [],
  requests: [],
  holidays: [],
  schedules: []
};

// --- HELPER FUNCTIONS ---
const response = (res, data, success = true, message = '') => {
  res.json({ success, data, message });
};

const paginate = (array, page = 1, limit = 1000) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  return array.slice(start, end);
};

// --- API ROUTES ---

// 1. Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  // Mock login - allow any for demo, or specific
  if (username === 'admin' && password === 'admin') {
     return response(res, {
         accessToken: 'mock_access_token_' + Date.now(),
         refreshToken: 'mock_refresh_token_' + Date.now(),
         user: { id: 'u1', username: 'admin', fullName: 'System Admin', role: 'ADMIN' }
     });
  }
  return res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập (admin/admin)' });
});

app.post('/api/auth/refresh', (req, res) => {
  response(res, { accessToken: 'new_mock_token_' + Date.now(), refreshToken: 'new_mock_refresh_' + Date.now() });
});

// 2. Employees
app.get('/api/employees', (req, res) => {
  const { page, limit } = req.query;
  const docs = paginate(db.employees, Number(page)||1, Number(limit)||1000);
  response(res, docs); // Frontend defines PaginatedResponse but mainly expects array in data property if simple lookup? 
  // Wait, types/api.ts says PaginatedResponse has { data: T[], pagination: {} }
  // storage.ts getEmployees calls apiClient.get<PaginatedResponse<EmployeeApiModel>>.
  // So I should return that structure.
  
  // FIX: Return Paginated Structure
  /* 
     But storage.ts handles fallback and mapping. 
     Let's standardise on { success: true, data: { data: [], pagination: {} } }
     Wait, apiClient returns response.json(). 
     ApiResponse<T> is { success: boolean, data: T }.
     So data should be PaginatedResponse.
  */
  const result = {
      data: docs,
      pagination: {
          page: Number(page)||1,
          limit: Number(limit)||1000,
          total: db.employees.length,
          totalPages: Math.ceil(db.employees.length / (Number(limit)||1000))
      }
  };
   res.json({ success: true, data: result });
});

app.post('/api/employees', (req, res) => {
  const newEmp = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
  db.employees.push(newEmp);
  response(res, newEmp);
});

app.put('/api/employees/:id', (req, res) => {
  const idx = db.employees.findIndex(e => e.id === req.params.id);
  if (idx !== -1) {
      db.employees[idx] = { ...db.employees[idx], ...req.body, updatedAt: new Date().toISOString() };
      response(res, db.employees[idx]);
  } else {
      res.status(404).json({ success: false, message: 'Not found' });
  }
});

app.delete('/api/employees/:id', (req, res) => {
  db.employees = db.employees.filter(e => e.id !== req.params.id);
  response(res, { id: req.params.id });
});

// 3. Shifts
app.get('/api/shifts', (req, res) => {
  response(res, db.shifts);
});
app.post('/api/shifts', (req, res) => {
  const newShift = { id: Date.now().toString(), ...req.body };
  db.shifts.push(newShift);
  response(res, newShift);
});
app.put('/api/shifts/:id', (req, res) => {
  const idx = db.shifts.findIndex(s => s.id === req.params.id);
  if (idx !== -1) {
    db.shifts[idx] = { ...db.shifts[idx], ...req.body };
    response(res, db.shifts[idx]);
  } else res.status(404).json({success:false});
});
app.delete('/api/shifts/:id', (req, res) => {
  db.shifts = db.shifts.filter(s => s.id !== req.params.id);
  response(res, {id: req.params.id});
});

// 4. Attendance Logs
app.get('/api/attendance-logs', (req, res) => {
  // Filter by date range if needed? For now just return all
  response(res, db.logs);
});
app.post('/api/attendance-logs', (req, res) => {
    // Check if bulk or single
    if (req.body.logs && Array.isArray(req.body.logs)) {
        // Bulk
        const newLogs = req.body.logs.map(l => ({ ...l, id: Date.now() + Math.random().toString(), createdAt: new Date().toISOString() }));
        db.logs.push(...newLogs);
        response(res, { success: true, imported: newLogs.length });
    } else {
        // Single
        const newLog = { id: Date.now().toString(), ...req.body };
        db.logs.push(newLog);
        response(res, newLog);
    }
});

// 5. Requests
app.get('/api/requests', (req, res) => {
   response(res, db.requests);
});
app.post('/api/requests', (req, res) => {
   const newReq = { id: Date.now().toString(), status: 'PENDING', ...req.body };
   db.requests.push(newReq);
   response(res, newReq);
});
app.put('/api/requests/:id', (req, res) => {
    const idx = db.requests.findIndex(r => r.id === req.params.id);
    if(idx!==-1) {
        db.requests[idx] = { ...db.requests[idx], ...req.body };
        response(res, db.requests[idx]);
    } else res.status(404).json({success:false});
});
app.post('/api/requests/:id/review', (req, res) => {
    const { status } = req.body;
    const idx = db.requests.findIndex(r => r.id === req.params.id);
    if(idx!==-1) {
        db.requests[idx].status = status;
        db.requests[idx].updatedAt = new Date().toISOString();
        response(res, db.requests[idx]);
    } else res.status(404).json({success:false});
});
app.delete('/api/requests/:id', (req, res) => {
    db.requests = db.requests.filter(r => r.id !== req.params.id);
    response(res, {id: req.params.id});
});

// 6. Holidays
app.get('/api/holidays', (req, res) => {
    response(res, db.holidays);
});
app.post('/api/holidays', (req, res) => {
    const h = { id: Date.now().toString(), ...req.body };
    db.holidays.push(h);
    response(res, h);
});
app.delete('/api/holidays/:id', (req, res) => {
    db.holidays = db.holidays.filter(h => h.id !== req.params.id);
    response(res, {id: req.params.id});
});

// 7. Schedules & Assignments
app.get('/api/schedules', (req, res) => {
    response(res, db.schedules);
});
app.post('/api/shifts/assign', (req, res) => {
    // Single assignment or bulk? Spec says single POST /shifts/assign usually?
    // storage.ts calls POST /shifts/assign for single item inside a loop.
    // So logic:
    const { employeeId, shiftId, startDate, endDate } = req.body;
    // Simple: Add to schedules
    // Check overlap? Mock doesn't care much.
    // Spec: "assign" might imply range expansion.
    // But frontend `saveSchedules` passes single date=startDate=endDate.
    const newSched = { employeeId, shiftId, date: startDate };
    
    // Remove existing for same day
    db.schedules = db.schedules.filter(s => !(s.employeeId === employeeId && s.date === startDate));
    db.schedules.push(newSched);
    
    response(res, newSched);
});

// Fallback for SPA
app.get('*', (req, res) => {
    // Helper to list available routes if api 404
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
    }
    // Serve index.html
    // Serve index.html from dist
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`HR-Pro Mock Server running on port ${PORT}`);
  console.log(`- API Base: http://localhost:${PORT}/api`);
});
