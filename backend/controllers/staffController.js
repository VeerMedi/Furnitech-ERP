const Staff = require('../models/vlite/Staff');

// Get all staff
exports.getAllStaff = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const staff = await Staff.find({ tenantId }).sort({ createdAt: -1 });
    res.status(200).json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Error fetching staff', error: error.message });
  }
};

// Get staff by ID
exports.getStaffById = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { id } = req.params;

    const staff = await Staff.findOne({ _id: id, tenantId });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.status(200).json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Error fetching staff', error: error.message });
  }
};

// Create new staff
exports.createStaff = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const staffData = {
      ...req.body,
      tenantId
    };

    const staff = new Staff(staffData);
    await staff.save();

    res.status(201).json({ message: 'Staff created successfully', staff });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: 'Error creating staff', error: error.message });
  }
};

// Update staff
exports.updateStaff = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { id } = req.params;

    const staff = await Staff.findOne({ _id: id, tenantId });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const allowedUpdates = ['name', 'address', 'contact', 'email', 'salary', 'status', 'designation', 'department'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        staff[field] = req.body[field];
      }
    });

    await staff.save();
    res.status(200).json({ message: 'Staff updated successfully', staff });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ message: 'Error updating staff', error: error.message });
  }
};

// Delete staff
exports.deleteStaff = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { id } = req.params;

    const staff = await Staff.findOneAndDelete({ _id: id, tenantId });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.status(200).json({ message: 'Staff deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ message: 'Error deleting staff', error: error.message });
  }
};
