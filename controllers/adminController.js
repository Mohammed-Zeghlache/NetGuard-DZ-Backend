// controllers/adminController.js
const db = require('../config/db');

// ==================== DASHBOARD STATS ====================
const getStats = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM pannes WHERE status = 'active') as pannes_actives,
                (SELECT COUNT(*) FROM techniciens) as total_techniciens,
                (SELECT COUNT(*) FROM tickets WHERE status != 'resolu') as tickets_en_cours,
                (SELECT COUNT(*) FROM user_signals WHERE status = 'nouveau') as nouveaux_signals,
                (SELECT COUNT(*) FROM users) as total_users
        `);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
    }
};

// ==================== TICKETS MANAGEMENT ====================
const getTickets = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = `
            SELECT t.*, tn.name as technician_name
            FROM tickets t
            LEFT JOIN techniciens tn ON t.assigned_to = tn.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (status && status !== 'all') {
            query += ` AND t.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            query += ` AND (t.ticket_number ILIKE $${paramIndex} 
                       OR t.full_name ILIKE $${paramIndex} 
                       OR t.phone ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY t.created_at DESC`;

        const result = await db.query(query, params);
        
        const tickets = result.rows.map(ticket => ({
            id: ticket.id,
            ticketNumber: ticket.ticket_number,
            fullName: ticket.full_name,
            phone: ticket.phone,
            email: ticket.email,
            location: ticket.location,
            problemType: ticket.problem_type,
            problemDescription: ticket.problem_description,
            priority: ticket.priority,
            status: ticket.status,
            source: ticket.source,
            assignedTo: ticket.assigned_to,
            assignedToName: ticket.technician_name,
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at
        }));
        
        res.json(tickets);
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des tickets' });
    }
};

const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const ticketResult = await db.query(`
            SELECT t.*, tn.name as technician_name
            FROM tickets t
            LEFT JOIN techniciens tn ON t.assigned_to = tn.id
            WHERE t.id = $1
        `, [id]);
        
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }
        
        const ticket = ticketResult.rows[0];
        
        const updatesResult = await db.query(`
            SELECT * FROM ticket_updates 
            WHERE ticket_id = $1 
            ORDER BY created_at DESC
        `, [id]);
        
        const formattedTicket = {
            id: ticket.id,
            ticketNumber: ticket.ticket_number,
            fullName: ticket.full_name,
            phone: ticket.phone,
            email: ticket.email,
            location: ticket.location,
            problemType: ticket.problem_type,
            problemDescription: ticket.problem_description,
            priority: ticket.priority,
            status: ticket.status,
            source: ticket.source,
            assignedTo: ticket.assigned_to,
            assignedToName: ticket.technician_name,
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at,
            updates: updatesResult.rows.map(update => ({
                message: update.message,
                timestamp: update.created_at,
                author: update.author,
                type: update.type
            }))
        };
        
        res.json(formattedTicket);
    } catch (error) {
        console.error('Get ticket by ID error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du ticket' });
    }
};

const updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const result = await db.query(`
            UPDATE tickets 
            SET status = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING *
        `, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }
        
        const statusMessages = {
            'nouveau': '🆕 Nouveau',
            'en_cours': '🔄 En cours',
            'resolu': '✅ Résolu'
        };
        
        await db.query(`
            INSERT INTO ticket_updates (ticket_id, message, author, type)
            VALUES ($1, $2, $3, $4)
        `, [id, `Statut changé : ${statusMessages[status] || status}`, 'Administrateur', 'status']);
        
        res.json({ success: true, ticket: result.rows[0] });
    } catch (error) {
        console.error('Update ticket status error:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du statut' });
    }
};

const assignTechnicianToTicket = async (req, res) => {
    const { id } = req.params;
    const { technicianId } = req.body;
    
    try {
        const techResult = await db.query('SELECT name, specialty FROM techniciens WHERE id = $1', [technicianId]);
        
        if (techResult.rows.length === 0) {
            return res.status(404).json({ message: 'Technicien non trouvé' });
        }
        
        const technician = techResult.rows[0];
        
        const result = await db.query(`
            UPDATE tickets 
            SET assigned_to = $1, status = 'en_cours', updated_at = NOW()
            WHERE id = $2 
            RETURNING *
        `, [technicianId, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }
        
        await db.query(`
            INSERT INTO ticket_updates (ticket_id, message, author, type)
            VALUES ($1, $2, $3, $4)
        `, [id, `Ticket assigné à ${technician.name} (${technician.specialty})`, 'Administrateur', 'assignment']);
        
        res.json({ success: true, ticket: result.rows[0] });
    } catch (error) {
        console.error('Assign technician error:', error);
        res.status(500).json({ message: 'Erreur lors de l\'assignation' });
    }
};

const addTicketResponse = async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    
    try {
        const ticketCheck = await db.query('SELECT id FROM tickets WHERE id = $1', [id]);
        if (ticketCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }
        
        await db.query(`
            INSERT INTO ticket_updates (ticket_id, message, author, type)
            VALUES ($1, $2, $3, $4)
        `, [id, message, 'Administrateur', 'response']);
        
        res.json({ success: true, message: 'Réponse ajoutée' });
    } catch (error) {
        console.error('Add ticket response error:', error);
        res.status(500).json({ message: 'Erreur lors de l\'ajout de la réponse' });
    }
};

const getTicketConversation = async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(`
            SELECT * FROM ticket_updates 
            WHERE ticket_id = $1 
            ORDER BY created_at ASC
        `, [id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
};

const getTechniciansList = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, specialty, status, phone 
            FROM techniciens 
            ORDER BY name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get technicians list error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des techniciens' });
    }
};

// ==================== PANNES MANAGEMENT ====================
const getPannes = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM pannes 
            WHERE status = 'active' 
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get pannes error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des pannes' });
    }
};

const createPanne = async (req, res) => {
    const { title, location, lat, lng, type, severity, description, affected_customers } = req.body;
    
    try {
        const result = await db.query(`
            INSERT INTO pannes (title, location, lat, lng, type, severity, description, affected_customers)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [title, location, lat || null, lng || null, type, severity, description, affected_customers || 0]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create panne error:', error);
        res.status(500).json({ message: 'Erreur lors de la création de la panne' });
    }
};

