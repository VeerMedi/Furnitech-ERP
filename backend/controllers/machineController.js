const Machine = require('../models/vlite/Machine');
const logger = require('../utils/logger');

// Get all machines with filters
exports.getAllMachines = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { type, status, search } = req.query;

    const filter = { organizationId };

    if (type) filter.type = type;
    if (status) filter.operationalStatus = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { machineCode: { $regex: search, $options: 'i' } }
      ];
    }

    const machines = await Machine.find(filter)
      .populate('qualifiedOperators', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: machines.length,
      data: machines
    });
  } catch (error) {
    logger.error('Error fetching machines:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching machines',
      error: error.message
    });
  }
};

// Get machine by ID
exports.getMachineById = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const machine = await Machine.findOne({
      _id: req.params.id,
      organizationId
    }).populate('qualifiedOperators', 'name email');

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    res.status(200).json({
      success: true,
      data: machine
    });
  } catch (error) {
    logger.error('Error fetching machine:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching machine',
      error: error.message
    });
  }
};

// Create machine
exports.createMachine = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    const machineData = {
      ...req.body,
      organizationId
    };

    const machine = await Machine.create(machineData);

    res.status(201).json({
      success: true,
      message: 'Machine created successfully',
      data: machine
    });
  } catch (error) {
    logger.error('Error creating machine:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating machine',
      error: error.message
    });
  }
};

// Update machine
exports.updateMachine = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    const machine = await Machine.findOneAndUpdate(
      { _id: req.params.id, organizationId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Machine updated successfully',
      data: machine
    });
  } catch (error) {
    logger.error('Error updating machine:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating machine',
      error: error.message
    });
  }
};

// Update machine condition
exports.updateMachineCondition = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { condition, notes } = req.body;

    const machine = await Machine.findOneAndUpdate(
      { _id: req.params.id, organizationId },
      {
        operationalStatus: condition,
        notes: notes || machine?.notes,
        'performance.lastOperatedDate': new Date()
      },
      { new: true, runValidators: true }
    );

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Machine condition updated',
      data: machine
    });
  } catch (error) {
    logger.error('Error updating machine condition:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating machine condition',
      error: error.message
    });
  }
};

// Update service status
exports.updateServiceStatus = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { serviceStatus, serviceDate, description } = req.body;

    const updateData = {
      operationalStatus: serviceStatus === 'Good' ? 'OPERATIONAL' :
        serviceStatus === 'Repair Needed' ? 'BREAKDOWN' :
          serviceStatus === 'Under Service' ? 'UNDER_MAINTENANCE' :
            serviceStatus === 'Replacement Required' ? 'RETIRED' : 'IDLE'
    };

    if (serviceDate) {
      updateData['maintenance.lastMaintenanceDate'] = new Date(serviceDate);
      updateData['maintenance.nextMaintenanceDate'] = new Date(
        new Date(serviceDate).setDate(new Date(serviceDate).getDate() + 90)
      );
    }

    if (description) {
      updateData['maintenance.maintenanceHistory'] = {
        date: new Date(),
        type: serviceStatus === 'Under Service' ? 'PREVENTIVE' : 'CORRECTIVE',
        description,
        performedBy: req.user?.name || 'System',
        downtime: 0
      };
    }

    const machine = await Machine.findOneAndUpdate(
      { _id: req.params.id, organizationId },
      { $push: { 'maintenance.maintenanceHistory': updateData['maintenance.maintenanceHistory'] }, ...updateData },
      { new: true, runValidators: true }
    );

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service status updated',
      data: machine
    });
  } catch (error) {
    logger.error('Error updating service status:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating service status',
      error: error.message
    });
  }
};

