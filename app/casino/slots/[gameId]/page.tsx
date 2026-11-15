import SlotGameClient from './SlotGameClient';

// Static Export এর জন্য বাধ্যতামূলক
export function generateStaticParams() {
  return [
    { gameId: 'sweet-bonanza' },
    { gameId: 'gates-of-olympus' },
    { gameId: 'book-of-dead' },
    { gameId: 'starburst' },
    { gameId: 'aviator' },
    { gameId: 'mines' },
  ];
}

export default async function Page({ params }: { params: Promise<{ gameId: string }> }) {
  const resolvedParams = await params;
  
  return <SlotGameClient gameId={resolvedParams.gameId} />;
}