const resolvePanne = async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(`
            UPDATE pannes 
            SET status = 'resolved', resolved_at = NOW() 
            WHERE id = $1 
            RETURNING *
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Panne non trouvée' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Resolve panne error:', error);
        res.status(500).json({ message: 'Erreur lors de la résolution' });
    }
};

const deletePanne = async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query('DELETE FROM pannes WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Panne non trouvée' });
        }
        
        res.json({ message: 'Panne supprimée' });
    } catch (error) {
        console.error('Delete panne error:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression' });
    }
};

// ==================== TECHNICIENS MANAGEMENT ====================
const getTechniciens = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM techniciens 
            ORDER BY name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get techniciens error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des techniciens' });
    }
};

const createTechnicien = async (req, res) => {
    const { name, email, phone, specialty, vehicle, vehicle_plate, work_zone, status } = req.body;
    
    try {
        const result = await db.query(`
            INSERT INTO techniciens (name, email, phone, specialty, vehicle, vehicle_plate, work_zone, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [name, email, phone, specialty, vehicle || null, vehicle_plate || null, work_zone, status || 'disponible']);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create technicien error:', error);
        res.status(500).json({ message: 'Erreur lors de la création du technicien' });
    }
};

const updateTechnicienStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const result = await db.query(`
            UPDATE techniciens 
            SET status = $1, last_active = NOW() 
            WHERE id = $2 
            RETURNING *
        `, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Technicien non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update technicien status error:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    }
};

const deleteTechnicien = async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query('DELETE FROM techniciens WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Technicien non trouvé' });
        }
        
        res.json({ message: 'Technicien supprimé' });
    } catch (error) {
        console.error('Delete technicien error:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression' });
    }
};

// ==================== SIGNALEMENTS MANAGEMENT (Admin view) ====================
const getSignals = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, u.full_name as user_name, tn.name as technician_name
            FROM user_signals s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN techniciens tn ON s.assigned_to = tn.id
            ORDER BY s.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get signals error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des signalements' });
    }
};

const updateSignalStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const result = await db.query(`
            UPDATE user_signals 
            SET status = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING *
        `, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Signalement non trouvé' });
        }
        
        await db.query(`
            INSERT INTO signal_updates (signal_id, message, author)
            VALUES ($1, $2, $3)
        `, [id, `Statut changé à : ${status}`, 'Administrateur']);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update signal status error:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    }
};

