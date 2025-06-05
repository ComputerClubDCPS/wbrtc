'use client';

import React, { useEffect, useState, useRef, KeyboardEvent } from 'react';
import Libp2p from 'libp2p';
import { WebSockets } from '@libp2p/websockets';
import { Mplex } from '@libp2p/mplex';
import { Noise } from '@chainsafe/libp2p-noise';
import { gossipsub, GossipsubEvents, Message as GossipsubMessage } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';

const TOPIC = 'libp2p-group-chat';

type ChatMessage = {
  from: string;
  text: string;
};

export default function Libp2pChat(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const libp2pRef = useRef<Libp2p | null>(null);

  useEffect(() => {
    async function startLibp2p() {
      try {
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

        node.pubsub.addEventListener('message', (evt: GossipsubEvents.Message) => {
          const msg: GossipsubMessage = evt.detail;
          const text = new TextDecoder().decode(msg.data);

          if (msg.from !== node.peerId.toString()) {
            setMessages((msgs) => [...msgs, { from: msg.from, text }]);
          }
        });

        await node.pubsub.subscribe(TOPIC);
        libp2pRef.current = node;
      } catch (err) {
        console.error('Failed to start libp2p', err);
      }
    }

    startLibp2p();

    return () => {
      if (libp2pRef.current) {
        libp2pRef.current.stop();
      }
    };
  }, []);

  async function sendMessage() {
    if (!libp2pRef.current || !input.trim()) return;
    const msg = input.trim();

    try {
      await libp2pRef.current.pubsub.publish(TOPIC, new TextEncoder().encode(msg));
      setMessages((msgs) => [...msgs, { from: 'Me', text: msg }]);
      setInput('');
    } catch (err) {
      console.error('Send error:', err);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>libp2p Gossipsub Group Chat (TS)</h1>
      <div
        style={{
          height: 300,
          border: '1px solid #ccc',
          padding: 10,
          marginBottom: 10,
          overflowY: 'auto',
          backgroundColor: '#fafafa',
          borderRadius: 6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {messages.map(({ from, text }, i) => (
          <div
            key={i}
            style={{
              margin: '6px 0',
              color: from === 'Me' ? 'blue' : 'black',
              fontWeight: from === 'Me' ? 'bold' : 'normal',
            }}
          >
            <b>{from === 'Me' ? 'Me' : from.slice(0, 6)}:</b> {text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
          aria-label="Chat message input"
        />
        <button
          type="button"
          onClick={sendMessage}
          style={{
            padding: '10px 16px',
            borderRadius: 6,
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Send chat message"
        >
          Send
        </button>
      </div>
    </main>
  );
}
