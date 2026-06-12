const express = require('express');
const cors = require('cors');
const pool = require('./config/db'); 
require('dotenv').config();

// Import routes existantes
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admins');
const technicianRoutes = require('./routes/technicians');
const signalRoutes = require('./routes/signals');
const ticketRoutes = require('./routes/tickets');

// Import chat API routes
const chatRoutes = require('./api/chat/route');

const app = express();
const PORT = process.env.PORT ;

// Middleware
app.use(cors({
  origin: ['https://netguardz.netlify.app', 'http://localhost:3000']
}));
app.use(express.json());

// ==================== ROUTES ====================

// Routes existantes
app.use('/api/users', userRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/tickets', ticketRoutes);

// NOUVELLES ROUTES API CHAT
app.use('/api', chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Algerie Telecom API is running',
        endpoints: {
            chat: 'POST /api/chat',
            analyze: 'POST /api/analyze-network',
            speedTest: 'POST /api/interpret-speed',
            health: 'GET /api/health'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   POST /api/users/signup`);
    console.log(`   POST /api/users/login`);
    console.log(`   POST /api/admins/signup`);
    console.log(`   POST /api/admins/login`);
    console.log(`   GET  /api/technicians`);
    console.log(`   POST /api/technicians`);
    console.log(`   POST /api/signals`);
    console.log(`   POST /api/tickets/chatbot`);
    console.log(`\n🤖 Chat API Endpoints:`);
    console.log(`   POST /api/chat - Envoyer un message`);
    console.log(`   POST /api/analyze-network - Diagnostiquer un problème`);
    console.log(`   POST /api/interpret-speed - Analyser test de débit`);
    console.log(`   GET  /api/health - Vérifier l'état du service`);
    
    if (process.env.OpenAI_API_KEY) {
        console.log(`\n✅ OpenAI API is ACTIVE and ready!`);
    } else {
        console.log(`\n⚠️ OpenAI_API_KEY not found - Mode local uniquement`);
    }
});
