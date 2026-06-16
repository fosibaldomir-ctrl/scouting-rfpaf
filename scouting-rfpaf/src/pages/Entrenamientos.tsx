import { useState, useRef, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  ChevronDown, Plus, Trash2, Download, Image, Video, Camera,
  Users, Clock, Wrench, FileText, Pencil, Circle,
  Square, Minus, ArrowRight, Type, Undo2, Eraser, UserX,
  BookOpen, ClipboardList, X, ListOrdered,
} from 'lucide-react'

/* ═══════════════════════════════════════
   TYPES
═══════════════════════════════════════ */

interface Ejercicio {
  id: string; tipo: string; duracion: string; descripcion: string
  numJugadores: string; material: string; imagen: string | null; video: string | null; creadoEn: string
}

interface EjercicioSesion {
  id: string; orden: number; tipo: string; duracion: string
  descripcion: string; numJugadores: string; material: string; imagen: string | null
}

interface Sesion {
  fecha: string; hora: string; campo: string; numConvocatoria: string
  fase: string; entrenador: string; numJugadorasConvocadas: string
  objetivos: string; observaciones: string
  capturas: string[]; ejercicios: EjercicioSesion[]
}

type DrawTool = 'freehand' | 'line' | 'arrow' | 'curve' | 'curvearrow' | 'circle' | 'rect' | 'text'
type PitchType = 'full' | 'half' | 'blank'
interface Point { x: number; y: number }
interface Shape { type: DrawTool; color: string; width: number; dashed?: boolean; start?: Point; end?: Point; points?: Point[]; text?: string }

type TeamId = 1 | 2 | 3
interface PlacedPlayer { uid: string; team: TeamId; number: number; x: number; y: number }
interface SelPlayer { team: TeamId; number: number }

type AccessoryType = 'goal_front' | 'goal_3d_r' | 'goal_3d_l' | 'goal_side' | 'goal_mini' | 'goal_arc' | 'cone' | 'mushroom' | 'ladder' | 'hurdle' | 'mannequin' | 'barrier' | 'ball_bw' | 'ball_blue' | 'ball_red'
interface PlacedAccessory { uid: string; type: AccessoryType; x: number; y: number; rotation: number; color?: string; scale: number }
interface SelAcc { type: AccessoryType; color?: string }

type Tab = 'biblioteca' | 'sesion'

/* ═══════════════════════════════════════
   PLAYER CONSTANTS
═══════════════════════════════════════ */

const TEAMS: Record<TeamId, { bg: string; border: string; text: string; label: string }> = {
  1: { bg: '#2563eb', border: '#1d4ed8', text: '#ffffff', label: 'Equipo A' },
  2: { bg: '#dc2626', border: '#b91c1c', text: '#ffffff', label: 'Equipo B' },
  3: { bg: '#ca8a04', border: '#a16207', text: '#000000', label: 'Equipo C' },
}
const PLAYER_R = 15
const ACC_LOCAL_HALF = 22
const HANDLE_R = 7
const ROT_EXTRA = 22

