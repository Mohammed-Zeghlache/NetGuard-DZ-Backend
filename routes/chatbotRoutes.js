const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OpenAI_API_KEY,
});

// POST /api/chat - Endpoint principal pour le chatbot
router.post('/chat', async (req, res) => {
    try {
        console.log('📥 Message reçu:', req.body.message?.substring(0, 50));
        
        const { message, history, userInfo } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: "Message requis" 
            });
        }
        
        // Construction du prompt système
        const systemPrompt = `Tu es NetGuard DZ, un assistant IA spécialisé en support technique pour Algérie Télécom.

Règles importantes:
1. Sois professionnel, courtois et utile
2. Propose des solutions étape par étape
3. Utilise des émojis pertinents (🔴🟠🟢📡🔧)
4. Si tu ne peux pas résoudre, propose de créer un ticket
5. Mentionne les numéros d'urgence (1055) si nécessaire
6. Réponds en français

Informations utilisateur:
- Nom: ${userInfo?.name || 'Client'}
- Localisation: ${userInfo?.location || 'Algérie'}

Réponds de manière naturelle, utile et bien formatée.`;

        const messages = [
            { role: "system", content: systemPrompt }
        ];
        
        // Ajout de l'historique si disponible
        if (history && Array.isArray(history) && history.length > 0) {
            const recentHistory = history.slice(-10);
            recentHistory.forEach(msg => {
                messages.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text
                });
            });
        }
        
        messages.push({ role: "user", content: message });
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024,
        });
        
        const responseText = completion.choices[0].message.content;
        console.log('✅ Réponse générée');
        
        res.json({ 
            success: true, 
            message: responseText,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erreur OpenAI:', error.message);
        res.status(500).json({ 
            success: false, 
            error: "Erreur lors de la communication avec l'assistant",
            fallback: true
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        aiAvailable: !!process.env.OpenAI_API_KEY,
        version: '1.0.0'
    });
});

module.exports = router;