// Get machine usage history
exports.getMachineUsageHistory = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const machineId = req.params.id;

    const machine = await Machine.findOne({
      _id: machineId,
      organizationId
    });

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    const usageHistory = {
      totalOperatingHours: machine.performance.totalOperatingHours,
      totalDowntime: machine.performance.totalDowntime,
      utilizationRate: machine.performance.utilizationRate,
      efficiency: machine.performance.efficiency,
      lastOperatedDate: machine.performance.lastOperatedDate,
      maintenanceHistory: machine.maintenance.maintenanceHistory
    };

    res.status(200).json({
      success: true,
      data: usageHistory
    });
  } catch (error) {
    logger.error('Error fetching usage history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching usage history',
      error: error.message
    });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    const machines = await Machine.find({ organizationId });

    const totalMachines = machines.length;
    const operationalMachines = machines.filter(m => m.operationalStatus === 'OPERATIONAL').length;
    const underMaintenanceMachines = machines.filter(m => m.operationalStatus === 'UNDER_MAINTENANCE').length;
    const breakdownMachines = machines.filter(m => m.operationalStatus === 'BREAKDOWN').length;
    const idleMachines = machines.filter(m => m.operationalStatus === 'IDLE').length;

    // Machine type breakdown
    const typeBreakdown = {};
    machines.forEach(m => {
      typeBreakdown[m.type] = (typeBreakdown[m.type] || 0) + 1;
    });

    // Condition breakdown
    const conditionBreakdown = {
      OPERATIONAL: operationalMachines,
      UNDER_MAINTENANCE: underMaintenanceMachines,
      BREAKDOWN: breakdownMachines,
      IDLE: idleMachines
    };

    // Calculate average utilization
    const averageUtilization = machines.length > 0
      ? (machines.reduce((sum, m) => sum + (m.performance.utilizationRate || 0), 0) / machines.length)
      : 0;

    // Calculate average efficiency
    const averageEfficiency = machines.length > 0
      ? (machines.reduce((sum, m) => sum + (m.performance.efficiency || 0), 0) / machines.length)
      : 0;

    // Service cycle data
    const serviceData = machines.map(m => ({
      name: m.name,
      days: m.maintenance.maintenanceFrequencyDays,
      nextService: m.maintenance.nextMaintenanceDate
    }));

    res.status(200).json({
      success: true,
      data: {
        totalMachines,
        operationalMachines,
        underMaintenanceMachines,
        breakdownMachines,
        idleMachines,
        typeBreakdown,
        conditionBreakdown,
        averageUtilization,
        averageEfficiency,
        serviceData
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};

// Get machine usage chart data
exports.getMachineUsageChartData = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    const machines = await Machine.find({ organizationId });

    const chartData = machines.map(m => ({
      name: m.name,
      utilizationRate: m.performance.utilizationRate || 0,
      efficiency: m.performance.efficiency || 0,
      operatingHours: m.performance.totalOperatingHours || 0
    }));

    res.status(200).json({
      success: true,
      data: chartData
    });
  } catch (error) {
    logger.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chart data',
      error: error.message
    });
  }
};

// Delete machine
exports.deleteMachine = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    const machine = await Machine.findOneAndDelete({
      _id: req.params.id,
      organizationId
    });

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Machine deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting machine:', error);
    res.status(400).json({
      success: false,
      message: 'Error deleting machine',
      error: error.message
    });
  }
};

