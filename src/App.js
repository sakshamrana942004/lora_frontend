import React, { useState, useEffect, useRef, useCallback } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [peers, setPeers] = useState([]);
  const [connectedUser, setConnectedUser] = useState(null);
  const [radioInfo, setRadioInfo] = useState({ freq: "N/A", power: "N/A" });
  const [inputText, setInputText] = useState("");
  const [selectedPeer, setSelectedPeer] = useState("^all");
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const socketRef = useRef(null);
  const scrollRef = useRef(null);

  const connectWebSocket = useCallback(() => {
    if (socketRef.current) return;
    const socket = new WebSocket('ws://localhost:8000/ws');
    socket.onmessage = (event) => setMessages(prev => [...prev, JSON.parse(event.data)]);
    socket.onclose = () => { socketRef.current = null; };
    socketRef.current = socket;
  }, []);

  const fetchPeers = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/peers');
      const data = await res.json();
      setPeers(Array.isArray(data) ? data : []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:8000/status');
        const data = await res.json();
        setIsOnline(data.internet);
        setRadioInfo(data.radio);

        if (data.hardware) {
           setConnectedUser(data.username);
           if (!socketRef.current) connectWebSocket();
           if (peers.length === 0) fetchPeers();
        } else {
           setConnectedUser(null);
           fetch('http://localhost:8000/auto-scan');
        }
      } catch (e) { setIsOnline(false); }
    };
    // Reduced interval for faster UI updates
    const interval = setInterval(checkStatus, 2000); 
    return () => clearInterval(interval);
  }, [connectedUser, connectWebSocket, fetchPeers, peers.length]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if(!inputText || isLoading || !connectedUser) return;
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/send?text=${inputText}&target=${selectedPeer}`, { method: 'POST' });
      const data = await res.json();
      if(data.status === "sent") {
        setMessages(prev => [...prev, { 
            text: inputText, 
            sender: "Me", 
            via: data.mode === "Internet" ? "🌐 Cloud" : "📡 LoRa",
            time: data.time // Backend timestamp
        }]);
        setInputText("");
      }
    } catch (err) { alert("Send failed."); }
    finally { setIsLoading(false); }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Segoe UI', backgroundColor: '#f0f2f5' }}>
      {/* Sidebar */}
      <div style={{ width: '310px', background: '#1c2938', color: 'white', padding: '25px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ textAlign: 'center', color: '#3498db', marginBottom: '25px' }}>Hybrid Console</h2>
        <div style={{ padding: '14px', background: isOnline ? '#2ecc71' : '#e67e22', borderRadius: '10px', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
          {isOnline ? "🌐 INTERNET ACTIVE" : "📡 LORA MODE"}
        </div>
        <div style={{ background: '#2c3e50', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
           <div style={{ color: '#3498db', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.8rem' }}>RADIO SPECS</div>
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span>Frequency:</span> <span style={{ color: '#f1c40f' }}>{radioInfo.freq}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '0.75rem' }}>
              <span>Tx Power:</span> <span style={{ color: '#e74c3c' }}>{radioInfo.power}</span>
           </div>
        </div>
        <div style={{ padding: '20px', background: connectedUser ? '#27ae60' : '#2c3e50', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold' }}>{connectedUser ? "✅ READY" : "🔍 SEARCHING..."}</div>
          <div style={{ fontSize: '0.7rem', marginTop: '5px', opacity: 0.8 }}>{connectedUser || "Waiting for T3S3..."}</div>
        </div>
        <h4 style={{ fontSize: '0.85rem', marginTop: '20px', marginBottom: '10px' }}>TARGET PEER</h4>
        <select value={selectedPeer} onChange={(e) => setSelectedPeer(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#34495e', color: 'white', border: 'none' }}>
          <option value="^all">Broadcast (All)</option>
          {peers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Main Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: 'white', padding: '15px 35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Communication Hub</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: isOnline ? '#2ecc71' : '#e67e22', fontWeight: 'bold' }}>{connectedUser || "Offline"}</div>
            <small style={{ fontSize: '0.7rem', color: '#95a5a6' }}>{isOnline ? "🌐 Global Mesh" : "📡 Local Radio"}</small>
          </div>
        </header>

        <div style={{ flex: 1, padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.sender === "Me" ? 'flex-end' : 'flex-start', maxWidth: '65%', marginBottom: '15px', padding: '12px 18px', background: m.sender === "Me" ? '#0084ff' : '#f1f3f4', color: m.sender === "Me" ? 'white' : '#333', borderRadius: '18px', position: 'relative' }}>
              <small style={{ display: 'block', fontWeight: 'bold', fontSize: '0.65rem', marginBottom: '4px', opacity: 0.8 }}>{m.sender.toUpperCase()} • {m.via}</small>
              <div style={{ fontSize: '1rem' }}>{m.text}</div>
              <div style={{ fontSize: '0.6rem', textAlign: 'right', marginTop: '4px', opacity: 0.6 }}>{m.time}</div>
            </div>
          ))}
          <div ref={scrollRef}></div>
        </div>

        <div style={{ padding: '20px 30px', background: 'white', borderTop: '1px solid #eee', display: 'flex', gap: '15px' }}>
          <input value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} disabled={!connectedUser || isLoading} style={{ flex: 1, padding: '12px 20px', borderRadius: '25px', border: '1px solid #ddd', outline: 'none' }} placeholder="Type a message..."/>
          <button onClick={sendMessage} disabled={!connectedUser || isLoading} style={{ background: '#0084ff', color: 'white', border: 'none', padding: '0 30px', borderRadius: '25px', fontWeight: 'bold' }}>
            {isLoading ? "..." : "SEND"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;