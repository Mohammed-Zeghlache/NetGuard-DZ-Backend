// api/chat/controller.js
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI (optionnel)
let openai = null;
if (process.env.OpenAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OpenAI_API_KEY,
    });
}

// Health check controller
const healthCheck = async (req, res) => {
    try {
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            aiAvailable: !!process.env.OpenAI_API_KEY,
            version: '1.0.0'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Send message controller (Mode local uniquement)
const sendMessage = async (req, res) => {
    try {
        console.log('📥 Message reçu:', req.body.message?.substring(0, 50));
        
        const { message } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: "Message requis" 
            });
        }
        
        // Réponses basées sur les mots-clés (Mode local)
        let response = "🤖 **Assistant NetGuard DZ**\n\nJe suis votre assistant technique. ";
        
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes("fibre") || lowerMessage.includes("fibre optique")) {
            response = "🔮 **Fibre optique**\n\nLa fibre optique offre:\n• Débits jusqu'à 1 Gb/s\n• Latence très faible (<5ms)\n• Connexion stable\n• Pas d'interférences\n\n📞 Pour plus d'informations, contactez le 1055.";
        } 
        else if (lowerMessage.includes("panne") || lowerMessage.includes("internet")) {
            response = "🔴 **Diagnostic panne internet**\n\n**Solutions:**\n1. Vérifiez les voyants du modem\n2. Redémarrez le modem (débranchez 60 secondes)\n3. Vérifiez les câbles\n4. Testez avec un autre appareil\n\n❓ Si le problème persiste, je peux créer un ticket.";
        }
        else if (lowerMessage.includes("lent") || lowerMessage.includes("vitesse")) {
            response = "⚡ **Connexion lente**\n\n**Optimisations:**\n1. Redémarrez votre modem\n2. Limitez le nombre d'appareils connectés\n3. Utilisez la bande 5GHz\n4. Éloignez le modem des murs\n\n❓ Toujours lent ? Créez un ticket pour assistance.";
        }
        else if (lowerMessage.includes("wifi")) {
            response = "📶 **Problèmes WiFi**\n\n**Solutions:**\n1. Vérifiez le mot de passe\n2. Redémarrez le routeur\n3. Oubliez puis reconnectez-vous\n4. Changez de canal (1,6,11)\n\n📞 Assistance: 1055";
        }
        else if (lowerMessage.includes("adsl")) {
            response = "📡 **Problèmes ADSL**\n\n**Vérifications:**\n• Débranchez TOUS les téléphones\n• Testez sur la prise d'arrivée\n• Remplacez le filtre ADSL\n\n📞 Intervention requise? Créez un ticket.";
        }
        else if (lowerMessage.includes("ticket") || lowerMessage.includes("créer")) {
            response = "🎫 **Création de ticket**\n\nPour créer un ticket, répondez aux questions suivantes:\n\n1️⃣ Quel est votre nom complet ?";
        }
        else if (lowerMessage.includes("bonjour") || lowerMessage.includes("salut")) {
            response = "🌟 **Bonjour !**\n\nJe suis l'assistant NetGuard DZ. Comment puis-je vous aider ?\n\n🔧 **Je peux vous aider avec:**\n• Diagnostiquer une panne\n• Optimiser une connexion lente\n• Résoudre des problèmes WiFi/ADSL/Fibre\n• Créer un ticket de support\n• Vérifier l'état du réseau\n\n**Que souhaitez-vous ?**";
        }
        else {
            response = "🤖 **Assistant NetGuard DZ**\n\nJe peux vous aider avec:\n\n• 🔴 **Panne internet** - \"pas internet\"\n• ⚡ **Connexion lente** - \"internet lent\"\n• 📶 **Problèmes WiFi** - \"wifi ne marche pas\"\n• 📡 **Problèmes ADSL** - \"adsl instable\"\n• 🔮 **Fibre optique** - \"fibre optique\"\n• 🎫 **Créer un ticket** - \"créer un ticket\"\n\n**Décrivez votre problème:**";
        }
        
        res.json({ 
            success: true, 
            message: response,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            error: "Erreur lors du traitement du message"
        });
    }
};

// Analyze network issue controller
const analyzeNetwork = async (req, res) => {
    try {
        const { symptoms } = req.body;
        
        const response = `🔍 **Analyse des symptômes**\n\nSymptômes détectés: ${symptoms}\n\n📋 Recommandation: Effectuez un redémarrage complet du modem et vérifiez les connexions.\n\n📞 Contactez le 1055 si le problème persiste.`;
        
        res.json({ success: true, diagnosis: response });
        
    } catch (error) {
        console.error('Analysis Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Interpret speed test results controller
const interpretSpeed = async (req, res) => {
    try {
        const { download, upload, ping } = req.body;
        
        let quality = "Moyen";
        let color = "🟡";
        
        if (download >= 50) {
            quality = "Excellent";
            color = "🟢";
        } else if (download >= 20) {
            quality = "Bon";
            color = "🔵";
        } else if (download >= 8) {
            quality = "Moyen";
            color = "🟡";
        } else {
            quality = "Lent";
            color = "🔴";
        }
        
        const response = `📊 **Analyse du test de débit**\n\n• Download: ${download} Mbps\n• Upload: ${upload} Mbps\n• Ping: ${ping} ms\n\n**Évaluation:** ${color} ${quality}\n\n**Recommandations:**\n${download < 8 ? "• Contactez le support technique\n" : ""}• Redémarrez votre modem si nécessaire\n• Testez à nouveau à une heure différente`;
        
        res.json({ success: true, analysis: response });
        
    } catch (error) {
        console.error('Speed Test Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    healthCheck,
    sendMessage,
    analyzeNetwork,
    interpretSpeed
};