// Get maintenance alerts
exports.getMaintenanceAlerts = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const today = new Date();

    logger.info('🔔 Fetching maintenance alerts for organization:', organizationId);
    logger.info('🔔 Current date:', today.toISOString());

    // Get machines that need maintenance
    const machines = await Machine.find({
      organizationId,
      isActive: true
    });

    logger.info('🔔 Total machines found:', machines.length);
    logger.info('🔔 Machines with maintenance dates:',
      machines.filter(m => m.maintenance?.nextMaintenanceDate).length
    );

    // --- SUBSCRIPTION & TOKEN CHECK ---
    const user = req.user;
    // Usually req.user is set by auth middleware. 
    // We need organizationId which we already have from headers, 
    // but better to rely on DB or Auth if possible for secure context.
    // Assuming organizationId from headers is valid for now (as per existing code).

    // Import Subscription Model (lazy load if needed or at top)
    const Subscription = require('../models/shared/Subscription');

    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      return res.status(403).json({ error: 'No active subscription found.' });
    }

    if (!subscription.isActive()) {
      return res.status(403).json({ error: 'Subscription is expired. Please renew.' });
    }

    // Hourly Cool-down Logic
    // We check the LAST usage of 'aiDemandForecasting' for this specific feature context
    // Since we don't store 'context' in a queryable way easily without aggregation,
    // we can check the latest Usage History for this user/org.

    // Better approach: Check if ANY deduction happened for 'maintenanceAlerts' in last 4 hours.
    // 4 Hours = balanced approach (approx 2-3 tokens per shift)

    const lastUsage = subscription.tokenUsageHistory
      .filter(u => u.description === 'AI Maintenance Alerts' && u.timestamp > new Date(Date.now() - 4 * 60 * 60 * 1000))
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (!lastUsage) {
      // No deduction in last hour, so DEDUCT TOKEN
      try {
        await subscription.consumeTokens(
          'aiDemandForecasting',
          1,
          req.user?._id, // User triggering the refresh
          'AI Maintenance Alerts',
          '4-Hourly refresh of predictive maintenance alerts'
        );
        logger.info('🔔 Token deducted for Maintenance Alerts refresh');
      } catch (tokenError) {
        // PERMISSIVE FALLBACK: Log error but allow access
        logger.warn(`⚠️ Token deduction failed: ${tokenError.message}. Proceeding anyway.`);
        // return res.status(403).json({
        //   error: 'Insufficient AI Tokens',
        //   message: 'You have run out of AI Forecasting tokens. Please purchase more tokens.',
        //   isTokenError: true
        // });
      }
    } else {
      logger.info('🔔 Token deduction skipped (Cool-down active)');
    }
    // ----------------------------------

    const alerts = [];

    machines.forEach(machine => {
      // Skip if no maintenance date set
      if (!machine.maintenance.nextMaintenanceDate) {
        return;
      }

      const nextMaintenanceDate = new Date(machine.maintenance.nextMaintenanceDate);
      const daysDifference = Math.ceil((nextMaintenanceDate - today) / (1000 * 60 * 60 * 24));

      let alertType = null;
      let severity = null;
      let message = '';

      // Overdue maintenance
      if (daysDifference < 0) {
        alertType = 'OVERDUE';
        severity = 'CRITICAL';
        message = `Maintenance is ${Math.abs(daysDifference)} days overdue`;
      }
      // Due today or tomorrow (urgent)
      else if (daysDifference <= 1) {
        alertType = 'URGENT';
        severity = 'HIGH';
        message = daysDifference === 0
          ? 'Maintenance due today'
          : 'Maintenance due tomorrow';
      }
      // Due within 7 days (warning)
      else if (daysDifference <= 7) {
        alertType = 'WARNING';
        severity = 'MEDIUM';
        message = `Maintenance due in ${daysDifference} days`;
      }
      // Due within 14 days (info)
      else if (daysDifference <= 14) {
        alertType = 'INFO';
        severity = 'LOW';
        message = `Maintenance scheduled in ${daysDifference} days`;
      }

      if (alertType) {
        alerts.push({
          machineId: machine._id,
          machineCode: machine.machineCode,
          machineName: machine.name,
          machineType: machine.type,
          location: machine.location,
          operationalStatus: machine.operationalStatus,
          alertType,
          severity,
          message,
          nextMaintenanceDate: machine.maintenance.nextMaintenanceDate,
          lastMaintenanceDate: machine.maintenance.lastMaintenanceDate,
          maintenanceFrequencyDays: machine.maintenance.maintenanceFrequencyDays,
          daysUntilMaintenance: daysDifference,
          totalOperatingHours: machine.performance.totalOperatingHours
        });
      }
    });

    // Sort by severity (CRITICAL > HIGH > MEDIUM > LOW)
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    logger.info('🔔 Generated alerts:', alerts.length);
    logger.info('🔔 Summary - Critical:', alerts.filter(a => a.severity === 'CRITICAL').length,
      ', High:', alerts.filter(a => a.severity === 'HIGH').length,
      ', Medium:', alerts.filter(a => a.severity === 'MEDIUM').length,
      ', Low:', alerts.filter(a => a.severity === 'LOW').length);

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
      summary: {
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        high: alerts.filter(a => a.severity === 'HIGH').length,
        medium: alerts.filter(a => a.severity === 'MEDIUM').length,
        low: alerts.filter(a => a.severity === 'LOW').length
      }
    });
  } catch (error) {
    logger.error('Error fetching maintenance alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching maintenance alerts',
      error: error.message
    });
  }
};
