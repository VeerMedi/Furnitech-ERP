const MeetingLog = require('../models/vlite/MeetingLog');
const Inquiry = require('../models/vlite/Inquiry');

// Create a new meeting log
exports.createMeetingLog = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' });
    }

    const userId = req.user?.id || req.user?._id;
    const { inquiryId, meetingLocation, discussionDetails, nextMeetingDate, nextMeetingNotes } = req.body;

    console.log('📝 Creating meeting log:', {
      userId,
      inquiryId,
      userRole: req.user?.userRole,
      userName: `${req.user?.firstName} ${req.user?.lastName}`
    });

    // Validate required fields
    if (!inquiryId || !meetingLocation || !discussionDetails || !nextMeetingDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required: inquiryId, meetingLocation, discussionDetails, nextMeetingDate' 
      });
    }

    // Fetch inquiry details
    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Get customer name from meta.customerName or fallback to companyName
    const customerName = inquiry.meta?.customerName || inquiry.companyName || 'Unknown Customer';

    console.log('📋 Inquiry found:', {
      id: inquiry._id,
      customerName: customerName,
      assignedTo: inquiry.assignedTo
    });

    // Check if user is assigned to this inquiry or is Admin/HOS/POC
    const isAdmin = req.user?.userRole === 'Admin' || 
                    req.user?.userRole === 'Head of Sales (HOD)' || 
                    req.user?.userRole === 'POC';
    
    // assignedTo is a single ObjectId, not an array
    const isAssigned = inquiry.assignedTo && 
                       inquiry.assignedTo.toString() === userId?.toString();
    
    if (!isAssigned && !isAdmin) {
      console.log('❌ User not assigned to inquiry and not admin');
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to this inquiry' 
      });
    }

    // Get salesman name with fallback
    const salesmanName = req.user?.firstName && req.user?.lastName 
      ? `${req.user.firstName} ${req.user.lastName}`.trim()
      : req.user?.email || 'Unknown User';

    // Create meeting log
    const meetingLog = new MeetingLog({
      inquiryId,
      salesmanId: userId,
      salesmanName,
      customerName: customerName, // Use the extracted customerName
      meetingLocation,
      discussionDetails,
      nextMeetingDate: new Date(nextMeetingDate),
      nextMeetingNotes: nextMeetingNotes || '',
      createdBy: userId
    });

    await meetingLog.save();

    console.log('✅ Meeting log created successfully:', meetingLog._id);

    res.status(201).json({
      success: true,
      message: 'Meeting log created successfully',
      data: meetingLog
    });
  } catch (error) {
    console.error('❌ Error creating meeting log:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating meeting log', 
      error: error.message 
    });
  }
};

// Get all meeting logs for a specific inquiry
exports.getMeetingLogsByInquiry = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' });
    }

    const { inquiryId } = req.params;

    const meetingLogs = await MeetingLog.find({ inquiryId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: meetingLogs.length,
      data: meetingLogs
    });
  } catch (error) {
    console.error('❌ Error fetching meeting logs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching meeting logs', 
      error: error.message 
    });
  }
};

// Get all meeting logs for the logged-in salesman
exports.getMySalesmanMeetingLogs = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' });
    }

    const userId = req.user?.id || req.user?._id;

    // Get query parameters for filtering
    const { startDate, endDate, inquiryId } = req.query;
    
    let query = { salesmanId: userId };
    
    if (inquiryId) {
      query.inquiryId = inquiryId;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const meetingLogs = await MeetingLog.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: meetingLogs.length,
      data: meetingLogs
    });
  } catch (error) {
    console.error('❌ Error fetching my meeting logs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching meeting logs', 
      error: error.message 
    });
  }
};

// Get upcoming meetings for the logged-in salesman
exports.getUpcomingMeetings = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' });
    }

    const userId = req.user?.id || req.user?._id;

    const upcomingMeetings = await MeetingLog.find({
      salesmanId: userId,
      nextMeetingDate: { $gte: new Date() }
    })
      .sort({ nextMeetingDate: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: upcomingMeetings.length,
      data: upcomingMeetings
    });
  } catch (error) {
    console.error('❌ Error fetching upcoming meetings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching upcoming meetings', 
      error: error.message 
    });
  }
};

// Update a meeting log
exports.updateMeetingLog = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' });
    }

    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const updateData = req.body;

    const meetingLog = await MeetingLog.findById(id);

    if (!meetingLog) {
      return res.status(404).json({ success: false, message: 'Meeting log not found' });
    }

    // Check if user is the creator or admin
    if (meetingLog.salesmanId.toString() !== userId?.toString() && req.user?.userRole !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this meeting log' 
      });
    }

    // Update fields
    if (updateData.meetingLocation) meetingLog.meetingLocation = updateData.meetingLocation;
    if (updateData.discussionDetails) meetingLog.discussionDetails = updateData.discussionDetails;
    if (updateData.nextMeetingDate) meetingLog.nextMeetingDate = new Date(updateData.nextMeetingDate);
    if (updateData.nextMeetingNotes !== undefined) meetingLog.nextMeetingNotes = updateData.nextMeetingNotes;
    if (updateData.status) meetingLog.status = updateData.status;
    
    meetingLog.updatedBy = userId;

    await meetingLog.save();

    res.status(200).json({
      success: true,
      message: 'Meeting log updated successfully',
      data: meetingLog
    });
  } catch (error) {
    console.error('❌ Error updating meeting log:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating meeting log', 
      error: error.message 
    });
  }
};

// Delete a meeting log
exports.deleteMeetingLog = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' });
    }

    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    const meetingLog = await MeetingLog.findById(id);

    if (!meetingLog) {
      return res.status(404).json({ success: false, message: 'Meeting log not found' });
    }

    // Check if user is the creator or admin
    if (meetingLog.salesmanId.toString() !== userId?.toString() && req.user?.userRole !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this meeting log' 
      });
    }

    await MeetingLog.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Meeting log deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting meeting log:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting meeting log', 
      error: error.message 
    });
  }
};
