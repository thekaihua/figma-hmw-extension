import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    message: 'Figma HMW Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ 
    success: true,
    message: 'API is working correctly',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});

export default app;
