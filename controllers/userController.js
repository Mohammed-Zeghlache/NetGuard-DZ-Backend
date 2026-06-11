// controllers/userController.js
const db = require('../config/db');

// ==================== PROFILE ====================
const getProfile = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, full_name, email, phone_number, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        
        const user = result.rows[0];
        res.json({
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            phone: user.phone_number,
            createdAt: user.created_at
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du profil' });
    }
};

const updateProfile = async (req, res) => {
    const { fullName, email, phone } = req.body;
    
    try {
        const result = await db.query(
            `UPDATE users 
             SET full_name = $1, email = $2, phone_number = $3 
             WHERE id = $4 
             RETURNING id, full_name, email, phone_number`,
            [fullName, email, phone, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        
        const user = result.rows[0];
        res.json({
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            phone: user.phone_number
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
    }
};

// ==================== USER SIGNALS ====================
const generateSignalNumber = () => {
    const prefix = "SIG";
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}${month}${day}-${random}`;
};

const getUserSignals = async (req, res) => {
    const userId = req.user.id;
    
    try {
        const result = await db.query(`
            SELECT s.*, tn.name as technician_name
            FROM user_signals s
            LEFT JOIN techniciens tn ON s.assigned_to = tn.id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
        `, [userId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get user signals error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des signalements' });
    }
};

const getUserSignalById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        const signalResult = await db.query(`
            SELECT s.*, tn.name as technician_name
            FROM user_signals s
            LEFT JOIN techniciens tn ON s.assigned_to = tn.id
            WHERE s.id = $1 AND s.user_id = $2
        `, [id, userId]);
        
        if (signalResult.rows.length === 0) {
            return res.status(404).json({ message: 'Signalement non trouvé' });
        }
        
        const updatesResult = await db.query(`
            SELECT * FROM signal_updates 
            WHERE signal_id = $1 
            ORDER BY created_at ASC
        `, [id]);
        
        const signal = signalResult.rows[0];
        signal.updates = updatesResult.rows;
        
        res.json(signal);
    } catch (error) {
        console.error('Get signal by id error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du signalement' });
    }
};

const createUserSignal = async (req, res) => {
    const {
        phoneNumber, clientCode, problemType, problemTitle, subProblem,
        subProblemLabel, description, priority, contactMethod, availableTimes,
        wilaya, commune, address, lat, lng
    } = req.body;
    
    const userId = req.user.id;
    const signalNumber = generateSignalNumber();
    
    try {
        const result = await db.query(`
            INSERT INTO user_signals (
                user_id, signal_number, phone_number, client_code, problem_type,
                problem_title, sub_problem, sub_problem_label, description, priority,
                contact_method, available_times, wilaya, commune, address, lat, lng, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'nouveau')
            RETURNING *
        `, [userId, signalNumber, phoneNumber, clientCode, problemType, problemTitle,
            subProblem, subProblemLabel, description, priority, contactMethod,
            availableTimes, wilaya, commune, address, lat, lng]);
        
        const newSignal = result.rows[0];
        
        await db.query(`
            INSERT INTO signal_updates (signal_id, message, author)
            VALUES ($1, $2, $3)
        `, [newSignal.id, `Signalement créé par l'utilisateur`, req.user.fullName || 'Client']);
        
        // Notification pour admin (user_id = 1)
        await db.query(`
            INSERT INTO notifications (user_id, message, icon, type, related_id)
            VALUES (1, $1, $2, $3, $4)
        `, [`Nouveau signalement #${signalNumber} - ${problemTitle}`, '📱', 'new_signal', newSignal.id]);
        
        res.status(201).json({
            success: true,
            signal: newSignal,
            message: "Signalement créé avec succès"
        });
    } catch (error) {
        console.error('Create signal error:', error);
        res.status(500).json({ message: "Erreur lors de la création du signalement" });
    }
};

const cancelUserSignal = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        const result = await db.query(`
            UPDATE user_signals 
            SET status = 'annule', updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND status = 'nouveau'
            RETURNING *
        `, [id, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Signalement non trouvé ou déjà traité" });
        }
        
        await db.query(`
            INSERT INTO signal_updates (signal_id, message, author)
            VALUES ($1, $2, $3)
        `, [id, "Signalement annulé par le client", req.user.fullName]);
        
        res.json({ success: true, message: "Signalement annulé" });
    } catch (error) {
        console.error('Cancel signal error:', error);
        res.status(500).json({ message: "Erreur lors de l'annulation" });
    }
};

// ==================== USER NOTIFICATIONS ====================
const getUserNotifications = async (req, res) => {
    const userId = req.user.id;
    
    try {
        const result = await db.query(`
            SELECT * FROM notifications 
            WHERE user_id = $1 OR user_id = 1
            ORDER BY created_at DESC
            LIMIT 50
        `, [userId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: "Erreur lors de la récupération des notifications" });
    }
};

const markNotificationRead = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        await db.query(`
            UPDATE notifications 
            SET read = TRUE 
            WHERE id = $1 AND (user_id = $2 OR user_id = 1)
        `, [id, userId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
};

// ==================== EXPORTS ====================
module.exports = {
    getProfile,
    updateProfile,
    getUserSignals,
    getUserSignalById,
    createUserSignal,
    cancelUserSignal,
    getUserNotifications,
    markNotificationRead
};