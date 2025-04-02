import express from 'express';
import { nanoid } from 'nanoid';
import Meeting from '../models/Meeting.js';

const router = express.Router();

// Create a new meeting
router.post('/create', async (req, res) => {
  try {
    const { userName } = req.body;
    
    if (!userName) {
      return res.status(400).json({ error: 'User name is required' });
    }
    
    const meetingId = nanoid(8);
    
    const meeting = new Meeting({
      meetingId,
      participants: []
    });
    
    await meeting.save();
    
    return res.status(201).json({
      success: true,
      meetingId,
      link: `/meet/${meetingId}`
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Schedule a new meeting
router.post('/schedule', async (req, res) => {
  try {
    const { userName, title, date, time, duration, description } = req.body;
    
    if (!userName || !title || !date || !time) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }
    
    const meetingId = nanoid(8);
    const scheduledDate = new Date(`${date}T${time}`);
    
    const meeting = new Meeting({
      meetingId,
      isScheduled: true,
      scheduledData: {
        title,
        date: scheduledDate,
        time,
        duration: parseInt(duration),
        description,
        creator: userName
      },
      participants: []
    });
    
    await meeting.save();
    
    return res.status(201).json({
      success: true,
      meetingId,
      link: `/meet/${meetingId}`,
      scheduledData: meeting.scheduledData
    });
  } catch (error) {
    console.error('Error scheduling meeting:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Validate a meeting (New endpoint for Issue 1 & 2)
router.get('/validate/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findOne({ meetingId });
    
    if (!meeting) {
      return res.status(404).json({ exists: false });
    }
    
    return res.status(200).json({
      exists: true,
      isScheduled: meeting.isScheduled,
      startTime: meeting.isScheduled ? meeting.scheduledData.date : null
    });
  } catch (error) {
    console.error('Error validating meeting:', error);
    return res.status(500).json({ exists: false });
  }
});

// Get meeting details
router.get('/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const meeting = await Meeting.findOne({ meetingId });
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    return res.status(200).json({
      success: true,
      meeting: {
        id: meeting.meetingId,
        isScheduled: meeting.isScheduled,
        scheduledData: meeting.scheduledData,
        createdAt: meeting.createdAt,
        participantCount: meeting.participants.length
      }
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all scheduled meetings
router.get('/scheduled/list', async (req, res) => {
  try {
    const meetings = await Meeting.find({ 
      isScheduled: true,
      'scheduledData.date': { $gte: new Date() }
    }).sort({ 'scheduledData.date': 1 });
    
    return res.status(200).json({
      success: true,
      meetings: meetings.map(meeting => ({
        id: meeting.meetingId,
        title: meeting.scheduledData.title,
        date: meeting.scheduledData.date,
        duration: meeting.scheduledData.duration,
        creator: meeting.scheduledData.creator
      }))
    });
  } catch (error) {
    console.error('Error fetching scheduled meetings:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;