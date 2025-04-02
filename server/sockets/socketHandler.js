import { Server } from 'socket.io';
import Meeting from '../models/Meeting.js';

const configureSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const userMap = new Map();
  const roomToMeetingIdMap = new Map();

  io.on('connection', (socket) => {
    console.log('New socket connection:', socket.id);

    socket.on('join-room', async ({ meetingId, userName }) => {
      try {
        console.log(`User ${userName} joining room ${meetingId}`);

        let meeting = await Meeting.findOne({ meetingId });
        if (!meeting) {
          console.log(`Meeting ${meetingId} not found, creating new one`);
          meeting = new Meeting({
            meetingId,
            participants: [],
          });
        }

        if (!meeting.participants.some(p => p.userId === socket.id)) {
          meeting.participants.push({
            userId: socket.id,
            name: userName,
            joinedAt: new Date(),
          });
          await meeting.save();
          console.log(`Saved user ${userName} to meeting ${meetingId}`);
        }

        userMap.set(socket.id, userName);
        roomToMeetingIdMap.set(socket.id, meetingId);

        socket.join(meetingId);

        const users = [];
        const roomSockets = await io.in(meetingId).fetchSockets();
        for (const roomSocket of roomSockets) {
          if (roomSocket.id !== socket.id) {
            users.push({
              userId: roomSocket.id,
              userName: userMap.get(roomSocket.id) || 'Participant',
            });
          }
        }

        socket.emit('existing-users', users);

        socket.to(meetingId).emit('user-connected', {
          userId: socket.id,
          userName,
        });
      } catch (err) {
        console.error('Error joining room:', err);
        socket.emit('error', { message: 'Failed to join meeting room' });
      }
    });

    socket.on('signal', ({ userToSignal, callerID, signal }) => {
      const userName = userMap.get(callerID);
      console.log(`Signal from ${callerID} (${userName}) to ${userToSignal}`);

      io.to(userToSignal).emit('signal', {
        from: callerID,
        signal,
        userName,
      });
    });

    socket.on('stream-update', ({ meetingId, userId, isScreenSharing, isVideoOff }) => {
      console.log(`Stream update from ${userId}: screenSharing=${isScreenSharing}, videoOff=${isVideoOff}`);
      socket.to(meetingId).emit('stream-update', {
        userId,
        isScreenSharing,
        isVideoOff,
      });
    });

    socket.on('disconnect', async () => {
      try {
        const userName = userMap.get(socket.id);
        const meetingId = roomToMeetingIdMap.get(socket.id);

        console.log(`User disconnected: ${socket.id} (${userName})`);

        if (meetingId) {
          socket.to(meetingId).emit('user-disconnected', { userId: socket.id });

          const meeting = await Meeting.findOne({ meetingId });
          if (meeting) {
            meeting.participants = meeting.participants.filter(p => p.userId !== socket.id);
            await meeting.save();
          }
        }

        userMap.delete(socket.id);
        roomToMeetingIdMap.delete(socket.id);
      } catch (err) {
        console.error('Error handling disconnect:', err);
      }
    });
  });

  return io;
};

export default configureSocket;