function drawAccessory(ctx: CanvasRenderingContext2D, a: PlacedAccessory, dragging: boolean) {
  ctx.save()
  ctx.translate(a.x, a.y)
  if (a.rotation) ctx.rotate(a.rotation * Math.PI / 180)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.shadowColor = dragging ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = dragging ? 12 : 5; ctx.shadowOffsetY = dragging ? 0 : 2
  ctx.scale(a.scale, a.scale)
  const clr = a.color
  switch (a.type) {
    case 'goal_front': {
      const L=-18,R=18,T=-9,B=9
      // Sombra de suelo
      ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1.5
      ctx.beginPath();ctx.moveTo(L-2,B+2);ctx.lineTo(R+2,B+2);ctx.stroke()
      // Sugerencia de profundidad trasera
      ctx.strokeStyle='rgba(255,255,255,0.22)';ctx.lineWidth=1
      ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(L+3,T-3);ctx.lineTo(R+3,T-3);ctx.lineTo(R,T);ctx.stroke()
      // Red de diamante (clip al interior)
      ctx.save();ctx.beginPath();ctx.rect(L,T,R-L,B-T);ctx.clip()
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=0.55
      for(let x=L-25;x<R+25;x+=5){ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x+(B-T),B);ctx.stroke();ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x-(B-T),B);ctx.stroke()}
      ctx.restore()
      // Marco (3 lados, sin suelo)
      ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round'
      ctx.beginPath();ctx.moveTo(L,B);ctx.lineTo(L,T);ctx.lineTo(R,T);ctx.lineTo(R,B);ctx.stroke()
      // Brillo en postes (efecto cilíndrico)
      ctx.strokeStyle='rgba(255,255,255,0.42)';ctx.lineWidth=0.9
      ctx.beginPath();ctx.moveTo(L+1.4,B);ctx.lineTo(L+1.4,T+1.4);ctx.lineTo(R-1.4,T+1.4);ctx.lineTo(R-1.4,B);ctx.stroke()
      break
    }
    case 'goal_3d_r': {
      // Front: fl=-18,fr=6,ft=-4,fb=12 | Back: bl=-6,br=18,bt=-12,bb=4
      const fl=-18,fr=6,ft=-4,fb=12,bl=-6,br=18,bt=-12,bb=4
      // Sombra suelo
      ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1.5
      ctx.beginPath();ctx.moveTo(fl-1,fb+2);ctx.lineTo(bl,bb+2);ctx.stroke()
      // Red cara frontal
      ctx.save();ctx.beginPath();ctx.rect(fl,ft,fr-fl,fb-ft);ctx.clip()
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=0.5
      for(let x=fl-25;x<fr+25;x+=5){ctx.beginPath();ctx.moveTo(x,ft);ctx.lineTo(x+(fb-ft),fb);ctx.stroke();ctx.beginPath();ctx.moveTo(x,ft);ctx.lineTo(x-(fb-ft),fb);ctx.stroke()}
      ctx.restore()
      // Red cara lateral derecha (cuadrícula en perspectiva)
      ctx.save();ctx.beginPath();ctx.moveTo(fr,ft);ctx.lineTo(br,bt);ctx.lineTo(br,bb);ctx.lineTo(fr,fb);ctx.closePath();ctx.clip()
      ctx.strokeStyle='rgba(255,255,255,0.14)';ctx.lineWidth=0.5
      for(let i=0;i<=5;i++){const v=i/5;ctx.beginPath();ctx.moveTo(fr,ft+v*(fb-ft));ctx.lineTo(br,bt+v*(bb-bt));ctx.stroke()}
      for(let i=0;i<=4;i++){const u=i/4;ctx.beginPath();ctx.moveTo(fr+u*(br-fr),ft+u*(bt-ft));ctx.lineTo(fr+u*(br-fr),fb+u*(bb-fb));ctx.stroke()}
      ctx.restore()
      // Marco trasero (más tenue = profundidad)
      ctx.strokeStyle='rgba(255,255,255,0.55)';ctx.lineWidth=1.7;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(br,bt);ctx.lineTo(br,bb);ctx.stroke()
      ctx.beginPath();ctx.moveTo(bl,bt);ctx.lineTo(br,bt);ctx.stroke()
      // Barras de profundidad superior
      ctx.strokeStyle='rgba(255,255,255,0.48)';ctx.lineWidth=1.5
      ctx.beginPath();ctx.moveTo(fl,ft);ctx.lineTo(bl,bt);ctx.stroke()
      ctx.beginPath();ctx.moveTo(fr,ft);ctx.lineTo(br,bt);ctx.stroke()
      // Barras de base
      ctx.strokeStyle='rgba(255,255,255,0.38)';ctx.lineWidth=1.3
      ctx.beginPath();ctx.moveTo(fl,fb);ctx.lineTo(bl,bb);ctx.stroke()
      ctx.beginPath();ctx.moveTo(fr,fb);ctx.lineTo(br,bb);ctx.stroke()
      ctx.beginPath();ctx.moveTo(bl,bb);ctx.lineTo(br,bb);ctx.stroke()
      // Marco frontal (más brillante y grueso)
      ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round'
      ctx.beginPath();ctx.moveTo(fl,fb);ctx.lineTo(fl,ft);ctx.lineTo(fr,ft);ctx.lineTo(fr,fb);ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,0.42)';ctx.lineWidth=0.9
      ctx.beginPath();ctx.moveTo(fl+1.4,fb);ctx.lineTo(fl+1.4,ft+1.4);ctx.lineTo(fr-1.4,ft+1.4);ctx.lineTo(fr-1.4,fb);ctx.stroke()
      break
    }
    case 'goal_3d_l': {
      // Front: fl=-6,fr=18,ft=-4,fb=12 | Back: bl=-18,br=6,bt=-12,bb=4
      const fl=-6,fr=18,ft=-4,fb=12,bl=-18,br=6,bt=-12,bb=4
      ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1.5
      ctx.beginPath();ctx.moveTo(br,bb+2);ctx.lineTo(fr+1,fb+2);ctx.stroke()
      // Red cara frontal
      ctx.save();ctx.beginPath();ctx.rect(fl,ft,fr-fl,fb-ft);ctx.clip()
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=0.5
      for(let x=fl-25;x<fr+25;x+=5){ctx.beginPath();ctx.moveTo(x,ft);ctx.lineTo(x+(fb-ft),fb);ctx.stroke();ctx.beginPath();ctx.moveTo(x,ft);ctx.lineTo(x-(fb-ft),fb);ctx.stroke()}
      ctx.restore()
      // Red cara lateral izquierda
      ctx.save();ctx.beginPath();ctx.moveTo(fl,ft);ctx.lineTo(bl,bt);ctx.lineTo(bl,bb);ctx.lineTo(fl,fb);ctx.closePath();ctx.clip()
      ctx.strokeStyle='rgba(255,255,255,0.14)';ctx.lineWidth=0.5
      for(let i=0;i<=5;i++){const v=i/5;ctx.beginPath();ctx.moveTo(fl,ft+v*(fb-ft));ctx.lineTo(bl,bt+v*(bb-bt));ctx.stroke()}
      for(let i=0;i<=4;i++){const u=i/4;ctx.beginPath();ctx.moveTo(fl+u*(bl-fl),ft+u*(bt-ft));ctx.lineTo(fl+u*(bl-fl),fb+u*(bb-fb));ctx.stroke()}
      ctx.restore()
      ctx.strokeStyle='rgba(255,255,255,0.55)';ctx.lineWidth=1.7;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(bl,bt);ctx.lineTo(bl,bb);ctx.stroke()
      ctx.beginPath();ctx.moveTo(bl,bt);ctx.lineTo(br,bt);ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,0.48)';ctx.lineWidth=1.5
      ctx.beginPath();ctx.moveTo(fr,ft);ctx.lineTo(br,bt);ctx.stroke()
      ctx.beginPath();ctx.moveTo(fl,ft);ctx.lineTo(bl,bt);ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,0.38)';ctx.lineWidth=1.3
      ctx.beginPath();ctx.moveTo(fr,fb);ctx.lineTo(br,bb);ctx.stroke()
      ctx.beginPath();ctx.moveTo(fl,fb);ctx.lineTo(bl,bb);ctx.stroke()
      ctx.beginPath();ctx.moveTo(bl,bb);ctx.lineTo(br,bb);ctx.stroke()
      ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round'
      ctx.beginPath();ctx.moveTo(fr,fb);ctx.lineTo(fr,ft);ctx.lineTo(fl,ft);ctx.lineTo(fl,fb);ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,0.42)';ctx.lineWidth=0.9
      ctx.beginPath();ctx.moveTo(fr-1.4,fb);ctx.lineTo(fr-1.4,ft+1.4);ctx.lineTo(fl+1.4,ft+1.4);ctx.lineTo(fl+1.4,fb);ctx.stroke()
      break
    }
    case 'goal_side': {
      const L=-15,R=15,T=-9,B=9
      ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1.5
      ctx.beginPath();ctx.moveTo(L-1,B+2);ctx.lineTo(R+1,B+2);ctx.stroke()
      // Red (cuadrícula de perspectiva lateral)
      ctx.save();ctx.beginPath();ctx.rect(L,T,R-L,B-T);ctx.clip()
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=0.5
      for(let i=1;i<7;i++){const x=L+(R-L)*i/7;ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,B);ctx.stroke()}
      for(let i=1;i<5;i++){const y=T+(B-T)*i/5;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(R,y);ctx.stroke()}
      ctx.restore()
      // Poste trasero y base (más tenues)
      ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1.8;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(R,T);ctx.lineTo(R,B);ctx.stroke()
      ctx.beginPath();ctx.moveTo(L,B);ctx.lineTo(R,B);ctx.stroke()
      // Larguero superior
      ctx.strokeStyle='rgba(255,255,255,0.8)';ctx.lineWidth=2.2
      ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(R,T);ctx.stroke()
      // Poste frontal (más grueso y brillante)
      ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(L,B);ctx.lineTo(L,T);ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,0.42)';ctx.lineWidth=0.9
      ctx.beginPath();ctx.moveTo(L+1.4,B-0.5);ctx.lineTo(L+1.4,T+1);ctx.stroke()
      break
    }
    case 'goal_mini': {
      const hw=12,hh=7
      ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1.5
      ctx.beginPath();ctx.moveTo(-hw-2,hh+4);ctx.lineTo(hw+2,hh+4);ctx.stroke()
      // Red de diamante
      ctx.save();ctx.beginPath();ctx.rect(-hw,-hh,hw*2,hh*2);ctx.clip()
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=0.5
      for(let x=-30;x<35;x+=4){ctx.beginPath();ctx.moveTo(-hw+x,-hh);ctx.lineTo(-hw+x+hh*2,hh);ctx.stroke();ctx.beginPath();ctx.moveTo(-hw+x,-hh);ctx.lineTo(-hw+x-hh*2,hh);ctx.stroke()}
      ctx.restore()
      // Cajas de profundidad trasera (3D mini)
      ctx.strokeStyle='rgba(255,255,255,0.45)';ctx.lineWidth=1.4;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(-hw,hh);ctx.lineTo(-hw+4,hh-4);ctx.stroke()
      ctx.beginPath();ctx.moveTo(hw,hh);ctx.lineTo(hw+4,hh-4);ctx.stroke()
      ctx.beginPath();ctx.moveTo(-hw+4,hh-4);ctx.lineTo(hw+4,hh-4);ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1.2
      ctx.beginPath();ctx.moveTo(-hw,-hh);ctx.lineTo(-hw+4,-hh-4);ctx.stroke()
      ctx.beginPath();ctx.moveTo(hw,-hh);ctx.lineTo(hw+4,-hh-4);ctx.stroke()
      ctx.beginPath();ctx.moveTo(-hw+4,-hh-4);ctx.lineTo(hw+4,-hh-4);ctx.stroke()
      // Patas de suporte
      ctx.strokeStyle='rgba(255,255,255,0.75)';ctx.lineWidth=2
      ctx.beginPath();ctx.moveTo(-hw,hh);ctx.lineTo(-hw-3,hh+5);ctx.stroke()
      ctx.beginPath();ctx.moveTo(hw,hh);ctx.lineTo(hw+3,hh+5);ctx.stroke()
      // Marco frontal
      ctx.strokeStyle='#ffffff';ctx.lineWidth=2.8;ctx.lineCap='round';ctx.lineJoin='round'
      ctx.beginPath();ctx.moveTo(-hw,hh);ctx.lineTo(-hw,-hh);ctx.lineTo(hw,-hh);ctx.lineTo(hw,hh);ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,0.42)';ctx.lineWidth=0.9
      ctx.beginPath();ctx.moveTo(-hw+1.4,hh);ctx.lineTo(-hw+1.4,-hh+1.4);ctx.lineTo(hw-1.4,-hh+1.4);ctx.lineTo(hw-1.4,hh);ctx.stroke()
      break
    }
    case 'goal_arc': {
      const hw=13,yt=4,yb=8,yc=-10
      ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1.5
      ctx.beginPath();ctx.moveTo(-hw-2,yb+2);ctx.lineTo(hw+2,yb+2);ctx.stroke()
      // Red dentro del arco
      ctx.save();ctx.beginPath()
      ctx.moveTo(-hw,yb);ctx.lineTo(-hw,yt)
      ctx.bezierCurveTo(-hw,yc,hw,yc,hw,yt)
      ctx.lineTo(hw,yb);ctx.closePath();ctx.clip()
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=0.5
      for(let x=-35;x<40;x+=5){ctx.beginPath();ctx.moveTo(-hw+x,-25);ctx.lineTo(-hw+x+35,25);ctx.stroke();ctx.beginPath();ctx.moveTo(-hw+x,-25);ctx.lineTo(-hw+x-35,25);ctx.stroke()}
      ctx.restore()
      // Profundidad trasera (muestra que es portátil)
      ctx.strokeStyle='rgba(255,255,255,0.45)';ctx.lineWidth=1.5;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(-hw,yb);ctx.lineTo(-hw+4,yb+4);ctx.stroke()
      ctx.beginPath();ctx.moveTo(hw,yb);ctx.lineTo(hw+4,yb+4);ctx.stroke()
      ctx.beginPath();ctx.moveTo(-hw+4,yb+4);ctx.lineTo(hw+4,yb+4);ctx.stroke()
      // Marco del arco
      ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round'
      ctx.beginPath()
      ctx.moveTo(-hw,yb);ctx.lineTo(-hw,yt)
      ctx.bezierCurveTo(-hw,yc,hw,yc,hw,yt)
      ctx.lineTo(hw,yb)
      ctx.stroke()
      // Brillo del arco
      ctx.strokeStyle='rgba(255,255,255,0.42)';ctx.lineWidth=0.9
      ctx.beginPath()
      ctx.moveTo(-hw+1.5,yb);ctx.lineTo(-hw+1.5,yt+1.5)
      ctx.bezierCurveTo(-hw+1.5,yc+2,hw-1.5,yc+2,hw-1.5,yt+1.5)
      ctx.lineTo(hw-1.5,yb)
      ctx.stroke()
      break
    }
    case 'cone': {
      const c=clr||'#f97316'
      ctx.fillStyle=c; ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(-8,8); ctx.lineTo(8,8); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.moveTo(-4.5,1); ctx.lineTo(4.5,1); ctx.stroke()
      break
    }
    case 'mushroom': {
      const c=clr||'#f97316'
      ctx.fillStyle=c; ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1.2
      ctx.beginPath(); ctx.ellipse(0,0,12,5.5,0,0,Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.ellipse(-2,-1,5,2,-0.3,0,Math.PI*2); ctx.fill()
      break
    }
    case 'ladder': {
      const lw=14,sh=9,steps=4,totalH=steps*sh
      ctx.strokeStyle='#fbbf24'; ctx.lineWidth=2
      ctx.beginPath(); ctx.moveTo(-lw/2,-totalH/2); ctx.lineTo(-lw/2,totalH/2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(lw/2,-totalH/2); ctx.lineTo(lw/2,totalH/2); ctx.stroke()
      ctx.lineWidth=1.5
      for(let i=0;i<=steps;i++){const ry=-totalH/2+i*sh;ctx.beginPath();ctx.moveTo(-lw/2,ry);ctx.lineTo(lw/2,ry);ctx.stroke()}
      break
    }
    case 'hurdle': {
      const hw=22,ph=16
      ctx.strokeStyle='#ef4444'; ctx.lineWidth=2
      ctx.beginPath(); ctx.moveTo(-hw/2,ph/2); ctx.lineTo(-hw/2,-ph/2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(hw/2,ph/2); ctx.lineTo(hw/2,-ph/2); ctx.stroke()
      ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(-hw/2,-2); ctx.lineTo(hw/2,-2); ctx.stroke()
      break
    }
    case 'mannequin': {
      ctx.strokeStyle='#c2410c'; ctx.lineWidth=2.2
      ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(0,7); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-7,0); ctx.lineTo(7,0); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0,7); ctx.lineTo(-5,14); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0,7); ctx.lineTo(5,14); ctx.stroke()
      ctx.fillStyle='#f97316'; ctx.beginPath(); ctx.arc(0,-9,4.5,0,Math.PI*2); ctx.fill(); ctx.stroke()
      break
    }
    case 'barrier': {
      const bw=32,bh=11
      ctx.fillStyle='#818cf8'; ctx.strokeStyle='#6366f1'; ctx.lineWidth=1.5
      ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(-bw/2,-bh/2,bw,bh,2); else ctx.rect(-bw/2,-bh/2,bw,bh)
      ctx.fill(); ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1
      for(let i=1;i<4;i++){const dx=-bw/2+(bw/4)*i;ctx.beginPath();ctx.moveTo(dx,-bh/2);ctx.lineTo(dx,bh/2);ctx.stroke()}
      break
    }
    case 'ball_bw':
    case 'ball_blue':
    case 'ball_red': {
      const br=12
      const patchClr=a.type==='ball_bw'?'#1a1a1a':a.type==='ball_blue'?'#1d4ed8':'#dc2626'
      // Base circle
      ctx.fillStyle='#f0f0f0'; ctx.strokeStyle='#555'; ctx.lineWidth=1
      ctx.beginPath(); ctx.arc(0,0,br,0,Math.PI*2); ctx.fill(); ctx.stroke()
      // Patches clipped to circle
      ctx.save()
      ctx.beginPath(); ctx.arc(0,0,br,0,Math.PI*2); ctx.clip()
      ctx.fillStyle=patchClr; ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=0.5
      // Center pentagon
      ctx.beginPath()
      for(let i=0;i<5;i++){const ang=(i*Math.PI*2)/5-Math.PI/2;const px=br*0.3*Math.cos(ang);const py=br*0.3*Math.sin(ang);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py)}
      ctx.closePath(); ctx.fill(); ctx.stroke()
      // 5 outer pentagons
      for(let k=0;k<5;k++){
        const kang=(k*Math.PI*2)/5-Math.PI/2
        const cx=br*0.7*Math.cos(kang); const cy=br*0.7*Math.sin(kang)
        ctx.beginPath()
        for(let j=0;j<5;j++){const jang=(j*Math.PI*2)/5+kang+Math.PI/5;ctx.lineTo(cx+br*0.27*Math.cos(jang),cy+br*0.27*Math.sin(jang))}
        ctx.closePath(); ctx.fill(); ctx.stroke()
      }
      ctx.restore()
      // Highlight
      ctx.fillStyle='rgba(255,255,255,0.55)'
      ctx.beginPath(); ctx.ellipse(-br*0.28,-br*0.32,br*0.2,br*0.13,-Math.PI/4,0,Math.PI*2); ctx.fill()
      break
    }
  }
  ctx.restore()
}

