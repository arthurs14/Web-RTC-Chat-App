import React, { createContext, useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';

const SocketContext = createContext();

const socket = io('http://localhost:5000');

const ContextProvider = ({ children }) => {
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState('');
  const [call, setCall] = useState({});
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(currentStream => {
      setStream(currentStream);
      myVideo.current.srcObject = currentStream;
    });

    socket.on('me', (id) => setMe(id));

    socket.on('calluser', ({ from, name: callerName, signal }) => {
      setCall({ isReceivedCall: true, from, name: callerName, signal });
    });
  }, []);

  const answerCall = () => {
    setCallAccepted(true);

    // action and handlers when we call someone
    const peer = new Peer({ initiator: false, trickle: false, stream });

    // connects to socket
    peer.on('signal', (data) => {
      socket.emit('answercall', { signal: data, to: call.from });
    });

    // other person's stream
    peer.on('stream', currentStream => {
      userVideo.current.srcObject = currentStream;
    });

    peer.signal(call.signal);

    // current connection = to the peer inside this connection
    connectionRef.current = peer;
  };

  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on('signal', (data) => {
      socket.emit('calluser', { userToCall: id, signData: data, from: me, name });
    });

    // other person's stream
    peer.on('stream', currentStream => {
      userVideo.current.srcObject = currentStream;
    });

    socket.on('callaccepted', signal => {
      setCallAccepted(true);

      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);

    // destroy connection - stop input from camera and video
    connectionRef.current.destroy();

    // reloads page with new user id
    window.location.reload();
  };

  const data = {
    call,
    callAccepted,
    myVideo,
    userVideo,
    stream,
    name,
    setName,
    callEnded,
    me,
    callUser,
    leaveCall,
    answerCall,
  };

  return (
    <SocketContext.Provider value={data}>
      { children }
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };