import React, { useEffect, useRef } from 'react';
import { X, Play, Pause, Terminal } from 'lucide-react';

interface MatrixRainProps {
  onClose: () => void;
}

const CODE_LINES = [
  'import React, { useState, useEffect } from "react";',
  'const [currentUser, setCurrentUser] = useState(null);',
  'const [ordens, setOrdens] = useState<OrdemServico[]>([]);',
  'interface OrdemServico { id: string; local: string; prioridade: string; }',
  'localStorage.setItem("ordens_servico_central", JSON.stringify(updated));',
  'const loadOrdens = () => { const stored = localStorage.getItem(key); }',
  'app.get("/api/health", (req, res) => { res.json({ status: "ok" }); });',
  'const startServer = () => { app.listen(3000, "0.0.0.0"); };',
  'export type PerfilUsuario = "solicitante" | "executor" | "supervisor" | "gerente" | "admin";',
  'const USUARIOS_PADRAO: Usuario[] = [ { id: "usr-1", name: "Abrir OS", role: "solicitante" } ];',
  'const handleLogin = (user) => { setCurrentUser(user); setActiveTab(user.role); };',
  'const filtered = ordens.filter(o => o.status !== "resolvido");',
  'const getRoleBadgeStyle = (role) => { switch (role) { case "admin": return "bg-red-50"; } };',
  'const handleAddOrdem = (ordem) => { setOrdens([...ordens, ordem]); };',
  'const handleEditUsuario = (id, updated) => { setUsuarios(updated); };',
  '<AdminView usuarios={usuarios} onAddUsuario={handleAddUsuario} />',
  '<LoginView usuarios={usuarios} onLogin={handleLogin} />',
  '<SupervisorView ordens={ordens} onDelegar={handleDelegar} />',
  '<GerenteView ordens={ordens} usuarios={usuarios} />',
  '// Aura OS core logic - v3.4.1 (Stable)',
  '// Simulating backend synchronizer in 10s intervals',
  'useEffect(() => { const interval = setInterval(loadOrdens, 10000); return () => clearInterval(interval); }, []);',
  'const root = ReactDOM.createRoot(document.getElementById("root"));',
  'const database = { provider: "LocalStorage", type: "Key-Value State Store" };',
  'const handleUpdateStatus = (id, status) => { setOrdens(ordens.map(o => o.id === id ? { ...o, status } : o)); };',
  'const getPrioridadeBadge = (p) => { return p === "alta" ? "bg-red-100 text-red-800" : "bg-gray-100"; };',
  'const handleCancelOrdem = (id) => { if (confirm("Deseja cancelar?")) { remove(id); } };'
];

