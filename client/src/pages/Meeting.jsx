import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import Controls from '../components/Controls';
import ParticipantVideo from '../components/ParticipantVideo';

function Meeting() {
  const { meetingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [peers, setPeers] = useState([]);
  const [stream, setStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [userName, setUserName] = useState('');
  const [participantCount, setParticipantCount] = useState(1);
  const socketRef = useRef();
  const userVideo = useRef();
  const peersRef = useRef([]);
  const mySocketId = useRef(null);
  const [localStreamAvailable, setLocalStreamAvailable] = useState(false);

  useEffect(() => {
    let name;
    if (!location.state?.userName) {
      name = prompt('Please enter your name to join the meeting', 'Anonymous');
      if (!name) {
        navigate('/');
        return;
      }
      setUserName(name);
    } else {
      name = location.state.userName;
      setUserName(name);
    }

    const baseUrl = window.location.origin;
    setMeetingLink(`${baseUrl}/meet/${meetingId}`);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
        setLocalStreamAvailable(true);

        socketRef.current = io('http://localhost:4000');

        socketRef.current.on('connect', () => {
          mySocketId.current = socketRef.current.id;
          console.log('My socket ID:', mySocketId.current);
          socketRef.current.emit('join-room', { meetingId, userName: name });
        });

        const handleUserConnected = ({ userId, userName: peerUserName }) => {
          if (userId === socketRef.current.id) {
            console.log('Ignoring self connection');
            return;
          }

          console.log('New user connected:', userId, peerUserName);

          if (peersRef.current.some(p => p.peerID === userId)) {
            console.log('Peer already exists, skipping');
            return;
          }

          const activeStream = isScreenSharing ? screenStream : stream;
          if (!activeStream) {
            console.error('No active stream available for new peer connection');
            return;
          }

          const peer = createPeer(userId, socketRef.current.id, activeStream, userName);

          peersRef.current = [
            ...peersRef.current.filter(p => p.peerID !== userId),
            { peerID: userId, peer, userName: peerUserName },
          ];

          setPeers(prevPeers => [
            ...prevPeers.filter(p => p.peerID !== userId),
            { peerID: userId, peer, userName: peerUserName },
          ]);

          setParticipantCount(prev => prev + 1);
        };

        const handleUserDisconnected = ({ userId }) => {
          console.log('User disconnected:', userId);

          const peerObj = peersRef.current.find(p => p.peerID === userId);
          if (peerObj) {
            if (peerObj.peer._pc) {
              peerObj.peer._pc.close();
            }
            peerObj.peer.destroy();

            peersRef.current = peersRef.current.filter(p => p.peerID !== userId);
            setPeers(peers => peers.filter(p => p.peerID !== userId));
            setParticipantCount(prev => Math.max(1, prev - 1));
          }
        };

        const handleExistingUsers = (users) => {
          console.log('Existing users received:', users);

          const filteredUsers = users.filter(user => user.userId !== socketRef.current.id);
          console.log('Filtered users (excluding self):', filteredUsers);

          const newPeers = filteredUsers.map(({ userId, userName: peerUserName }) => {
            if (peersRef.current.some(p => p.peerID === userId)) {
              console.log('Peer already exists, skipping:', userId);
              return null;
            }

            const activeStream = isScreenSharing ? screenStream : stream;
            if (!activeStream) {
              console.error('No active stream available for existing peer connection');
              return null;
            }

            console.log('Creating peer for existing user:', userId, peerUserName);
            const peer = addPeer(userId, socketRef.current.id, activeStream, userName);
            return { peerID: userId, peer, userName: peerUserName };
          }).filter(Boolean);

          peersRef.current = [
            ...peersRef.current.filter(p => !filteredUsers.some(u => u.userId === p.peerID)),
            ...newPeers,
          ];

          setPeers(prevPeers => {
            const updatedPeers = [
              ...prevPeers.filter(p => !filteredUsers.some(u => u.userId === p.peerID)),
              ...newPeers,
            ];
            console.log('Updated peers state:', updatedPeers);
            return updatedPeers;
          });

          setParticipantCount(filteredUsers.length + 1);
        };

        const handleSignal = ({ from, signal, userName: signalUserName }) => {
          console.log('Received signal from:', from, signalUserName);

          if (from === socketRef.current.id) {
            console.log('Ignoring signal from self');
            return;
          }

          let item = peersRef.current.find(p => p.peerID === from);
          if (!item) {
            console.warn('Received signal for unknown peer, creating new peer:', from);
            const activeStream = isScreenSharing ? screenStream : stream;
            if (!activeStream) {
              console.error('No active stream available for new peer');
              return;
            }
            const peer = addPeer(from, socketRef.current.id, activeStream, userName);
            peersRef.current.push({ peerID: from, peer, userName: signalUserName });
            setPeers(prevPeers => [...prevPeers, { peerID: from, peer, userName: signalUserName }]);
            item = peersRef.current.find(p => p.peerID === from);
          }

          try {
            if (item.peer._pc && item.peer._pc.signalingState === 'closed') {
              console.warn('Peer connection is closed, cannot signal');
              return;
            }
            console.log('Signaling peer:', from);
            item.peer.signal(signal);

            if (!item.userName && signalUserName) {
              item.userName = signalUserName;
              setPeers(prevPeers => {
                const updatedPeers = [...prevPeers];
                const peerIndex = updatedPeers.findIndex(p => p.peerID === from);
                if (peerIndex !== -1) {
                  updatedPeers[peerIndex] = { ...updatedPeers[peerIndex], userName: signalUserName };
                }
                return updatedPeers;
              });
            }
          } catch (err) {
            console.error('Error handling signal:', err);
          }
        };

        const handleStreamUpdate = ({ userId, isScreenSharing: peerScreenSharing, isVideoOff: peerVideoOff }) => {
          console.log(`Stream update from ${userId}: screenSharing=${peerScreenSharing}, videoOff=${peerVideoOff}`);
          const peerObj = peersRef.current.find(p => p.peerID === userId);
          if (peerObj) {
            const activeStream = peerScreenSharing ? screenStream : stream;
            if (activeStream) {
              const videoTrack = activeStream.getVideoTracks()[0];
              if (videoTrack) {
                const senders = peerObj.peer._pc.getSenders();
                const sender = senders.find(s => s.track && s.track.kind === 'video');
                if (sender) {
                  sender.replaceTrack(videoTrack).catch(err => console.error('Error replacing track:', err));
                }
              }
            }
          }
        };

        socketRef.current.on('user-connected', handleUserConnected);
        socketRef.current.on('user-disconnected', handleUserDisconnected);
        socketRef.current.on('existing-users', handleExistingUsers);
        socketRef.current.on('signal', handleSignal);
        socketRef.current.on('stream-update', handleStreamUpdate);

        // Request existing users once connected
        socketRef.current.on('connect', () => {
          socketRef.current.emit('request-existing-users', { meetingId });
        });

        return () => {
          socketRef.current.off('user-connected', handleUserConnected);
          socketRef.current.off('user-disconnected', handleUserDisconnected);
          socketRef.current.off('existing-users', handleExistingUsers);
          socketRef.current.off('signal', handleSignal);
          socketRef.current.off('stream-update', handleStreamUpdate);

          peersRef.current.forEach(({ peer }) => {
            if (peer) {
              peer.destroy();
            }
          });

          socketRef.current.disconnect();

          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
          }
        };
      })
      .catch(err => {
        console.error('Failed to get media devices:', err);
        alert('Failed to access camera or microphone. Please check your permissions.');
      });
  }, [meetingId, location.state, navigate]);

  const createPeer = (userToSignal, callerID, stream, callerName) => {
    console.log('Creating peer for:', userToSignal);
    const activeStream = isScreenSharing ? screenStream : stream;
    if (!activeStream) {
      console.error('No active stream available for peer creation');
      return null;
    }

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: activeStream,
    });

    peer.on('signal', signal => {
      console.log('Sending signal to:', userToSignal);
      socketRef.current.emit('signal', {
        userToSignal,
        callerID,
        signal,
        userName: callerName,
      });
    });

    peer.on('stream', stream => {
      console.log('Received stream from peer:', userToSignal);
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
      const peerObj = peersRef.current.find(p => p.peer === peer);
      if (peerObj) {
        peersRef.current = peersRef.current.filter(p => p.peer !== peer);
        setPeers(peers => peers.filter(p => p.peerID !== peerObj.peerID));
      }
    });

    peer.on('connect', () => {
      console.log('Peer connected to:', userToSignal);
    });

    return peer;
  };

  const addPeer = (callerID, userToSignal, stream, callerName) => {
    console.log('Adding peer:', callerID);
    const activeStream = isScreenSharing ? screenStream : stream;
    if (!activeStream) {
      console.error('No active stream available for peer addition');
      return null;
    }

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: activeStream,
    });

    peer.on('signal', signal => {
      console.log('Responding to signal from:', callerID);
      socketRef.current.emit('signal', {
        userToSignal: callerID,
        callerID: userToSignal,
        signal,
        userName: callerName,
      });
    });

    peer.on('stream', stream => {
      console.log('Received stream from peer:', callerID);
    });

    peer.on('connect', () => {
      console.log('Peer connected to:', callerID);
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
      const peerObj = peersRef.current.find(p => p.peer === peer);
      if (peerObj) {
        peersRef.current = peersRef.current.filter(p => p.peer !== peer);
        setPeers(peers => peers.filter(p => p.peerID !== peerObj.peerID));
      }
    });

    return peer;
  };

  const updatePeersWithStream = (newStream) => {
    console.log('Updating peers with new stream');
    peersRef.current.forEach(({ peer }) => {
      try {
        if (peer && peer._pc && peer._pc.connectionState === 'connected') {
          const senders = peer._pc.getSenders();
          const sender = senders.find(s => s.track && s.track.kind === 'video');
          if (sender && newStream) {
            const videoTrack = newStream.getVideoTracks()[0];
            if (videoTrack) {
              console.log('Replacing video track for peer');
              sender.replaceTrack(videoTrack).catch(err => console.error('Error replacing track:', err));
            }
          }
        } else {
          console.warn('Peer connection not ready for stream update:', peer);
        }
      } catch (err) {
        console.error('Error updating peer stream:', err);
      }
    });
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsMuted(!audioTracks[0].enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoTracks[0].enabled;
        setIsVideoOff(!videoTracks[0].enabled);
        if (!isScreenSharing) {
          updatePeersWithStream(stream);
        }
        socketRef.current.emit('stream-update', {
          meetingId,
          userId: socketRef.current.id,
          isScreenSharing,
          isVideoOff: !videoTracks[0].enabled,
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });

        setScreenStream(displayStream);

        if (userVideo.current) {
          userVideo.current.srcObject = displayStream;
        }

        updatePeersWithStream(displayStream);

        displayStream.getVideoTracks()[0].onended = () => {
          stopScreenSharing();
        };

        setIsScreenSharing(true);
        socketRef.current.emit('stream-update', {
          meetingId,
          userId: socketRef.current.id,
          isScreenSharing: true,
          isVideoOff,
        });
      } else {
        stopScreenSharing();
      }
    } catch (err) {
      console.error('Error sharing screen:', err);
      alert('Failed to share screen. Please try again.');
    }
  };

  const stopScreenSharing = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOff;

        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }

        updatePeersWithStream(stream);
      }
    }

    setIsScreenSharing(false);
    socketRef.current.emit('stream-update', {
      meetingId,
      userId: socketRef.current.id,
      isScreenSharing: false,
      isVideoOff,
    });
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Video Meeting</h1>
        <div className="text-sm opacity-75">
          {participantCount} participants
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className={`grid gap-4 ${peers.length > 0 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'place-items-center'}`}>
          {localStreamAvailable && (
            <div className={`relative ${peers.length === 0 ? 'h-96 w-full max-w-lg' : 'w-full'}`}>
              <video
                ref={userVideo}
                autoPlay
                playsInline
                muted
                className="w-full h-full rounded-lg bg-gray-800 object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-gray-800 bg-opacity-80 px-2 py-1 rounded text-sm">
                {userName} (You)
                {isMuted && <span className="ml-2 text-red-500">🔇</span>}
                {isVideoOff && <span className="ml-2 text-red-500">🚫</span>}
              </div>
            </div>
          )}

          {peers.map((peer) => (
            <ParticipantVideo
              key={peer.peerID}
              peer={peer.peer}
              userName={peer.userName || 'Participant'}
            />
          ))}
        </div>
      </div>

      <Controls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        meetingLink={meetingLink}
      />
    </div>
  );
}

export default Meeting;