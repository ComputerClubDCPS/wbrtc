import dynamic from 'next/dynamic';

// Load client-side only to avoid SSR issues
const Libp2pChat = dynamic(() => import('../components/Libp2pChat'), { ssr: false });

export default function Home() {
  return <Libp2pChat />;
}
