import '@/browser/global.css';
import { createRoot } from 'react-dom/client';
import { PlayerGraphic } from '../player/PlayerGraphic';

const root = createRoot(document.getElementById('root')!);
root.render(<PlayerGraphic playerIndex={3} />);
