import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '../../utils/format';

export function PremiumCard({ children, className, padded = true }: { children: React.ReactNode, className?: string, padded?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['7deg', '-7deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-7deg', '7deg']);
  
  // Glare effect positioning
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['100%', '0%']);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['100%', '0%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => {
    setHovering(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={cn(
        "relative rounded-2xl overflow-hidden backdrop-blur-xl transition-shadow duration-500",
        "bg-premium-panel/80",
        hovering ? "shadow-premium-hover ring-1 ring-white/15 z-10" : "shadow-premium-glass ring-1 ring-white/10 z-0",
        padded && "p-6",
        className
      )}
    >
      <div 
        className="pointer-events-none absolute inset-0 z-50 rounded-2xl transition-opacity duration-300"
        style={{
          opacity: hovering ? 1 : 0,
          background: `radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)`,
          transform: `translate(${glareX}, ${glareY})`,
        }}
      />
      {/* Noise Texture Overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay bg-noise" />
      
      <div style={{ transform: 'translateZ(20px)' }} className="relative z-20">
        {children}
      </div>
    </motion.div>
  );
}

export function PremiumStatCard({
  label, value, sub, icon, tone = 'default', trend, delay = 0
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: React.ReactNode
  tone?: 'default' | 'navy' | 'warn' | 'danger' | 'success' | 'violet'
  trend?: { up?: boolean; value: string; label?: string }
  delay?: number
}) {
  const toneColor: Record<string, string> = {
    default: '#ffffff',
    navy:    '#0A84FF',
    warn:    '#FF9F0A',
    danger:  '#FF453A',
    success: '#32D74B',
    violet:  '#BF5AF2',
  }

  const color = toneColor[tone] || toneColor.default;

  return (
    <PremiumCard padded={false} className="p-5 group">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay * 0.001, type: 'spring', stiffness: 100, damping: 20 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors">{label}</p>
          <div className="mt-2 text-3xl font-black tracking-tight drop-shadow-lg" style={{ color, textShadow: `0 0 20px ${color}50` }}>
            {value}
          </div>
          {sub && <div className="mt-1 text-xs text-white/30 font-medium">{sub}</div>}
          {trend && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-premium-glass" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: trend.up ? '#32D74B' : '#FF453A', textShadow: `0 0 10px ${trend.up ? '#32D74B' : '#FF453A'}80` }}>
                {trend.up ? '▲' : '▼'}
              </span>
              <span className="text-white/90">{trend.value}</span>
              {trend.label && <span className="text-white/30">{trend.label}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-premium-glass ring-1 ring-white/10" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))` }}>
            <span style={{ color, filter: `drop-shadow(0 0 8px ${color}80)` }}>{icon}</span>
          </div>
        )}
      </motion.div>
    </PremiumCard>
  )
}