const PALETTE = [
  '#ffffff','#facc15','#f87171','#4ade80',
  '#60a5fa','#e879f9','#fb923c','#000000',
  '#a855f7','#06b6d4','#f97316','#84cc16',
  '#ec4899','#14b8a6','#f43f5e','#6366f1',
]

function drawAccessoryHandles(ctx: CanvasRenderingContext2D, a: PlacedAccessory) {
  const hw = ACC_LOCAL_HALF * a.scale
  const hh = ACC_LOCAL_HALF * a.scale
  const rad = (a.rotation ?? 0) * Math.PI / 180

  ctx.save()
  ctx.translate(a.x, a.y)
  ctx.rotate(rad)

  // Bounding box
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.strokeRect(-hw, -hh, hw * 2, hh * 2)
  ctx.setLineDash([])

  // Line from top-center to rotation handle
  ctx.strokeStyle = 'rgba(59,130,246,0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, -hh)
  ctx.lineTo(0, -(hh + ROT_EXTRA))
  ctx.stroke()

  // Rotation handle (red, above box)
  ctx.fillStyle = '#ef4444'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, -(hh + ROT_EXTRA), HANDLE_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // Rotation icon inside handle
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, -(hh + ROT_EXTRA), 3, -Math.PI * 0.7, Math.PI * 0.7)
  ctx.stroke()

  // Corner resize handles (green)
  const corners: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#22c55e'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, HANDLE_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })

  ctx.restore()
}

function getAccHandleHit(pos: Point, a: PlacedAccessory): 'rotation' | 'corner' | 'body' | null {
  const dx = pos.x - a.x
  const dy = pos.y - a.y
  const rad = (a.rotation ?? 0) * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const lx = dx * cos + dy * sin
  const ly = -dx * sin + dy * cos
  const hw = ACC_LOCAL_HALF * a.scale
  const hh = ACC_LOCAL_HALF * a.scale
  const HIT = 12

  if (Math.hypot(lx, ly + hh + ROT_EXTRA) <= HIT) return 'rotation'

  const corners: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
  for (const [cx, cy] of corners) {
    if (Math.hypot(lx - cx, ly - cy) <= HIT) return 'corner'
  }

  if (lx >= -hw - 4 && lx <= hw + 4 && ly >= -hh - 4 && ly <= hh + 4) return 'body'
  return null
}

/* ═══════════════════════════════════════
   CANVAS DRAW HELPERS
═══════════════════════════════════════ */

function getCurveCP(a: Point, b: Point): Point {
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  return { x: (a.x + b.x) / 2 - dy * 0.28, y: (a.y + b.y) / 2 + dx * 0.28 }
}

function drawArrowhead(ctx: CanvasRenderingContext2D, from: Point, to: Point, len = 14) {
  const a = Math.atan2(to.y - from.y, to.x - from.x)
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - len * Math.cos(a - Math.PI / 6), to.y - len * Math.sin(a - Math.PI / 6))
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - len * Math.cos(a + Math.PI / 6), to.y - len * Math.sin(a + Math.PI / 6))
  ctx.stroke()
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.width
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  ctx.setLineDash(s.dashed ? [s.width * 3 + 4, s.width * 2 + 3] : [])
  switch (s.type) {
    case 'freehand':
      if (!s.points || s.points.length < 2) return
      ctx.beginPath(); ctx.moveTo(s.points[0].x, s.points[0].y)
      s.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke(); break
    case 'line':
      if (!s.start || !s.end) return
      ctx.beginPath(); ctx.moveTo(s.start.x, s.start.y); ctx.lineTo(s.end.x, s.end.y); ctx.stroke(); break
    case 'arrow':
      if (!s.start || !s.end) return
      ctx.beginPath(); ctx.moveTo(s.start.x, s.start.y); ctx.lineTo(s.end.x, s.end.y); ctx.stroke()
      drawArrowhead(ctx, s.start, s.end); break
    case 'curve':
      if (!s.start || !s.end) return
      { const cp = getCurveCP(s.start, s.end)
        ctx.beginPath(); ctx.moveTo(s.start.x, s.start.y)
        ctx.quadraticCurveTo(cp.x, cp.y, s.end.x, s.end.y); ctx.stroke(); break }
    case 'curvearrow':
      if (!s.start || !s.end) return
      { const cp = getCurveCP(s.start, s.end)
        ctx.beginPath(); ctx.moveTo(s.start.x, s.start.y)
        ctx.quadraticCurveTo(cp.x, cp.y, s.end.x, s.end.y); ctx.stroke()
        ctx.setLineDash([])
        drawArrowhead(ctx, cp, s.end); break }
    case 'circle':
      if (!s.start || !s.end) return
      { const rx = Math.abs(s.end.x - s.start.x) / 2, ry = Math.abs(s.end.y - s.start.y) / 2
        ctx.beginPath(); ctx.ellipse(Math.min(s.start.x,s.end.x)+rx, Math.min(s.start.y,s.end.y)+ry, Math.max(rx,1), Math.max(ry,1), 0, 0, Math.PI*2); ctx.stroke(); break }
    case 'rect':
      if (!s.start || !s.end) return
      ctx.beginPath(); ctx.strokeRect(s.start.x,s.start.y,s.end.x-s.start.x,s.end.y-s.start.y); break
    case 'text':
      if (!s.start || !s.text) return
      ctx.setLineDash([])
      ctx.font = `bold ${s.width*5+10}px sans-serif`; ctx.fillText(s.text, s.start.x, s.start.y); break
  }
  ctx.setLineDash([])
}

function drawTextHandle(ctx: CanvasRenderingContext2D, s: Shape) {
  if (s.type !== 'text' || !s.start || !s.text) return
  const fs = s.width*5+10; const estW = s.text.length*fs*0.58+12
  ctx.strokeStyle='rgba(255,255,100,0.55)'; ctx.lineWidth=1; ctx.setLineDash([4,3])
  ctx.strokeRect(s.start.x-4, s.start.y-fs-2, estW, fs+8); ctx.setLineDash([])
}

function drawPlacedPlayer(ctx: CanvasRenderingContext2D, p: PlacedPlayer, dragging: boolean) {
  const t = TEAMS[p.team]
  ctx.shadowColor='rgba(0,0,0,0.45)'; ctx.shadowBlur=dragging?12:6; ctx.shadowOffsetY=dragging?4:2
  ctx.beginPath(); ctx.arc(p.x,p.y,PLAYER_R,0,Math.PI*2); ctx.fillStyle=t.bg; ctx.fill()
  ctx.strokeStyle=dragging?'#fff':t.border; ctx.lineWidth=dragging?2.5:2; ctx.stroke()
  ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0
  ctx.fillStyle=t.text; ctx.font=`bold ${p.number>=10?10:12}px sans-serif`
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(p.number.toString(),p.x,p.y)
}

