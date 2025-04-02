import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  meetingId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  isScheduled: { type: Boolean, default: false },
  scheduledData: {
    title: String,
    date: Date,
    time: String,
    duration: Number,
    description: String,
    creator: String
  },
  participants: [{
    userId: { type: String, required: true },
    name: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now }
  }]
});

export default mongoose.model('Meeting', meetingSchema);