import '@/browser/global.css';
import { createRoot } from 'react-dom/client';
import { ResultGraphic } from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<ResultGraphic />);