/* ═══════════════════════════════════════
   PITCH DRAWING
═══════════════════════════════════════ */

function drawFullPitch(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const lc='rgba(255,255,255,0.88)'; ctx.strokeStyle=lc; ctx.fillStyle=lc; ctx.lineWidth=1.8
  const px=22,py=20,fw=w-2*px,fh=h-2*py
  ctx.strokeRect(px,py,fw,fh)
  ctx.beginPath(); ctx.moveTo(px,h/2); ctx.lineTo(w-px,h/2); ctx.stroke()
  ctx.beginPath(); ctx.arc(w/2,h/2,fh*0.115,0,Math.PI*2); ctx.stroke()
  ctx.beginPath(); ctx.arc(w/2,h/2,2.5,0,Math.PI*2); ctx.fill()
  const paw=fw*0.42,pah=fh*0.185
  ctx.strokeRect(px+(fw-paw)/2,py,paw,pah); ctx.strokeRect(px+(fw-paw)/2,h-py-pah,paw,pah)
  const gaw=fw*0.21,gah=fh*0.072
  ctx.strokeRect(px+(fw-gaw)/2,py,gaw,gah); ctx.strokeRect(px+(fw-gaw)/2,h-py-gah,gaw,gah)
  const gw=fw*0.115,gd=9
  ctx.strokeRect(px+(fw-gw)/2,py-gd,gw,gd); ctx.strokeRect(px+(fw-gw)/2,h-py,gw,gd)
  ;[py+fh*0.137,h-py-fh*0.137].forEach(cy=>{ctx.beginPath();ctx.arc(w/2,cy,2.5,0,Math.PI*2);ctx.fill()})
  ctx.beginPath(); ctx.arc(w/2,py+fh*0.137,fh*0.09,Math.PI*0.18,Math.PI*0.82); ctx.stroke()
  ctx.beginPath(); ctx.arc(w/2,h-py-fh*0.137,fh*0.09,-Math.PI*0.82,-Math.PI*0.18); ctx.stroke()
  const cr=7
  ;[[px,py,0,Math.PI/2],[w-px,py,Math.PI/2,Math.PI],[px,h-py,-Math.PI/2,0],[w-px,h-py,Math.PI,-Math.PI/2]].forEach(([cx,cy,a0,a1])=>{
    ctx.beginPath(); ctx.arc(cx as number,cy as number,cr,a0 as number,a1 as number); ctx.stroke()
  })
}

function drawHalfPitch(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const lc='rgba(255,255,255,0.88)'; ctx.strokeStyle=lc; ctx.fillStyle=lc; ctx.lineWidth=1.8
  const px=22,py=15,fw=w-2*px,fh=h-2*py
  ctx.strokeRect(px,py,fw,fh)
  ctx.beginPath(); ctx.arc(w/2,py,fh*0.14,0,Math.PI); ctx.stroke()
  ctx.beginPath(); ctx.arc(w/2,py,2.5,0,Math.PI*2); ctx.fill()
  const paw=fw*0.52,pah=fh*0.42,paLeft=px+(fw-paw)/2,paTop=h-py-pah
  ctx.strokeRect(paLeft,paTop,paw,pah)
  const gaw=fw*0.26,gah=fh*0.165
  ctx.strokeRect(px+(fw-gaw)/2,h-py-gah,gaw,gah)
  const gw=fw*0.13,gd=11
  ctx.strokeRect(px+(fw-gw)/2,h-py,gw,gd)
  const penY=h-py-pah*0.73
  ctx.beginPath(); ctx.arc(w/2,penY,2.5,0,Math.PI*2); ctx.fill()
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,w,paTop); ctx.clip()
  ctx.beginPath(); ctx.arc(w/2,penY,fh*0.22,0,Math.PI*2); ctx.stroke(); ctx.restore()
  const cr=7
  ;[[px,h-py,-Math.PI/2,0],[w-px,h-py,Math.PI,-Math.PI/2]].forEach(([cx,cy,a0,a1])=>{
    ctx.beginPath(); ctx.arc(cx as number,cy as number,cr,a0 as number,a1 as number); ctx.stroke()
  })
}

function drawPitch(ctx: CanvasRenderingContext2D, w: number, h: number, type: PitchType) {
  ctx.fillStyle='#2d6a1f'; ctx.fillRect(0,0,w,h)
  for(let i=0;i<8;i++) if(i%2===0){ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fillRect(i*(w/8),0,w/8,h)}
  if(type==='blank') return
  if(type==='full') drawFullPitch(ctx,w,h); else drawHalfPitch(ctx,w,h)
}

