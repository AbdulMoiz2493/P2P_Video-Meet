import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

function Home() {
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    title: '',
    date: '',
    time: '',
    duration: '30',
    description: ''
  });
  const navigate = useNavigate();

  const createMeeting = async () => {
    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }
    try {
      const response = await axios.post('http://localhost:4000/api/meetings/create', { userName });
      const id = response.data.meetingId;
      navigate(`/meet/${id}`, { state: { userName } });
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('Failed to create meeting. Please try again.');
    }
  };

  const joinMeeting = async () => {
    if (!meetingId.trim() || !userName.trim()) {
      alert('Please enter both meeting code and your name');
      return;
    }
    try {
      const response = await axios.get(`http://localhost:4000/api/meetings/validate/${meetingId}`);
      if (!response.data.exists) {
        alert('Invalid meeting code. Please check and try again.');
        return;
      }

      if (response.data.isScheduled && response.data.startTime) {
        const now = new Date();
        const meetingStart = new Date(response.data.startTime);
        if (meetingStart > now) {
          const timeDiff = meetingStart - now;
          const minutesLeft = Math.ceil(timeDiff / (1000 * 60));
          alert(`This meeting is scheduled to start in ${minutesLeft} minute(s) at ${meetingStart.toLocaleTimeString()}.`);
          return;
        }
      }

      navigate(`/meet/${meetingId}`, { state: { userName } });
    } catch (error) {
      console.error('Error validating meeting:', error);
      alert('Failed to validate meeting code. Please try again.');
    }
  };

  const scheduleMeeting = async () => {
    if (!userName.trim() || !scheduleData.title.trim() || !scheduleData.date || !scheduleData.time) {
      alert('Please fill all required fields');
      return;
    }
    try {
      const response = await axios.post('http://localhost:4000/api/meetings/schedule', {
        ...scheduleData,
        userName
      });
      alert(`Meeting scheduled successfully! Meeting ID: ${response.data.meetingId}`);
      setShowScheduleForm(false);
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Failed to schedule meeting. Please try again.');
    }
  };

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    setScheduleData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-200 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8 text-center text-blue-700">Video Meet</h1>
        
        <div className="mb-6">
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
          <input
            id="userName"
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div className="flex flex-col space-y-4 mb-6">
          <button
            onClick={createMeeting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
          >
            Create Instant Meeting
          </button>

          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-md flex items-center justify-center"
          >
            <CalendarIcon className="h-5 w-5 mr-2" />
            {showScheduleForm ? 'Cancel Scheduling' : 'Schedule Meeting'}
          </button>
        </div>

        {showScheduleForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Schedule Meeting</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Meeting Title</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={scheduleData.title}
                  onChange={handleScheduleChange}
                  placeholder="Team standup"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    id="date"
                    type="date"
                    name="date"
                    value={scheduleData.date}
                    onChange={handleScheduleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    id="time"
                    type="time"
                    name="time"
                    value={scheduleData.time}
                    onChange={handleScheduleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <select
                  id="duration"
                  name="duration"
                  value={scheduleData.duration}
                  onChange={handleScheduleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                  <option value="120">120 min</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  id="description"
                  name="description"
                  value={scheduleData.description}
                  onChange={handleScheduleChange}
                  placeholder="Meeting agenda..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                onClick={scheduleMeeting}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
              >
                Schedule Meeting
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="px-4 text-gray-500 font-medium">or</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <div className="mb-6">
          <label htmlFor="meetingId" className="block text-sm font-medium text-gray-700 mb-1">Meeting Code</label>
          <input
            id="meetingId"
            type="text"
            placeholder="Enter meeting code"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={joinMeeting}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
        >
          Join Meeting
        </button>
      </div>
    </div>
  );
}

export default Home;