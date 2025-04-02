import { useEffect, useRef, useState } from 'react';

function ParticipantVideo({ peer, userName }) {
  const videoRef = useRef();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [hasStream, setHasStream] = useState(false);

  useEffect(() => {
    if (!peer) {
      console.warn('No peer provided to ParticipantVideo');
      return;
    }

    const handleStream = (stream) => {
      console.log(`Received stream from ${userName || 'participant'}`);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasStream(true);
      }

      // Check video track status
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        setIsVideoEnabled(videoTrack.enabled);
        videoTrack.onmute = () => setIsVideoEnabled(false);
        videoTrack.onunmute = () => setIsVideoEnabled(true);
      }

      // Check audio track status
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        setIsAudioEnabled(audioTrack.enabled);
        audioTrack.onmute = () => setIsAudioEnabled(false);
        audioTrack.onunmute = () => setIsAudioEnabled(true);
      }
    };

    // Add stream listener
    peer.on('stream', handleStream);

    // Check if peer already has a stream (might have been added before the component mounted)
    if (peer._remoteStreams && peer._remoteStreams.length > 0) {
      handleStream(peer._remoteStreams[0]);
    }

    // Cleanup function
    return () => {
      peer.off('stream', handleStream);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [peer, userName]);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full rounded-lg bg-gray-800 object-cover aspect-video"
      />
      <div className="absolute bottom-2 left-2 bg-gray-800 bg-opacity-80 px-2 py-1 rounded text-sm flex items-center">
        <span>{userName || 'Participant'}</span>
        {!isAudioEnabled && <span className="ml-2 text-red-500">🔇</span>}
        {!isVideoEnabled && <span className="ml-2 text-red-500">🚫</span>}
        {!hasStream && <span className="ml-2 text-yellow-500">⚠️ Connecting...</span>}
      </div>
    </div>
  );
}

export default ParticipantVideo;