/* ═══════════════════════════════════════
   COLOR PICKER
═══════════════════════════════════════ */

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o=>!o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all">
        <span className="w-4 h-4 rounded-full border-2 border-white/40" style={{backgroundColor:value}} />
        <span>Color</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open?'rotate-180':''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-gray-700 rounded-xl p-3 shadow-2xl border border-white/10 w-48">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Color de trazo</p>
          <div className="grid grid-cols-4 gap-1.5">
            {PALETTE.map(c => (
              <button key={c} type="button" onClick={() => { onChange(c); setOpen(false) }}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${value===c?'border-white scale-110 shadow-md':'border-white/20 hover:border-white/60'}`}
                style={{backgroundColor:c}} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   TACTICAL BOARD
═══════════════════════════════════════ */

const PITCH_OPTIONS: { id: PitchType; label: string }[] = [
  { id:'full', label:'Campo completo' },
  { id:'half', label:'Medio campo' },
  { id:'blank', label:'Sin líneas' },
]

const ACCESSORY_LIST: { type: AccessoryType; label: string }[] = [
  { type:'cone', label:'Conos' },
  { type:'mushroom', label:'Setas' },
  { type:'ladder', label:'Escalera' },
  { type:'hurdle', label:'Valla' },
  { type:'mannequin', label:'Maniquí' },
  { type:'barrier', label:'Barrera' },
]

const GOAL_LIST: { type: AccessoryType; label: string }[] = [
  { type:'goal_front', label:'Frontal' },
  { type:'goal_3d_r', label:'3D Derecha' },
  { type:'goal_3d_l', label:'3D Izquierda' },
  { type:'goal_side', label:'Lateral' },
  { type:'goal_mini', label:'Mini' },
  { type:'goal_arc', label:'Portátil' },
]

const BALL_LIST: { type: AccessoryType; label: string }[] = [
  { type:'ball_bw', label:'Balón B/N' },
  { type:'ball_blue', label:'Balón Azul' },
  { type:'ball_red', label:'Balón Rojo' },
]

interface TacticalBoardProps {
  onCapture?: (png: string) => void
  onRegisterCapture?: (fn: () => string | null) => void
}

function TacticalBoard({ onCapture, onRegisterCapture }: TacticalBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<DrawTool>('freehand')
  const [color, setColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [dashed, setDashed] = useState(false)
  const [shapes, setShapes] = useState<Shape[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState<Shape | null>(null)
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<Point | null>(null)
  const [draggedTextIdx, setDraggedTextIdx] = useState<number | null>(null)
  const [pitchType, setPitchType] = useState<PitchType>('full')
  const [ballMenuOpen, setBallMenuOpen] = useState(false)
  const [goalMenuOpen, setGoalMenuOpen] = useState(false)
  const [placedPlayers, setPlacedPlayers] = useState<PlacedPlayer[]>([])
  const [selPlayer, setSelPlayer] = useState<SelPlayer | null>(null)
  const [placedAccessories, setPlacedAccessories] = useState<PlacedAccessory[]>([])
  const [selAcc, setSelAcc] = useState<SelAcc | null>(null)
  const [selectedAccUid, setSelectedAccUid] = useState<string | null>(null)
  const playerDragRef = useRef<{ uid: string; ox: number; oy: number } | null>(null)
  const accDragRef = useRef<{ uid: string; startX: number; startY: number; accX: number; accY: number; mode?: 'move'|'resize'|'rotate'; startDist?: number; startAngle?: number; startRot?: number; startScale?: number } | null>(null)
  const textDragRef = useRef<{ idx: number; ox: number; oy: number } | null>(null)
  const [openTeams, setOpenTeams] = useState<Set<TeamId>>(new Set())
  const toggleTeam = (tid: TeamId) =>
    setOpenTeams(prev => { const n=new Set(prev); n.has(tid)?n.delete(tid):n.add(tid); return n })

  const findTextAt = useCallback((pos: Point): number => {
    for(let i=shapes.length-1;i>=0;i--) {
      const s=shapes[i]; if(s.type!=='text'||!s.start||!s.text) continue
      const fs=s.width*5+10; const estW=s.text.length*fs*0.58+12
      if(pos.x>=s.start.x-6&&pos.x<=s.start.x+estW&&pos.y>=s.start.y-fs-4&&pos.y<=s.start.y+6) return i
    }
    return -1
  }, [shapes])

  const redraw = useCallback(() => {
    const canvas=canvasRef.current; if(!canvas) return
    const ctx=canvas.getContext('2d'); if(!ctx) return
    drawPitch(ctx,canvas.width,canvas.height,pitchType)
    shapes.forEach((s,i)=>{drawShape(ctx,s); if(i===draggedTextIdx) drawTextHandle(ctx,s)})
    if(currentShape) drawShape(ctx,currentShape)
    placedAccessories.forEach(a=>{
      drawAccessory(ctx,a,accDragRef.current?.uid===a.uid)
      if(selectedAccUid===a.uid) drawAccessoryHandles(ctx,a)
    })
    placedPlayers.forEach(p=>drawPlacedPlayer(ctx,p,playerDragRef.current?.uid===p.uid))
  }, [shapes,currentShape,placedPlayers,placedAccessories,draggedTextIdx,pitchType,selectedAccUid])

  useEffect(() => { redraw() }, [redraw])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas=canvasRef.current!; const rect=canvas.getBoundingClientRect()
    return { x:(e.clientX-rect.left)*(canvas.width/rect.width), y:(e.clientY-rect.top)*(canvas.height/rect.height) }
  }

  const nearPlayer = (pos: Point) => placedPlayers.find(p=>Math.hypot(p.x-pos.x,p.y-pos.y)<=PLAYER_R+3)
  const nearAccessory = (pos: Point) => [...placedAccessories].reverse().find(a => getAccHandleHit(pos, a) !== null)

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos=getPos(e)
    if(e.button===2){
      const hitP=nearPlayer(pos); if(hitP){ setPlacedPlayers(prev=>prev.filter(p=>p.uid!==hitP.uid)); return }
      const hitA=nearAccessory(pos); if(hitA){ setPlacedAccessories(prev=>prev.filter(a=>a.uid!==hitA.uid)); setSelectedAccUid(null); return }
      return
    }
    const hitP=nearPlayer(pos); if(hitP){ playerDragRef.current={uid:hitP.uid,ox:pos.x-hitP.x,oy:pos.y-hitP.y}; return }

    // Check accessory handles — prioritize the selected one
    const orderedAcc = selectedAccUid
      ? [...placedAccessories.filter(a=>a.uid===selectedAccUid), ...[...placedAccessories].reverse().filter(a=>a.uid!==selectedAccUid)]
      : [...placedAccessories].reverse()
    let hitAcc: PlacedAccessory | null = null
    let hitHandle: 'rotation'|'corner'|'body'|null = null
    for(const acc of orderedAcc){
      const h = getAccHandleHit(pos, acc)
      if(h !== null){ hitAcc = acc; hitHandle = h; break }
    }
    if(hitAcc){
      setSelectedAccUid(hitAcc.uid)
      accDragRef.current = {
        uid: hitAcc.uid, startX: pos.x, startY: pos.y, accX: hitAcc.x, accY: hitAcc.y,
        mode: hitHandle === 'rotation' ? 'rotate' : hitHandle === 'corner' ? 'resize' : 'move',
        startDist: Math.max(1, Math.hypot(pos.x - hitAcc.x, pos.y - hitAcc.y)),
        startAngle: Math.atan2(pos.y - hitAcc.y, pos.x - hitAcc.x),
        startRot: hitAcc.rotation ?? 0,
        startScale: hitAcc.scale,
      }
      return
    }
    setSelectedAccUid(null)
    if(!selPlayer&&!selAcc){ const idx=findTextAt(pos); if(idx!==-1){ textDragRef.current={idx,ox:pos.x-shapes[idx].start!.x,oy:pos.y-shapes[idx].start!.y}; setDraggedTextIdx(idx); return } }
    if(selPlayer){ setPlacedPlayers(prev=>[...prev,{uid:uuidv4(),team:selPlayer.team,number:selPlayer.number,x:pos.x,y:pos.y}]); return }
    if(selAcc){ setPlacedAccessories(prev=>[...prev,{uid:uuidv4(),type:selAcc.type,x:pos.x,y:pos.y,rotation:0,color:selAcc.color,scale:1}]); return }
    if(tool==='text'){ setTextPos(pos); return }
    setIsDrawing(true)
    setCurrentShape({type:tool,color,width:strokeWidth,dashed,start:pos,end:pos,points:tool==='freehand'?[pos]:undefined})
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos=getPos(e)
    if(textDragRef.current){ const{idx,ox,oy}=textDragRef.current; setShapes(prev=>prev.map((s,i)=>i!==idx?s:{...s,start:{x:pos.x-ox,y:pos.y-oy}})); return }
    if(playerDragRef.current){ const{uid,ox,oy}=playerDragRef.current; setPlacedPlayers(prev=>prev.map(p=>p.uid===uid?{...p,x:pos.x-ox,y:pos.y-oy}:p)); return }
    if(accDragRef.current){
      const drag = accDragRef.current
      const{uid,startX,startY,accX,accY,mode}=drag
      if(mode === 'move'){
        setPlacedAccessories(prev=>prev.map(a=>a.uid===uid?{...a,x:accX+(pos.x-startX),y:accY+(pos.y-startY)}:a))
      } else if(mode === 'rotate'){
        const startAngle = drag.startAngle ?? 0
        const currentAngle = Math.atan2(pos.y - accY, pos.x - accX)
        const angleDelta = (currentAngle - startAngle) * 180 / Math.PI
        setPlacedAccessories(prev=>prev.map(a=>a.uid===uid?{...a,rotation:(drag.startRot ?? 0)+angleDelta}:a))
      } else if(mode === 'resize'){
        const currentDist = Math.hypot(pos.x - accX, pos.y - accY)
        const newScale = Math.max(0.2, Math.min(6, (drag.startScale ?? 1) * currentDist / (drag.startDist ?? 30)))
        setPlacedAccessories(prev=>prev.map(a=>a.uid===uid?{...a,scale:newScale}:a))
      }
      return
    }
    if(!isDrawing||!currentShape) return
    setCurrentShape(prev=>{ if(!prev) return prev; if(prev.type==='freehand') return{...prev,points:[...(prev.points??[]),pos]}; return{...prev,end:pos} })
  }

  const onMouseUp = () => {
    if(textDragRef.current){ textDragRef.current=null; setDraggedTextIdx(null); return }
    if(playerDragRef.current){ playerDragRef.current=null; return }
    if(accDragRef.current){ accDragRef.current=null; return }
    if(!isDrawing||!currentShape) return
    setIsDrawing(false); setShapes(prev=>[...prev,currentShape]); setCurrentShape(null)
  }

  const handleAddText = () => {
    if(!textPos||!textInput.trim()) return
    setShapes(prev=>[...prev,{type:'text',color,width:strokeWidth,start:textPos,text:textInput}])
    setTextInput(''); setTextPos(null)
  }

  useEffect(() => {
    onRegisterCapture?.(() => canvasRef.current?.toDataURL('image/png') ?? null)
  }, [onRegisterCapture])

  const captureBoard = () => {
    const canvas=canvasRef.current; if(!canvas) return
    onCapture?.(canvas.toDataURL('image/png'))
  }

  const exportPNG = () => {
    const canvas=canvasRef.current; if(!canvas) return
    const a=document.createElement('a'); a.download='pizarra-tactica.png'; a.href=canvas.toDataURL('image/png'); a.click()
  }

  const CurveIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12 Q7 1 13 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    </svg>
  )
  const CurveArrowIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12 Q7 1 13 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M10.5 4.5 L13 7 L10.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )

  const DRAW_TOOLS: { id: DrawTool; icon: React.ReactNode; label: string }[] = [
    {id:'freehand',icon:<Pencil className="w-3.5 h-3.5"/>,label:'Libre'},
    {id:'line',icon:<Minus className="w-3.5 h-3.5"/>,label:'Línea'},
    {id:'arrow',icon:<ArrowRight className="w-3.5 h-3.5"/>,label:'Flecha'},
    {id:'curve',icon:<CurveIcon/>,label:'Curva'},
    {id:'curvearrow',icon:<CurveArrowIcon/>,label:'Flecha curva'},
    {id:'circle',icon:<Circle className="w-3.5 h-3.5"/>,label:'Círculo'},
    {id:'rect',icon:<Square className="w-3.5 h-3.5"/>,label:'Rect.'},
    {id:'text',icon:<Type className="w-3.5 h-3.5"/>,label:'Texto'},
  ]

  const isOnPitch = (team: TeamId, n: number) => placedPlayers.some(p=>p.team===team&&p.number===n)
  const countOnPitch = (team: TeamId) => placedPlayers.filter(p=>p.team===team).length
  const cursorClass = (selPlayer||selAcc)?'cursor-cell':draggedTextIdx!==null?'cursor-grabbing':'cursor-crosshair'

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="text-white font-semibold text-sm tracking-wide">Pizarra Táctica</h3>

      {/* Field selector */}
      <div className="bg-gray-900/50 rounded-xl p-3 space-y-2">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Tipo de campo</p>
        <div className="flex gap-1.5">
          {PITCH_OPTIONS.map(opt=>(
            <button key={opt.id} type="button" onClick={()=>setPitchType(opt.id)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${pitchType===opt.id?'bg-rfpaf-blue text-white shadow-sm':'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Player panel */}
      <div className="bg-gray-900/60 rounded-xl overflow-hidden border border-white/5">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold px-3 pt-2.5 pb-1.5">Jugadoras por equipo</p>
        {([1,2,3] as TeamId[]).map(tid=>{
          const t=TEAMS[tid]; const isOpen=openTeams.has(tid); const cnt=countOnPitch(tid)
          return (
            <div key={tid} className="border-t border-white/5">
              <button type="button" onClick={()=>toggleTeam(tid)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md flex-shrink-0 min-w-[72px] text-center" style={{backgroundColor:t.bg,color:t.text}}>{t.label}</span>
                {cnt>0&&<span className="text-[10px] text-white/40">{cnt} en campo</span>}
                <ChevronDown className={`w-3.5 h-3.5 text-white/35 ml-auto flex-shrink-0 transition-transform duration-200 ${isOpen?'rotate-180':''}`}/>
              </button>
              {isOpen&&(
                <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-0.5">
                  {Array.from({length:11},(_,i)=>i+1).map(n=>{
                    const isSel=selPlayer?.team===tid&&selPlayer?.number===n; const onField=isOnPitch(tid,n)
                    return (
                      <button key={n} type="button"
                        onClick={()=>{if(isSel){setSelPlayer(null);return};setSelPlayer({team:tid,number:n})}}
                        className={`w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center transition-all select-none ${isSel?'ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-110 shadow-lg':onField?'opacity-30':'hover:scale-105 hover:ring-1 hover:ring-white/60'}`}
                        style={{backgroundColor:t.bg,color:t.text,border:`2px solid ${t.border}`}}>{n}</button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        <div className="px-3 py-2 border-t border-white/5">
          <button type="button" onClick={()=>setPlacedPlayers([])}
            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-red-400 transition-colors">
            <UserX className="w-3 h-3"/> Quitar todas del campo
          </button>
        </div>
      </div>

      {/* Accessories panel */}
      <div className="bg-gray-900/60 rounded-xl overflow-hidden border border-white/5">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold px-3 pt-2.5 pb-2">Biblioteca de accesorios</p>
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {ACCESSORY_LIST.map(acc => {
            const isSel = selAcc?.type === acc.type
            return (
              <button key={acc.type} type="button"
                onClick={() => { setSelAcc(isSel ? null : { type: acc.type }); setSelPlayer(null); setBallMenuOpen(false); setGoalMenuOpen(false) }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${isSel ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-sm' : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'}`}>
                {acc.label}
              </button>
            )
          })}
          {/* Porterías dropdown */}
          <button type="button"
            onClick={() => { setGoalMenuOpen(v => !v); setBallMenuOpen(false); setSelPlayer(null) }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              GOAL_LIST.some(g => selAcc?.type === g.type)
                ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-sm'
                : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'
            }`}>
            Porterías <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${goalMenuOpen ? 'rotate-180' : ''}`}/>
          </button>
          {goalMenuOpen && GOAL_LIST.map(g => {
            const isSel = selAcc?.type === g.type
            return (
              <button key={g.type} type="button"
                onClick={() => { setSelAcc(isSel ? null : { type: g.type }); setGoalMenuOpen(false) }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${isSel ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-sm' : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'}`}>
                {g.label}
              </button>
            )
          })}
          {/* Balones dropdown */}
          <button type="button"
            onClick={() => { setBallMenuOpen(v => !v); setGoalMenuOpen(false); setSelPlayer(null) }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              BALL_LIST.some(b => selAcc?.type === b.type)
                ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-sm'
                : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'
            }`}>
            Balones <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${ballMenuOpen ? 'rotate-180' : ''}`}/>
          </button>
          {ballMenuOpen && BALL_LIST.map(b => {
            const isSel = selAcc?.type === b.type
            return (
              <button key={b.type} type="button"
                onClick={() => { setSelAcc(isSel ? null : { type: b.type }); setBallMenuOpen(false) }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${isSel ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-sm' : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'}`}>
                {b.label}
              </button>
            )
          })}
        </div>
        {placedAccessories.length > 0 && (
          <div className="px-3 pb-2 border-t border-white/5 pt-2">
            <button type="button" onClick={() => setPlacedAccessories([])}
              className="flex items-center gap-1 text-[10px] text-white/30 hover:text-red-400 transition-colors">
              <Eraser className="w-3 h-3"/> Quitar todos los accesorios
            </button>
          </div>
        )}
        {selectedAccUid && (
          <div className="px-3 py-2 border-t border-white/5 pt-2">
            <p className="text-white/35 text-[10px]">
              Arrastra <span className="text-green-400 font-semibold">esquinas</span> para redimensionar · <span className="text-red-400 font-semibold">handle rojo</span> para girar · centro para mover
            </p>
          </div>
        )}
      </div>

      {/* Drawing toolbar */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(selPlayer || selAcc) && (
          <button type="button" onClick={() => { setSelPlayer(null); setSelAcc(null) }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/30 text-yellow-300 hover:bg-yellow-500/50 transition-all">
            <UserX className="w-3.5 h-3.5"/> Cancelar
          </button>
        )}
        {DRAW_TOOLS.map(t=>(
          <button key={t.id} type="button" onClick={()=>{setTool(t.id);setSelPlayer(null);setSelAcc(null)}}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${tool===t.id&&!selPlayer?'bg-rfpaf-blue text-white shadow-sm':'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
        <div className="w-px h-5 bg-white/20 mx-0.5"/>
        <ColorPicker value={color} onChange={setColor}/>
        <select value={strokeWidth} onChange={e=>setStrokeWidth(Number(e.target.value))}
          className="bg-white/10 text-white text-xs rounded-lg px-2 py-1.5 border border-white/20 focus:outline-none">
          <option value={2}>Fino</option><option value={3}>Normal</option><option value={5}>Grueso</option><option value={8}>Extra</option>
        </select>
        <button type="button" onClick={()=>setDashed(d=>!d)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${dashed?'bg-rfpaf-blue text-white shadow-sm':'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
          title="Línea discontinua">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <line x1="1" y1="7" x2="4" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="6" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="11" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Discontinua</span>
        </button>
        <div className="w-px h-5 bg-white/20 mx-0.5"/>
        <button type="button" onClick={()=>setShapes(prev=>prev.slice(0,-1))}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all">
          <Undo2 className="w-3.5 h-3.5"/> Deshacer
        </button>
        <button type="button" onClick={()=>{setShapes([]);setPlacedPlayers([]);setPlacedAccessories([])}}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-red-500/30 text-red-300 hover:bg-red-500/50 hover:text-white transition-all">
          <Eraser className="w-3.5 h-3.5"/> Limpiar
        </button>
        <div className="w-px h-5 bg-white/20 mx-0.5"/>
        <span className="text-[10px] text-white/40 px-2 py-1.5 flex items-center gap-1">
          💡 Click accesorio → Arrastra para girar/redimensionar
        </span>
        <div className="w-px h-5 bg-white/20 mx-0.5"/>
        <button type="button" onClick={exportPNG}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all">
          <Download className="w-3.5 h-3.5"/> PNG
        </button>
      </div>

      {/* Text input */}
      {tool==='text'&&!selPlayer&&(
        <div className="flex gap-2">
          <input type="text" value={textInput} onChange={e=>setTextInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleAddText()}
            placeholder={textPos?'Escribe y pulsa Enter…':'Haz clic en el campo para posicionar…'}
            className="flex-1 bg-white/10 text-white text-xs rounded-lg px-3 py-2 border border-white/20 placeholder-white/40 focus:outline-none focus:border-rfpaf-blue"/>
          {textPos&&<button type="button" onClick={handleAddText} className="px-3 py-1.5 bg-rfpaf-blue text-white text-xs rounded-lg font-medium">Añadir</button>}
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} width={680} height={460}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onContextMenu={e=>{e.preventDefault();onMouseDown(e)}}
        className={`w-full rounded-lg border border-white/10 select-none ${cursorClass}`}
        style={{touchAction:'none'}}/>

      {/* Capture button */}
      {onCapture && (
        <button type="button" onClick={captureBoard}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600/80 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors">
          <Camera className="w-4 h-4"/> Añadir captura al documento de sesión
        </button>
      )}

      <p className="text-white/25 text-[10px] text-center">
        {selPlayer?`Colocando ${TEAMS[selPlayer.team].label} · Jugadora ${selPlayer.number} — clic en campo`:
          draggedTextIdx!==null?'Moviendo texto…':'Jugadoras y textos arrastrables · Clic derecho para quitar jugadora'}
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════
   SESION PDF EXPORT
═══════════════════════════════════════ */

async function exportSesionPDF(sesion: Sesion) {
  const { default: html2pdf } = await import('html2pdf.js')

  const el = document.createElement('div')
  el.style.cssText = 'font-family:Arial,sans-serif;padding:20px;color:#111;background:#fff;max-width:800px'

  const h2Style = 'font-size:13px;color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;margin-top:0'

  const ejerciciosHTML = sesion.ejercicios.length > 0
    ? `<div style="margin-bottom:16px">
        <h2 style="${h2Style}">Ejercicios de la Sesión</h2>
        ${sesion.ejercicios.map(ej => `
          <div style="border:1px solid #dbeafe;border-radius:8px;overflow:hidden;margin-bottom:12px;page-break-inside:avoid">
            <div style="background:#eff6ff;padding:7px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #dbeafe">
              <span style="background:#1e40af;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-block;line-height:22px;text-align:center;font-weight:800;font-size:11px;flex-shrink:0;vertical-align:middle">${ej.orden}</span>
              <span style="font-weight:700;color:#1e293b;font-size:12px">${ej.tipo||'Ejercicio'}</span>
              <span style="margin-left:auto;font-size:10px;color:#64748b">
                ${ej.duracion?`${ej.duracion} min`:''}${ej.duracion&&ej.numJugadores?' · ':''}${ej.numJugadores?`${ej.numJugadores} jugadoras`:''}
              </span>
            </div>
            <div style="display:flex;min-height:90px">
              ${ej.imagen
                ? `<img src="${ej.imagen}" style="width:42%;object-fit:cover;flex-shrink:0;border-right:1px solid #e2e8f0;display:block"/>`
                : `<div style="width:42%;flex-shrink:0;background:#f8fafc;border-right:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:10px">Sin imagen</div>`}
              <div style="flex:1;padding:10px 12px">
                ${ej.material?`<div style="font-size:9.5px;color:#64748b;margin-bottom:5px;display:flex;gap:4px;align-items:center">Material: <strong>${ej.material}</strong></div>`:''}
                ${ej.descripcion?`<p style="font-size:11px;color:#374151;line-height:1.55;margin:0">${ej.descripcion}</p>`:''}
              </div>
            </div>
          </div>`).join('')}
      </div>`
    : ''



  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:16px">
      <div style="flex:1">
        <h1 style="font-size:18px;font-weight:800;color:#1e40af;margin:0;text-transform:uppercase;letter-spacing:1px">Sesión de Entrenamiento</h1>
        <p style="font-size:11px;color:#6b7280;margin:4px 0 0">Real Federación de Fútbol del Principado de Asturias</p>
        ${sesion.numConvocatoria ? `<div style="display:inline-block;margin-top:6px;background:#1e40af;color:#fff;border-radius:6px;padding:3px 12px;font-size:12px;font-weight:700">Convocatoria Nº ${sesion.numConvocatoria}</div>` : ''}
      </div>
      <img src="https://files.asturfutbol.es/pnfg/img/web_responsive_2/ESP/logo(rffpa).png"
        alt="RFPAF" style="height:72px;width:auto;object-fit:contain;flex-shrink:0;margin-left:16px"/>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      ${[
        ['Fecha', sesion.fecha],
        ['Hora', sesion.hora],
        ['Campo', sesion.campo],
        ['Fase', sesion.fase],
        ['Entrenador/a', sesion.entrenador],
        ['Jugadoras convocadas', sesion.numJugadorasConvocadas],
      ].map(([k,v])=>`
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px">
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">${k}</div>
          <div style="font-size:12px;font-weight:600;color:#1e293b;margin-top:2px">${v||'—'}</div>
        </div>`).join('')}
    </div>

    ${sesion.objetivos ? `
      <div style="margin-bottom:14px">
        <h2 style="${h2Style}">Objetivos Generales de la Sesión</h2>
        <p style="font-size:12px;color:#374151;line-height:1.6;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin:0">${sesion.objetivos}</p>
      </div>` : ''}

    ${ejerciciosHTML}

    ${sesion.observaciones ? `
      <div style="margin-bottom:14px">
        <h2 style="${h2Style}">Observaciones</h2>
        <p style="font-size:12px;color:#374151;line-height:1.6;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin:0">${sesion.observaciones}</p>
      </div>` : ''}

    <div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:8px;text-align:center;font-size:9px;color:#9ca3af">
      Documento generado por Staff Lab Scouting · ${new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'long',year:'numeric'})}
    </div>`

  document.body.appendChild(el)
  await html2pdf().set({
    margin:8, filename:`sesion-${sesion.fecha||'entrenamiento'}.pdf`,
    image:{type:'jpeg',quality:0.97}, html2canvas:{scale:2,useCORS:true,logging:false},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
  }).from(el).save()
  document.body.removeChild(el)
}

/* ═══════════════════════════════════════
   SESION TAB
═══════════════════════════════════════ */

const FASES = ['Entrenamientos 1ª Fase','Entrenamientos 2ª Fase','Partidos Entrenamiento']
const SESION_EMPTY: Sesion = { fecha:'',hora:'',campo:'',numConvocatoria:'',fase:'',entrenador:'',numJugadorasConvocadas:'',objetivos:'',observaciones:'',capturas:[],ejercicios:[] }

const EJ_SESION_EMPTY = { tipo:'', duracion:'', descripcion:'', numJugadores:'', material:'', imagen: null as string | null }

function SesionTab() {
  const [sesion, setSesion] = useState<Sesion>(SESION_EMPTY)
  const [formOpen, setFormOpen] = useState(true)
  const [ejFormOpen, setEjFormOpen] = useState(false)
  const [ejForm, setEjForm] = useState(EJ_SESION_EMPTY)
  const tacticalCaptureRef = useRef<(() => string | null) | null>(null)

  const addCaptura = (png: string) => setSesion(s => ({ ...s, capturas: [...s.capturas, png] }))
  const removeCaptura = (idx: number) => setSesion(s => ({ ...s, capturas: s.capturas.filter((_,i)=>i!==idx) }))

  const captureForEjercicio = () => {
    const png = tacticalCaptureRef.current?.()
    if (png) setEjForm(f => ({ ...f, imagen: png }))
  }

  const addEjercicio = (e: React.SyntheticEvent) => {
    e.preventDefault()
    const orden = sesion.ejercicios.length + 1
    setSesion(s => ({ ...s, ejercicios: [...s.ejercicios, { id: uuidv4(), orden, ...ejForm }] }))
    setEjForm(EJ_SESION_EMPTY)
    setEjFormOpen(false)
  }

  const removeEjercicio = (id: string) =>
    setSesion(s => ({ ...s, ejercicios: s.ejercicios.filter(e => e.id !== id).map((e, i) => ({ ...e, orden: i + 1 })) }))

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

      {/* ── Left: session form + captures ── */}
      <div className="space-y-4">

        {/* Session info form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button type="button" onClick={() => setFormOpen(o=>!o)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <span className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
              <ClipboardList className="w-4 h-4 text-rfpaf-blue"/> Datos de la Sesión
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${formOpen?'rotate-180':''}`}/>
          </button>

          {formOpen && (
            <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">

              {/* Row 1: fecha + hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                  <input type="date" value={sesion.fecha} onChange={e=>setSesion(s=>({...s,fecha:e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora</label>
                  <input type="time" value={sesion.hora} onChange={e=>setSesion(s=>({...s,hora:e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
              </div>

              {/* Row 2: campo + convocatoria */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Campo</label>
                  <input type="text" value={sesion.campo} onChange={e=>setSesion(s=>({...s,campo:e.target.value}))}
                    placeholder="Nombre del campo…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nº Convocatoria</label>
                  <input type="number" value={sesion.numConvocatoria} onChange={e=>setSesion(s=>({...s,numConvocatoria:e.target.value}))}
                    placeholder="1"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
              </div>

              {/* Row 3: fase + entrenador */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fase</label>
                  <select value={sesion.fase} onChange={e=>setSesion(s=>({...s,fase:e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
                    <option value="">Seleccionar…</option>
                    {FASES.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Entrenador/a</label>
                  <input type="text" value={sesion.entrenador} onChange={e=>setSesion(s=>({...s,entrenador:e.target.value}))}
                    placeholder="Nombre…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
              </div>

              {/* Nº jugadoras convocadas */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nº Jugadoras Convocadas</label>
                <select value={sesion.numJugadorasConvocadas} onChange={e=>setSesion(s=>({...s,numJugadorasConvocadas:e.target.value}))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
                  <option value="">Seleccionar…</option>
                  {Array.from({length:15},(_,i)=>i+11).map(n=>(
                    <option key={n} value={n}>{n} jugadoras</option>
                  ))}
                </select>
              </div>

              {/* Objetivos */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Objetivos generales de la sesión</label>
                <textarea value={sesion.objetivos} onChange={e=>setSesion(s=>({...s,objetivos:e.target.value}))}
                  placeholder="Describe los objetivos principales de la sesión…" rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"/>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                <textarea value={sesion.observaciones} onChange={e=>setSesion(s=>({...s,observaciones:e.target.value}))}
                  placeholder="Notas adicionales, incidencias…" rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"/>
              </div>
            </div>
          )}
        </div>

        {/* ── Exercises section ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-rfpaf-blue"/>
              Ejercicios de la sesión
              {sesion.ejercicios.length > 0 && (
                <span className="bg-rfpaf-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{sesion.ejercicios.length}</span>
              )}
            </h3>
            <button type="button" onClick={() => setEjFormOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rfpaf-blue text-white text-xs font-semibold rounded-lg hover:bg-rfpaf-blue/90 transition-colors">
              <Plus className="w-3.5 h-3.5"/> Añadir ejercicio
            </button>
          </div>

          {ejFormOpen && (
            <form onSubmit={addEjercicio} className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3 bg-blue-50/40">
              <p className="text-xs font-semibold text-rfpaf-blue">Nuevo ejercicio · #{sesion.ejercicios.length + 1}</p>

              {/* Capture row */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Imagen de la pizarra táctica</label>
                <div className="flex gap-2 items-start">
                  <div className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${ejForm.imagen ? 'border-green-400 w-40 h-24' : 'border-dashed border-gray-300 w-40 h-24 flex items-center justify-center bg-white'}`}>
                    {ejForm.imagen
                      ? <img src={ejForm.imagen} alt="Captura" className="w-full h-full object-cover"/>
                      : <div className="text-center text-gray-400 p-2"><Camera className="w-6 h-6 mx-auto mb-1 opacity-40"/><p className="text-[10px]">Sin captura</p></div>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={captureForEjercicio}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
                      <Camera className="w-3.5 h-3.5"/> Capturar pizarra ahora
                    </button>
                    {ejForm.imagen && (
                      <button type="button" onClick={() => setEjForm(f => ({ ...f, imagen: null }))}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                        <X className="w-3 h-3"/> Quitar imagen
                      </button>
                    )}
                    <p className="text-[10px] text-gray-400 leading-tight">Dibuja en la pizarra de la derecha y pulsa el botón para capturarla.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select value={ejForm.tipo} onChange={e => setEjForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 bg-white">
                    <option value="">Seleccionar…</option>
                    {TIPOS_EJERCICIO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duración (min)</label>
                  <input type="number" value={ejForm.duracion} onChange={e => setEjForm(f => ({ ...f, duracion: e.target.value }))}
                    placeholder="15" min={1}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 bg-white"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nº Jugadoras</label>
                  <input type="number" value={ejForm.numJugadores} onChange={e => setEjForm(f => ({ ...f, numJugadores: e.target.value }))}
                    placeholder="11" min={1}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 bg-white"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                  <input type="text" value={ejForm.material} onChange={e => setEjForm(f => ({ ...f, material: e.target.value }))}
                    placeholder="Conos, petos…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 bg-white"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <textarea value={ejForm.descripcion} onChange={e => setEjForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Describe el ejercicio, objetivos, variantes…" rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none bg-white"/>
              </div>
              <div className="flex gap-2">
                <button type="submit"
                  className="flex-1 py-2 bg-rfpaf-blue text-white text-sm font-semibold rounded-lg hover:bg-rfpaf-blue/90 transition-colors">
                  Guardar ejercicio
                </button>
                <button type="button" onClick={() => { setEjFormOpen(false); setEjForm(EJ_SESION_EMPTY) }}
                  className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {sesion.ejercicios.length === 0 && !ejFormOpen ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-t border-gray-100">
              <ListOrdered className="w-8 h-8 mb-2 opacity-25"/>
              <p className="text-xs">Añade los ejercicios que componen la sesión</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {sesion.ejercicios.map(ej => (
                <div key={ej.id} className="p-4">
                  {/* Header: número + tipo + meta + delete */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rfpaf-blue text-white text-xs font-bold flex items-center justify-center">
                      {ej.orden}
                    </span>
                    <span className="font-semibold text-sm text-gray-800">{ej.tipo || 'Ejercicio'}</span>
                    <div className="flex items-center gap-3 ml-2">
                      {ej.duracion && <span className="flex items-center gap-0.5 text-[11px] text-gray-500"><Clock className="w-3 h-3"/>{ej.duracion} min</span>}
                      {ej.numJugadores && <span className="flex items-center gap-0.5 text-[11px] text-gray-500"><Users className="w-3 h-3"/>{ej.numJugadores}</span>}
                    </div>
                    <button type="button" onClick={() => removeEjercicio(ej.id)}
                      className="ml-auto flex-shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors rounded">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>

                  {/* Body: image + details side by side */}
                  <div className="flex gap-3">
                    {ej.imagen ? (
                      <img src={ej.imagen} alt={`Pizarra ejercicio ${ej.orden}`}
                        className="w-36 h-24 object-cover rounded-lg border border-gray-200 flex-shrink-0"/>
                    ) : (
                      <div className="w-36 h-24 flex-shrink-0 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                        <Camera className="w-5 h-5"/>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      {ej.material && (
                        <p className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Wrench className="w-3 h-3 flex-shrink-0"/>{ej.material}
                        </p>
                      )}
                      {ej.descripcion && (
                        <p className="text-xs text-gray-700 leading-relaxed">{ej.descripcion}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Captures gallery */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-rfpaf-blue"/>
              Capturas de pizarra
              {sesion.capturas.length > 0 && (
                <span className="bg-rfpaf-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{sesion.capturas.length}</span>
              )}
            </h3>
          </div>

          {sesion.capturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <Camera className="w-8 h-8 mb-2 opacity-30"/>
              <p className="text-xs">Usa el botón verde de la pizarra para añadir capturas</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {sesion.capturas.map((src, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200">
                  <img src={src} alt={`Captura ${idx+1}`} className="w-full h-auto"/>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={() => removeCaptura(idx)}
                      className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors">
                      <X className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                    Captura {idx+1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export PDF */}
        <button type="button" onClick={() => exportSesionPDF(sesion)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-rfpaf-blue text-white text-sm font-bold rounded-xl hover:bg-rfpaf-blue/90 transition-colors shadow-sm">
          <Download className="w-4 h-4"/> Exportar documento de sesión (PDF)
        </button>

        <button type="button" onClick={() => setSesion(SESION_EMPTY)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors">
          <Eraser className="w-3.5 h-3.5"/> Limpiar sesión
        </button>
      </div>

      {/* ── Right: tactical board ── */}
      <TacticalBoard onCapture={addCaptura} onRegisterCapture={fn => { tacticalCaptureRef.current = fn }}/>
    </div>
  )
}

/* ═══════════════════════════════════════
   BIBLIOTECA TAB
═══════════════════════════════════════ */

function getEmbedUrl(url: string): string {
  const yt=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/); if(yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vi=url.match(/vimeo\.com\/(\d+)/); if(vi) return `https://player.vimeo.com/video/${vi[1]}`
  return url
}

async function exportEjercicioPDF(ej: Ejercicio) {
  const { default: html2pdf } = await import('html2pdf.js')
  const el=document.getElementById(`ej-${ej.id}`); if(!el) return
  html2pdf().set({ margin:12,filename:`ejercicio-${ej.tipo||'entrenamiento'}.pdf`,
    image:{type:'jpeg',quality:0.95},html2canvas:{scale:2,useCORS:true},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} }).from(el).save()
}

function EjercicioCard({ ej, onDelete }: { ej: Ejercicio; onDelete: (id: string) => void }) {
  const embedUrl=ej.video?getEmbedUrl(ej.video):''
  return (
    <div id={`ej-${ej.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {(ej.imagen||embedUrl)&&(
        <div className="flex h-44">
          {ej.imagen&&<div className={embedUrl?'w-1/2':'w-full'}><img src={ej.imagen} alt="Ejercicio" className="w-full h-full object-cover"/></div>}
          {embedUrl&&<div className={ej.imagen?'w-1/2':'w-full'}><iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video"/></div>}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className="inline-block bg-rfpaf-blue text-white text-xs font-bold px-2.5 py-0.5 rounded-full mb-1.5">{ej.tipo||'Sin tipo'}</span>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{ej.duracion?`${ej.duracion} min`:'—'}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3"/>{ej.numJugadores?`${ej.numJugadores} jugadoras`:'—'}</span>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={()=>exportEjercicioPDF(ej)} className="p-1.5 rounded-lg text-gray-400 hover:text-rfpaf-blue hover:bg-blue-50 transition-colors" title="PDF"><Download className="w-4 h-4"/></button>
            <button onClick={()=>onDelete(ej.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar"><Trash2 className="w-4 h-4"/></button>
          </div>
        </div>
        {ej.descripcion&&<p className="text-xs text-gray-600 mb-2 leading-relaxed">{ej.descripcion}</p>}
        {ej.material&&<div className="flex items-center gap-1.5 text-xs text-gray-500"><Wrench className="w-3 h-3 flex-shrink-0"/><span>{ej.material}</span></div>}
      </div>
    </div>
  )
}

const TIPOS_EJERCICIO = ['Técnico','Táctico','Físico','Rondo','Partido reducido','Calentamiento','Posesión','Pressing','Otro']
const FORM_EMPTY = { tipo:'',duracion:'',descripcion:'',numJugadores:'',material:'',imagen:null as string|null,video:'' }

function BibliotecaTab() {
  const [formOpen, setFormOpen] = useState(false)
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [form, setForm] = useState(FORM_EMPTY)

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if(!file) return
    const reader=new FileReader(); reader.onloadend=()=>setForm(f=>({...f,imagen:reader.result as string})); reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault()
    setEjercicios(prev=>[{id:uuidv4(),...form,imagen:form.imagen,video:form.video||null,creadoEn:new Date().toISOString()},...prev])
    setForm(FORM_EMPTY); setFormOpen(false)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button type="button" onClick={()=>setFormOpen(o=>!o)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <span className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
              <Plus className="w-4 h-4 text-rfpaf-blue"/> Nuevo Ejercicio
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${formOpen?'rotate-180':''}`}/>
          </button>
          {formOpen&&(
            <form onSubmit={handleSubmit} className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de ejercicio</label>
                  <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
                    <option value="">Seleccionar…</option>
                    {TIPOS_EJERCICIO.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duración (min)</label>
                  <input type="number" value={form.duracion} onChange={e=>setForm(f=>({...f,duracion:e.target.value}))}
                    placeholder="15" min={1} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nº Jugadoras</label>
                  <input type="number" value={form.numJugadores} onChange={e=>setForm(f=>({...f,numJugadores:e.target.value}))}
                    placeholder="11" min={1} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                  <input type="text" value={form.material} onChange={e=>setForm(f=>({...f,material:e.target.value}))}
                    placeholder="Conos, petos…" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))}
                  placeholder="Describe el ejercicio, objetivos, variantes…" rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Image className="w-3 h-3"/> Imagen</label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-rfpaf-blue/50 hover:bg-blue-50/40 transition-colors overflow-hidden">
                    {form.imagen?<img src={form.imagen} alt="Preview" className="w-full h-full object-cover"/>
                      :<div className="flex flex-col items-center text-gray-400 pointer-events-none"><Image className="w-6 h-6 mb-1"/><span className="text-xs">Subir imagen</span></div>}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImage}/>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Video className="w-3 h-3"/> Video (URL)</label>
                  <div className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-lg gap-2 p-3">
                    <Video className="w-6 h-6 text-gray-400"/>
                    <input type="url" value={form.video} onChange={e=>setForm(f=>({...f,video:e.target.value}))}
                      placeholder="YouTube o Vimeo URL…" className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-rfpaf-blue/30"/>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-rfpaf-blue text-white rounded-lg text-sm font-semibold hover:bg-rfpaf-blue/90 transition-colors">
                Guardar ejercicio
              </button>
            </form>
          )}
        </div>

        {ejercicios.length===0?(
          <div className="text-center py-14 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30"/>
            <p className="text-sm font-medium">Sin ejercicios todavía</p>
            <p className="text-xs mt-1 opacity-70">Crea el primero usando el formulario de arriba</p>
          </div>
        ):(
          <div className="space-y-4">
            {ejercicios.map(ej=>(
              <EjercicioCard key={ej.id} ej={ej} onDelete={id=>setEjercicios(prev=>prev.filter(e=>e.id!==id))}/>
            ))}
          </div>
        )}
      </div>

      {/* Right: tactical board without capture */}
      <TacticalBoard/>
    </div>
  )
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */

export default function Entrenamientos() {
  const [tab, setTab] = useState<Tab>('sesion')

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Entrenamientos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Planificador de sesiones y biblioteca de ejercicios</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('sesion')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab==='sesion' ? 'border-rfpaf-blue text-rfpaf-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList className="w-4 h-4"/> Sesión de Entrenamiento
        </button>
        <button
          type="button"
          onClick={() => setTab('biblioteca')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab==='biblioteca' ? 'border-rfpaf-blue text-rfpaf-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="w-4 h-4"/> Biblioteca de Ejercicios
        </button>
      </div>

      {/* Tab content */}
      {tab==='sesion' ? <SesionTab/> : <BibliotecaTab/>}
    </div>
  )
}
