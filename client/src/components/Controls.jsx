import {
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneIcon,
  ComputerDesktopIcon,
  ClipboardIcon,
} from '@heroicons/react/24/solid';
import { XCircleIcon } from '@heroicons/react/24/outline';

function Controls({ isMuted, isVideoOff, isScreenSharing, onToggleAudio, onToggleVideo, onToggleScreenShare, meetingLink }) {
  const copyMeetingLink = () => {
    navigator.clipboard.writeText(meetingLink);
    alert('Meeting link copied to clipboard! Share this with others to join.');
  };

  const hangUp = () => {
    if (window.confirm('Are you sure you want to leave the meeting?')) {
      window.location.href = '/';
    }
  };

  return (
    <div className="bg-gray-800 p-4 shadow-lg">
      <div className="flex justify-center items-center space-x-4">
        <button
          onClick={onToggleAudio}
          className={`p-4 rounded-full ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'} transition-colors`}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <XCircleIcon className="h-6 w-6" />
          ) : (
            <MicrophoneIcon className="h-6 w-6" />
          )}
        </button>

        <button
          onClick={onToggleVideo}
          className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'} transition-colors`}
          aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? (
            <XCircleIcon className="h-6 w-6" />
          ) : (
            <VideoCameraIcon className="h-6 w-6" />
          )}
        </button>

        <button
          onClick={onToggleScreenShare}
          className={`p-4 rounded-full ${isScreenSharing ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-600 hover:bg-gray-700'} transition-colors`}
          aria-label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <ComputerDesktopIcon className="h-6 w-6" />
        </button>

        <button
          onClick={copyMeetingLink}
          className="p-4 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
          aria-label="Copy meeting link"
          title="Copy meeting link"
        >
          <ClipboardIcon className="h-6 w-6" />
        </button>

        <button
          onClick={hangUp}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          aria-label="Leave meeting"
          title="Leave meeting"
        >
          <PhoneIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

export default Controls;