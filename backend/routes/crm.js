const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  getDashboardStats, 
  getLeads, 
  createLead, 
  updateLead, 
  deleteLead,
  updateLeadStage
} = require('../controllers/crmController');

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/leads', getLeads);
router.post('/leads', createLead);
router.put('/leads/:id', updateLead);
router.delete('/leads/:id', deleteLead);
router.patch('/leads/:id/stage', updateLeadStage);

module.exports = router;
