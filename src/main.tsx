import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Hambaapp from "./Hambaapp.tsx";  // ✅ imported name matches file
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Hambaapp />  {/* ✅ use HambaApp here, not App */}
  </StrictMode>,
);