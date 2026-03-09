const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUserPermissions,
  updateUser,
  createUser,
  deleteUser,
  getAllRoles,
  createRole,
} = require('../controllers/userAccessController');
const { getDataSourceUsers } = require('../controllers/dataSourceController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/users', getAllUsers);
router.post('/users', createUser);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/permissions', updateUserPermissions);

router.get('/roles', getAllRoles);
router.post('/roles', createRole);

router.get('/datasource-users', getDataSourceUsers);

module.exports = router;