const assignSignalTechnician = async (req, res) => {
    const { id } = req.params;
    const { technicianId } = req.body;
    
    try {
        const techResult = await db.query('SELECT name FROM techniciens WHERE id = $1', [technicianId]);
        const technicianName = techResult.rows[0]?.name || 'Technicien';
        
        const result = await db.query(`
            UPDATE user_signals 
            SET assigned_to = $1, status = 'en_cours', updated_at = NOW() 
            WHERE id = $2 
            RETURNING *
        `, [technicianId, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Signalement non trouvé' });
        }
        
        await db.query(`
            INSERT INTO signal_updates (signal_id, message, author)
            VALUES ($1, $2, $3)
        `, [id, `Signalement assigné à ${technicianName}`, 'Administrateur']);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Assign signal technician error:', error);
        res.status(500).json({ message: 'Erreur lors de l\'assignation' });
    }
};

const addSignalResponse = async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    
    try {
        const signalCheck = await db.query('SELECT id FROM user_signals WHERE id = $1', [id]);
        if (signalCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Signalement non trouvé' });
        }
        
        await db.query(`
            INSERT INTO signal_updates (signal_id, message, author)
            VALUES ($1, $2, $3)
        `, [id, `📝 Réponse administrateur: ${message}`, 'Administrateur']);
        
        res.json({ success: true, message: 'Réponse ajoutée' });
    } catch (error) {
        console.error('Add signal response error:', error);
        res.status(500).json({ message: 'Erreur lors de l\'ajout de la réponse' });
    }
};

const deleteSignal = async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query('DELETE FROM user_signals WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Signalement non trouvé' });
        }
        
        res.json({ message: 'Signalement supprimé' });
    } catch (error) {
        console.error('Delete signal error:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression' });
    }
};

// ==================== CREATE TICKET FROM CHATBOT ====================
const createTicketFromChatbot = async (req, res) => {
    const { fullName, phone, location, problemType, problemDescription, priority, source } = req.body;
    
    // Log pour déboguer
    console.log("📝 [CHATBOT] Données reçues:", { fullName, phone, location });
    
    // Validation
    if (!fullName || !phone) {
        console.error("❌ [CHATBOT] Données manquantes");
        return res.status(400).json({ 
            success: false, 
            message: "Nom et téléphone sont requis" 
        });
    }
    
    try {
        const ticketNumber = `TKT-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;
        
        const result = await db.query(`
            INSERT INTO tickets (
                ticket_number, 
                full_name, 
                phone, 
                location, 
                problem_type, 
                problem_description, 
                priority, 
                status, 
                source, 
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'nouveau', $8, NOW())
            RETURNING *
        `, [
            ticketNumber, 
            fullName, 
            phone, 
            location || 'Non spécifiée', 
            problemType || 'Non spécifié', 
            problemDescription || 'Aucune description',
            priority || 'medium', 
            source || 'chatbot'
        ]);
        
        // Ajouter une mise à jour initiale
        await db.query(`
            INSERT INTO ticket_updates (ticket_id, message, author, type)
            VALUES ($1, $2, $3, $4)
        `, [result.rows[0].id, `Ticket créé via ${source || 'chatbot'} par ${fullName}`, 'Chatbot IA', 'creation']);
        
        console.log("✅ [CHATBOT] Ticket créé avec succès:", ticketNumber);
        
        res.status(201).json({
            success: true,
            ticketNumber: ticketNumber,
            ticket: result.rows[0],
            message: "Ticket créé avec succès"
        });
    } catch (error) {
        console.error('❌ [CHATBOT] Erreur:', error.message);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors de la création du ticket: " + error.message
        });
    }
};

// ==================== EXPORTS ====================
module.exports = {
    // Dashboard
    getStats,
    
    // Tickets
    getTickets,
    getTicketById,
    updateTicketStatus,
    assignTechnicianToTicket,
    addTicketResponse,
    getTicketConversation,
    getTechniciansList,
    createTicketFromChatbot,
    
    // Pannes
    getPannes,
    createPanne,
    resolvePanne,
    deletePanne,
    
    // Techniciens
    getTechniciens,
    createTechnicien,
    updateTechnicienStatus,
    deleteTechnicien,
    
    // Signalements
    getSignals,
    updateSignalStatus,
    assignSignalTechnician,
    addSignalResponse,
    deleteSignal
};