export const MatrixRain: React.FC<MatrixRainProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvas2Ref = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const canvas2 = canvas2Ref.current;
    if (!canvas || !canvas2) return;

    const ctx = canvas.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    if (!ctx || !ctx2) return;

    let animationId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas2.width = window.innerWidth;
      canvas2.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Matrix characters (mix of Japanese katakana, binary and random symbols)
    const matrixChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$#@%&*+=[]{}<>/\u30A0\u30A1\u30A2\u30A3\u30A4\u30A5\u30A6\u30A7\u30A8\u30A9\u30AA\u30AB\u30AC\u30AD\u30AE\u30AF";
    const charsArray = matrixChars.split("");

    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    if (columns <= 0) columns = 1;

    // falling positions for characters (y coordinates)
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // stagger start times
    }

    // Code lines falling (overlaying some columns with actual code lines scrolling)
    interface CodeStream {
      x: number;
      y: number;
      text: string;
      speed: number;
      opacity: number;
    }

    const codeStreams: CodeStream[] = [];
    const maxCodeStreams = Math.min(12, Math.floor(canvas.width / 140));

    const createCodeStream = (initialY = -50): CodeStream => {
      // Avoid starting too close to the screen edges
      const margin = 100;
      const range = Math.max(200, canvas.width - margin * 2);
      return {
        x: margin + Math.random() * range,
        y: initialY,
        text: CODE_LINES[Math.floor(Math.random() * CODE_LINES.length)],
        speed: 0.4 + Math.random() * 0.5, // nice slow reading speed
        opacity: 0.9 + Math.random() * 0.1 // high contrast opacity
      };
    };

    for (let i = 0; i < maxCodeStreams; i++) {
      codeStreams.push(createCodeStream(Math.random() * canvas.height));
    }

    // Main draw loop
    const draw = () => {
      // 1. Draw classical matrix digital rain in the background canvas (with trailing fade)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `bold ${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = charsArray[Math.floor(Math.random() * charsArray.length)];
        
        // Randomize brightness
        const isBright = Math.random() > 0.97;
        ctx.fillStyle = isBright ? '#ffffff' : 'rgba(34, 197, 94, 0.85)'; // emerald-500/white

        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(text, x, y);

        // Reset drop back to top once it hits bottom or randomly
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i] += 0.35;
      }

      // 2. Clear the foreground canvas (ctx2) to eliminate ANY motion blur or trailing on the code lines!
      ctx2.clearRect(0, 0, canvas2.width, canvas2.height);

      // 3. Draw actual scrolling program code lines in the foreground with absolute clarity
      ctx2.font = '600 14px monospace';
      
      for (let i = 0; i < codeStreams.length; i++) {
        const stream = codeStreams[i];
        
        // Measure text for high contrast black capsule background
        const metrics = ctx2.measureText(stream.text);
        const textWidth = metrics.width;
        const padX = 10;
        const padY = 6;

        // Black back-shadow box behind code block so green background elements don't overlap the letters
        ctx2.fillStyle = 'rgba(8, 8, 8, 0.85)';
        ctx2.fillRect(
          stream.x - padX,
          stream.y - 12 - padY,
          textWidth + (padX * 2),
          16 + (padY * 2)
        );

        // Subtly lit green border around code line box
        ctx2.strokeStyle = 'rgba(74, 222, 128, 0.35)';
        ctx2.lineWidth = 1;
        ctx2.strokeRect(
          stream.x - padX,
          stream.y - 12 - padY,
          textWidth + (padX * 2),
          16 + (padY * 2)
        );
        
        // Render crisp green code text without any blur or trail
        ctx2.fillStyle = '#4ade80'; // Emerald green
        ctx2.fillText(stream.text, stream.x, stream.y);

        stream.y += stream.speed;

        // If it goes off screen, reset with new text, random x, and y at the top
        if (stream.y > canvas2.height) {
          codeStreams[i] = createCodeStream(-40);
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-[99999] flex flex-col justify-between overflow-hidden select-none"
      id="matrix-overlay"
    >
      {/* Background Matrix Rain */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Foreground Crisp Code Overlay */}
      <canvas ref={canvas2Ref} className="absolute inset-0 block w-full h-full pointer-events-none" />

      {/* Control overlay header */}
      <div className="relative z-10 w-full px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" />
              <span>AURA OS // MATRIX CONSOLE ACTIVE</span>
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              Visualizing underlying state & reactive interface components
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-mono text-xs font-bold px-4 py-2 rounded border border-red-500 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          id="btn-matrix-exit"
        >
          <X className="w-4 h-4" />
          <span>SAIR DA MATRIX</span>
        </button>
      </div>

      {/* Floating explanatory banner at the bottom */}
      <div className="relative z-10 w-full max-w-xl mx-auto mb-6 p-4 bg-black/90 border border-green-500/30 rounded-xl shadow-2xl backdrop-blur-md text-center">
        <p className="font-mono text-xs text-green-400 mb-1 font-semibold uppercase tracking-wider">
          🖥️ Algoritmo em Execução
        </p>
        <p className="font-mono text-[11px] text-gray-300 leading-relaxed">
          Esta tela mostra o algoritmo e o código fonte do sistema funcionando em tempo real. Os fluxos exibidos representam as regras de negócio, a reatividade do estado do React e o processamento de ordens do Aura OS.
        </p>
      </div>
    </div>
  );
};
