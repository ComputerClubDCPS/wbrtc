'use client';

import React, { useEffect, useState, useRef } from 'react';
import Libp2p from 'libp2p';
import { WebSockets } from '@libp2p/websockets';
import { Mplex } from '@libp2p/mplex';
import { Noise } from '@chainsafe/libp2p-noise';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';

const TOPIC = 'libp2p-group-chat';

export default function Libp2pChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const libp2pRef = useRef();

  useEffect(() => {
    async function startLibp2p() {
      const node = await Libp2p.create({
        transports: [new WebSockets()],
        streamMuxers: [new Mplex()],
        connectionEncryption: [new Noise()],
        pubsub: gossipsub(),
        peerDiscovery: [
          bootstrap({
            list: [
              '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
              '/dns4/wrtc-star2.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
            ],
          }),
        ],
      });

      await node.start();
      console.log('Libp2p started with id:', node.peerId.toString());

      node.pubsub.subscribe(TOPIC, (msg) => {
        try {
          const text = new TextDecoder().decode(msg.detail.data);
          const from = msg.detail.from;
          if (from !== node.peerId.toString()) {
            setMessages((msgs) => [...msgs, { from, text }]);
          }
        } catch (err) {
          console.error('Error decoding message', err);
        }
      });

      libp2pRef.current = node;
    }

    startLibp2p();

    return () => {
      if (libp2pRef.current) libp2pRef.current.stop();
    };
  }, []);

  async function sendMessage() {
    if (!libp2pRef.current || !input.trim()) return;
    try {
      await libp2pRef.current.pubsub.publish(
        TOPIC,
        new TextEncoder().encode(input)
      );
      setMessages((msgs) => [...msgs, { from: 'Me', text: input }]);
      setInput('');
    } catch (err) {
      console.error('Send error', err);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'Arial' }}>
      <h1>libp2p Gossipsub Group Chat</h1>
      <div
        style={{
          height: 300,
          border: '1px solid #ccc',
          padding: 10,
          marginBottom: 10,
          overflowY: 'auto',
          backgroundColor: '#fafafa',
          borderRadius: 6,
        }}
      >
        {messages.map(({ from, text }, i) => (
          <div
            key={i}
            style={{
              margin: '6px 0',
              color: from === 'Me' ? 'blue' : 'black',
              fontWeight: from === 'Me' ? 'bold' : 'normal',
              wordBreak: 'break-word',
            }}
          >
            <span>{from === 'Me' ? 'Me' : from.slice(0, 6)}:</span> {text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: '10px 16px',
            borderRadius: 6,
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </div>
    </main>
  );
}
