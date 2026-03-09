const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const ChatHistory = require('../models/vlite/ChatHistory');
const { authenticate, tenantContext } = require('../middleware/auth');
const { getPythonCommand } = require('../utils/pythonCommand');

// Python RAG script path - API version with organization isolation
const ragScriptAPI = path.join(__dirname, '../../AI/AI Reports/Analytics/query_rag_api.py');

const Subscription = require('../models/shared/Subscription');

// AI Chat endpoint - Intelligent RAG System with Organization Isolation
router.post('/query', authenticate, tenantContext, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get organization ID from authenticated request (set by tenantContext middleware)
    const organizationId = req.organizationId || req.organization?._id;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization context required',
        message: 'Unable to determine your organization. Please log in again.'
      });
    }

    // --- SUBSCRIPTION & TOKEN CHECK ---
    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      return res.status(403).json({ error: 'No active subscription found.' });
    }

    if (!subscription.isActive()) {
      return res.status(403).json({ error: 'Subscription is expired. Please renew.' });
    }

    // Calculate Token Cost based on input length (Paragraph vs Single Line)
    // Threshold: 200 characters (approx 3-4 sentences)
    const tokenCost = question.length > 200 ? 3 : 1;

    // Consume Token (Using 'aiReports' bucket for General AI Assistant)
    try {
      await subscription.consumeTokens(
        'aiReports',
        tokenCost,
        req.user?._id,
        `AI Assistant RAG Query (${tokenCost} tokens)`,
        question
      );
    } catch (tokenError) {
      return res.status(403).json({
        error: 'Insufficient AI Tokens',
        message: 'You have run out of AI Reports tokens. Please purchase more tokens or upgrade your plan.',
        isTokenError: true
      });
    }
    // ----------------------------------

    console.log('🤖 RAG Query:', question);
    console.log('🔒 Organization ID:', organizationId);
    console.log('🔒 Organization ID (string):', organizationId.toString());
    console.log('🔒 User Type:', req.userType);

    // Call Python RAG system with organization ID for data isolation
    const python = spawn(getPythonCommand(), [ragScriptAPI, organizationId.toString(), question]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Python RAG error:', stderr);
        return res.status(500).json({
          error: 'Failed to process query',
          details: stderr
        });
      }

      try {
        // Parse JSON output from API script
        const result = JSON.parse(stdout.trim());

        if (!result.success) {
          console.error('❌ RAG query failed:', result.error);
          return res.status(500).json({
            error: 'Failed to process query',
            details: result.error
          });
        }

        console.log('✅ RAG Answer generated for organization:', result.tenant_id);

        res.json({
          question: result.question,
          answer: result.answer,
          timestamp: new Date().toISOString(),
          sources_count: result.sources_count
        });
      } catch (parseError) {
        console.error('❌ Failed to parse RAG output:', parseError);
        console.error('Raw output:', stdout);
        return res.status(500).json({
          error: 'Failed to parse RAG response',
          details: parseError.message
        });
      }
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({
      error: 'Failed to process query',
      message: error.message
    });
  }
});

// Save or update chat conversation
router.post('/save', async (req, res) => {
  try {
    const { sessionId, messages, title } = req.body;
    // Use temp IDs until authentication is implemented
    const userId = req.user?._id || '000000000000000000000000';
    const organizationId = req.user?.organizationId || '000000000000000000000000';

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'SessionId and messages array are required' });
    }

    // Auto-generate title from first message if not provided
    const chatTitle = title || (messages[0]?.content.substring(0, 50) + '...' || 'New Chat');

    // Check if conversation exists (use sessionId as primary key)
    let conversation = await ChatHistory.findOne({ sessionId });

    if (conversation) {
      // Update existing conversation
      conversation.messages = messages;
      conversation.title = chatTitle;
      await conversation.save();
    } else {
      // Create new conversation
      conversation = await ChatHistory.create({
        userId,
        organizationId,
        sessionId,
        messages,
        title: chatTitle
      });
    }

    res.json({
      success: true,
      sessionId: conversation.sessionId,
      message: 'Conversation saved successfully'
    });

  } catch (error) {
    console.error('Save chat history error:', error);
    res.status(500).json({
      error: 'Failed to save conversation',
      message: error.message
    });
  }
});

// Get all chat history for current user
router.get('/history', async (req, res) => {
  try {
    const userId = req.user?._id || '000000000000000000000000';
    const limit = parseInt(req.query.limit) || 100; // Default limit 100

    const conversations = await ChatHistory.find({
      userId,
      isDeleted: false
    })
      .select('sessionId title createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .limit(limit);

    // Group by date for frontend
    const grouped = {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    conversations.forEach(conv => {
      const convDate = new Date(conv.updatedAt);
      const item = {
        sessionId: conv.sessionId,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv.messages.length
      };

      if (convDate >= today) {
        grouped.today.push(item);
      } else if (convDate >= yesterday) {
        grouped.yesterday.push(item);
      } else if (convDate >= lastWeek) {
        grouped.lastWeek.push(item);
      } else if (convDate >= lastMonth) {
        grouped.lastMonth.push(item);
      } else {
        grouped.older.push(item);
      }
    });

    res.json({
      success: true,
      total: conversations.length,
      conversations: grouped
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve chat history',
      message: error.message
    });
  }
});

// Get specific conversation by sessionId
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const conversation = await ChatHistory.findOne({
      sessionId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversation: {
        sessionId: conversation.sessionId,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversation',
      message: error.message
    });
  }
});

// Delete specific conversation
router.delete('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const conversation = await ChatHistory.findOne({ sessionId });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Soft delete
    conversation.isDeleted = true;
    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      error: 'Failed to delete conversation',
      message: error.message
    });
  }
});

// Clear all chat history for current user
router.delete('/history', async (req, res) => {
  try {
    const userId = req.user?._id || '000000000000000000000000';

    // Soft delete all conversations
    await ChatHistory.updateMany(
      { userId, isDeleted: false },
      { isDeleted: true }
    );

    res.json({
      success: true,
      message: 'All conversations cleared successfully'
    });

  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({
      error: 'Failed to clear history',
      message: error.message
    });
  }
});

module.exports = router;
