const express = require('express');
const router = express.Router();
const {
  getAllRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/roleController');
const { authenticate, authorizeOrgAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.route('/')
  .get(getAllRoles)
  .post(authorizeOrgAdmin, createRole);

router.route('/:id')
  .get(getRole)
  .put(authorizeOrgAdmin, updateRole)
  .delete(authorizeOrgAdmin, deleteRole);

module.exports = router;
