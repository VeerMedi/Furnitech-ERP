const Lead = require('../models/vlite/Lead');
const Quotation = require('../models/vlite/Quotation');
const AdvancePayment = require('../models/vlite/AdvancePayment');
const Customer = require('../models/vlite/Customer');

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const orgId = req.user.organization;

    const totalLeads = await Lead.countDocuments({ organization: orgId });
    const openOpportunities = await Lead.countDocuments({
      organization: orgId,
      status: { $in: ['NEW', 'CONTACTED', 'QUALIFIED'] }
    });

    const quotationsPending = await Quotation.countDocuments({
      organization: orgId,
      status: 'DRAFT'
    });

    const quotationsApproved = await Quotation.countDocuments({
      organization: orgId,
      status: 'APPROVED'
    });

    const payments = await AdvancePayment.aggregate([
      { $match: { organization: orgId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalAdvanceReceived = payments.length > 0 ? payments[0].total : 0;

    // Pipeline stages breakdown
    const pipelineStages = await Lead.aggregate([
      { $match: { organization: orgId } },
      { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$estimatedValue" } } }
    ]);

    // Recent activities (mocked for now, ideally from an ActivityLog model)
    const recentActivities = await Lead.find({ organization: orgId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('createdBy', 'name')
      .select('title status updatedAt createdBy');

    res.json({
      kpi: {
        totalLeads,
        openOpportunities,
        quotationsPending,
        quotationsApproved,
        totalAdvanceReceived
      },
      pipeline: pipelineStages,
      recentActivities
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Lead CRUD
exports.getLeads = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization || req.organization?._id;

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const { status, search } = req.query;
    const query = { organization: organizationId };

    // If user has dataSourceUserId, fetch data created by that user
    if (req.user && req.user.dataSourceUserId) {
      query.createdBy = req.user.dataSourceUserId._id || req.user.dataSourceUserId;
      console.log('Filtering leads by data source user:', query.createdBy);
    }

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'contact.name': { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    console.error('Get leads error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.createLead = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization || req.organization?._id;

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const lead = new Lead({
      ...req.body,
      organization: organizationId,
      createdBy: req.user._id
    });
    await lead.save();
    res.status(201).json(lead);
  } catch (err) {
    console.error('Create lead error:', err);
    res.status(400).json({ message: err.message });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      req.body,
      { new: true }
    );
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, organization: req.user.organization });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateLeadStage = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization || req.organization?._id;

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const { status } = req.body;
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, organization: organizationId },
      { status },
      { new: true }
    );
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    console.error('Update lead stage error:', err);
    res.status(400).json({ message: err.message });
  }
};
