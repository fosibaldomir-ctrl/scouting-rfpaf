import { useState, useRef, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  ChevronDown, ChevronLeft, ChevronRight, Download, Camera,
  Pencil, Circle, Square, Minus, ArrowRight, Type, Undo2, Eraser, UserX,
  Clapperboard, RotateCcw, Plus, Trash2, Play, Zap,
} from 'lucide-react'

/* ═══════════════════════════════════════
   TYPES
═══════════════════════════════════════ */

type DrawTool = 'freehand' | 'line' | 'arrow' | 'curve' | 'curvearrow' | 'circle' | 'rect' | 'text'
type PitchType = 'full' | 'half' | 'blank'
interface Point { x: number; y: number }
interface Shape { type: DrawTool; color: string; fillColor?: string; opacity?: number; width: number; dashed?: boolean; start?: Point; end?: Point; cp?: Point; points?: Point[]; text?: string }

type TeamId = 1 | 2 | 3
interface PlacedPlayer { uid: string; team: TeamId; number: number; x: number; y: number }
interface SelPlayer { team: TeamId; number: number }

type AccessoryType = 'goal_front' | 'goal_3d_r' | 'goal_3d_l' | 'goal_side' | 'goal_mini' | 'goal_arc' | 'cone' | 'mushroom_blue' | 'mushroom_red' | 'mushroom_yellow' | 'ladder' | 'hurdle' | 'mannequin' | 'barrier' | 'ball_bw' | 'ball_blue' | 'ball_red'
interface PlacedAccessory { uid: string; type: AccessoryType; x: number; y: number; rotation: number; color?: string; scale: number }
interface SelAcc { type: AccessoryType; color?: string }

interface AnimFrame {
  id: string
  label: string
  players: PlacedPlayer[]
  accessories: PlacedAccessory[]
}

/* ═══════════════════════════════════════
   CONSTANTS
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

/* ═══════════════════════════════════════
   ACCESSORY DRAWING
═══════════════════════════════════════ */

function drawAccessory(ctx: CanvasRenderingContext2D, a: PlacedAccessory, dragging: boolean) {
  const isGoal = a.type.startsWith('goal')
  ctx.save()
  ctx.translate(a.x, a.y)
  if (a.rotation && !isGoal) ctx.rotate(a.rotation * Math.PI / 180)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.shadowColor = dragging ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = dragging ? 12 : 5; ctx.shadowOffsetY = dragging ? 0 : 2
  ctx.scale(a.scale, a.scale)
  const PITCH = 0.38
  const theta = (a.rotation ?? 0) * Math.PI / 180
  const cosT = Math.cos(theta), sinT = Math.sin(theta)
  const cosP = Math.cos(PITCH), sinP = Math.sin(PITCH)
  const gp = (px: number, py: number, pz: number): [number, number] => {
    const rx = px * cosT + pz * sinT
    const rz = -px * sinT + pz * cosT
    return [rx, -(py * cosP - rz * sinP)]
  }
  const clr = a.color
  switch (a.type) {
    case 'goal_front': case 'goal_3d_r': case 'goal_3d_l': case 'goal_side': {
      const hw=18, hh=5.5, hd=7
      const [xTLf,yTLf]=gp(-hw, hh, hd),  [xTRf,yTRf]=gp( hw, hh, hd)
      const [xBLf,yBLf]=gp(-hw,-hh, hd),  [xBRf,yBRf]=gp( hw,-hh, hd)
      const [xTLb,yTLb]=gp(-hw, hh,-hd),  [xTRb,yTRb]=gp( hw, hh,-hd)
      const [xBLb,yBLb]=gp(-hw,-hh,-hd),  [xBRb,yBRb]=gp( hw,-hh,-hd)
      const ln=(x1:number,y1:number,x2:number,y2:number)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
      const openNear = cosT >= 0
      ctx.strokeStyle=openNear?'rgba(255,255,255,0.42)':'#ffffff'
      ctx.lineWidth=openNear?1.6:3; ctx.lineCap='round'; ctx.lineJoin='round'
      if(openNear){
        ctx.beginPath();ctx.moveTo(xBLb,yBLb);ctx.lineTo(xTLb,yTLb);ctx.lineTo(xTRb,yTRb);ctx.lineTo(xBRb,yBRb);ctx.stroke()
        ln(xBLb,yBLb,xBRb,yBRb)
      } else {
        ctx.beginPath();ctx.moveTo(xBLf,yBLf);ctx.lineTo(xTLf,yTLf);ctx.lineTo(xTRf,yTRf);ctx.lineTo(xBRf,yBRf);ctx.stroke()
      }
      ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1.5
      ln(xTLf,yTLf,xTLb,yTLb); ln(xTRf,yTRf,xTRb,yTRb)
      ln(xBLf,yBLf,xBLb,yBLb); ln(xBRf,yBRf,xBRb,yBRb)
      ctx.save()
      const np=new Path2D()
      np.moveTo(xTLf,yTLf);np.lineTo(xTRf,yTRf);np.lineTo(xBRf,yBRf);np.lineTo(xBLf,yBLf);np.closePath()
      ctx.clip(np)
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=0.5
      for(let t=-hw-hh*2;t<hw+hh*2;t+=5){
        const [sx1,sy1]=gp(t+hh*2, hh,hd),[sx2,sy2]=gp(t,-hh,hd)
        ctx.beginPath();ctx.moveTo(sx1,sy1);ctx.lineTo(sx2,sy2);ctx.stroke()
        const [sx3,sy3]=gp(t, hh,hd),[sx4,sy4]=gp(t+hh*2,-hh,hd)
        ctx.beginPath();ctx.moveTo(sx3,sy3);ctx.lineTo(sx4,sy4);ctx.stroke()
      }
      ctx.restore()
      ctx.strokeStyle=openNear?'#ffffff':'rgba(255,255,255,0.42)'
      ctx.lineWidth=openNear?3:1.6; ctx.lineCap='round'; ctx.lineJoin='round'
      if(openNear){
        ctx.beginPath();ctx.moveTo(xBLf,yBLf);ctx.lineTo(xTLf,yTLf);ctx.lineTo(xTRf,yTRf);ctx.lineTo(xBRf,yBRf);ctx.stroke()
        ctx.strokeStyle='rgba(255,255,255,0.38)'; ctx.lineWidth=0.85
        const dx1=(xTLf-xBLf)*0.09,dy1=(yTLf-yBLf)*0.09
        const dxt=(xTRf-xTLf)*0.07,dyt=(yTRf-yTLf)*0.07
        ctx.beginPath();ctx.moveTo(xBLf+dx1,yBLf+dy1);ctx.lineTo(xTLf+dxt,yTLf+dyt);ctx.lineTo(xTRf-dxt,yTRf+dyt);ctx.lineTo(xBRf-dx1,yBRf+dy1);ctx.stroke()
      } else {
        ctx.beginPath();ctx.moveTo(xBLb,yBLb);ctx.lineTo(xTLb,yTLb);ctx.lineTo(xTRb,yTRb);ctx.lineTo(xBRb,yBRb);ctx.stroke()
        ln(xBLb,yBLb,xBRb,yBRb)
      }
      break
    }
    case 'goal_mini': {
      const hw=13, hh=4.5, hd=5
      const [xTLf,yTLf]=gp(-hw, hh, hd), [xTRf,yTRf]=gp( hw, hh, hd)
      const [xBLf,yBLf]=gp(-hw,-hh, hd), [xBRf,yBRf]=gp( hw,-hh, hd)
      const [xTLb,yTLb]=gp(-hw, hh,-hd), [xTRb,yTRb]=gp( hw, hh,-hd)
      const [xBLb,yBLb]=gp(-hw,-hh,-hd), [xBRb,yBRb]=gp( hw,-hh,-hd)
      const ln=(x1:number,y1:number,x2:number,y2:number)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
      const openNear = cosT >= 0
      ctx.strokeStyle=openNear?'rgba(255,255,255,0.42)':'#ffffff'
      ctx.lineWidth=openNear?1.4:2.8; ctx.lineCap='round'; ctx.lineJoin='round'
      if(openNear){ ctx.beginPath();ctx.moveTo(xBLb,yBLb);ctx.lineTo(xTLb,yTLb);ctx.lineTo(xTRb,yTRb);ctx.lineTo(xBRb,yBRb);ctx.stroke();ln(xBLb,yBLb,xBRb,yBRb) }
      else { ctx.beginPath();ctx.moveTo(xBLf,yBLf);ctx.lineTo(xTLf,yTLf);ctx.lineTo(xTRf,yTRf);ctx.lineTo(xBRf,yBRf);ctx.stroke() }
      ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1.4
      ln(xTLf,yTLf,xTLb,yTLb); ln(xTRf,yTRf,xTRb,yTRb)
      ln(xBLf,yBLf,xBLb,yBLb); ln(xBRf,yBRf,xBRb,yBRb)
      const [xFtL,yFtL]=gp(-hw,-hh-4,hd), [xFtR,yFtR]=gp(hw,-hh-4,hd)
      ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=1.8
      ln(xBLf,yBLf,xFtL,yFtL); ln(xBRf,yBRf,xFtR,yFtR)
      ctx.save()
      const np=new Path2D()
      np.moveTo(xTLf,yTLf);np.lineTo(xTRf,yTRf);np.lineTo(xBRf,yBRf);np.lineTo(xBLf,yBLf);np.closePath()
      ctx.clip(np)
      ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=0.5
      for(let t=-hw-hh*2;t<hw+hh*2;t+=4){
        const [sx1,sy1]=gp(t+hh*2, hh,hd),[sx2,sy2]=gp(t,-hh,hd)
        ctx.beginPath();ctx.moveTo(sx1,sy1);ctx.lineTo(sx2,sy2);ctx.stroke()
        const [sx3,sy3]=gp(t, hh,hd),[sx4,sy4]=gp(t+hh*2,-hh,hd)
        ctx.beginPath();ctx.moveTo(sx3,sy3);ctx.lineTo(sx4,sy4);ctx.stroke()
      }
      ctx.restore()
      ctx.strokeStyle=openNear?'#ffffff':'rgba(255,255,255,0.42)'
      ctx.lineWidth=openNear?2.8:1.4; ctx.lineCap='round'; ctx.lineJoin='round'
      if(openNear){ ctx.beginPath();ctx.moveTo(xBLf,yBLf);ctx.lineTo(xTLf,yTLf);ctx.lineTo(xTRf,yTRf);ctx.lineTo(xBRf,yBRf);ctx.stroke() }
      else { ctx.beginPath();ctx.moveTo(xBLb,yBLb);ctx.lineTo(xTLb,yTLb);ctx.lineTo(xTRb,yTRb);ctx.lineTo(xBRb,yBRb);ctx.stroke();ln(xBLb,yBLb,xBRb,yBRb) }
      break
    }
    case 'goal_arc': {
      const hw=13, hb=7, hs=2, yc=-9
      const hd=5
      const [xBLf,yBLf]=gp(-hw, hb, hd), [xBRf,yBRf]=gp( hw, hb, hd)
      const [xSLf,ySLf]=gp(-hw, hs, hd), [xSRf,ySRf]=gp( hw, hs, hd)
      const [xC1f,yC1f]=gp(-hw, yc, hd), [xC2f,yC2f]=gp( hw, yc, hd)
      const [xBLb,yBLb]=gp(-hw, hb,-hd), [xBRb,yBRb]=gp( hw, hb,-hd)
      const [xSLb,ySLb]=gp(-hw, hs,-hd), [xSRb,ySRb]=gp( hw, hs,-hd)
      const [xC1b,yC1b]=gp(-hw, yc,-hd), [xC2b,yC2b]=gp( hw, yc,-hd)
      const ln=(x1:number,y1:number,x2:number,y2:number)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
      const openNear = cosT >= 0
      ctx.strokeStyle=openNear?'rgba(255,255,255,0.42)':'#ffffff'
      ctx.lineWidth=openNear?1.5:3; ctx.lineCap='round'; ctx.lineJoin='round'
      if(openNear){
        ctx.beginPath();ctx.moveTo(xBLb,yBLb);ctx.lineTo(xSLb,ySLb)
        ctx.bezierCurveTo(xC1b,yC1b,xC2b,yC2b,xSRb,ySRb);ctx.lineTo(xBRb,yBRb);ctx.stroke()
        ln(xBLb,yBLb,xBRb,yBRb)
      } else {
        ctx.beginPath();ctx.moveTo(xBLf,yBLf);ctx.lineTo(xSLf,ySLf)
        ctx.bezierCurveTo(xC1f,yC1f,xC2f,yC2f,xSRf,ySRf);ctx.lineTo(xBRf,yBRf);ctx.stroke()
      }
      ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1.5
      ln(xBLf,yBLf,xBLb,yBLb); ln(xBRf,yBRf,xBRb,yBRb)
      ln(xSLf,ySLf,xSLb,ySLb); ln(xSRf,ySRf,xSRb,ySRb)
      ctx.save()
      const np=new Path2D()
      np.moveTo(xBLf,yBLf);np.lineTo(xSLf,ySLf)
      np.bezierCurveTo(xC1f,yC1f,xC2f,yC2f,xSRf,ySRf)
      np.lineTo(xBRf,yBRf);np.closePath()
      ctx.clip(np)
      ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=0.5
      for(let t=-hw-hb*2;t<hw+hb*2;t+=5){
        const [sx1,sy1]=gp(t+hb*2, hb,hd),[sx2,sy2]=gp(t, yc,hd)
        ctx.beginPath();ctx.moveTo(sx1,sy1);ctx.lineTo(sx2,sy2);ctx.stroke()
        const [sx3,sy3]=gp(t, hb,hd),[sx4,sy4]=gp(t+hb*2, yc,hd)
        ctx.beginPath();ctx.moveTo(sx3,sy3);ctx.lineTo(sx4,sy4);ctx.stroke()
      }
      ctx.restore()
      ctx.strokeStyle=openNear?'#ffffff':'rgba(255,255,255,0.42)'
      ctx.lineWidth=openNear?3:1.5; ctx.lineCap='round'; ctx.lineJoin='round'
      if(openNear){
        ctx.beginPath();ctx.moveTo(xBLf,yBLf);ctx.lineTo(xSLf,ySLf)
        ctx.bezierCurveTo(xC1f,yC1f,xC2f,yC2f,xSRf,ySRf);ctx.lineTo(xBRf,yBRf);ctx.stroke()
      } else {
        ctx.beginPath();ctx.moveTo(xBLb,yBLb);ctx.lineTo(xSLb,ySLb)
        ctx.bezierCurveTo(xC1b,yC1b,xC2b,yC2b,xSRb,ySRb);ctx.lineTo(xBRb,yBRb);ctx.stroke()
        ln(xBLb,yBLb,xBRb,yBRb)
      }
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
    case 'mushroom_blue': case 'mushroom_red': case 'mushroom_yellow': {
      const [cMain,cDark,cHL] = a.type==='mushroom_blue'
        ? ['#1976d2','#0d47a1','#90caf9']
        : a.type==='mushroom_red'
        ? ['#e53935','#b71c1c','#ef9a9a']
        : ['#f9a825','#e65100','#fff59d']
      ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(1,7,12,3.5,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle=cDark; ctx.beginPath(); ctx.ellipse(0,3.5,12.5,5,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle=cMain; ctx.beginPath(); ctx.ellipse(0,0,13,5.5,0,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.7
      ctx.beginPath(); ctx.ellipse(0,0,13,5.5,0,0,Math.PI*2); ctx.stroke()
      ctx.fillStyle=cDark; ctx.beginPath(); ctx.ellipse(0,0.5,5,2.5,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle=cMain; ctx.beginPath(); ctx.ellipse(0,-0.2,4,1.8,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0,0.5,3,1.3,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(-5,-2,4,1.5,-0.3,0,Math.PI*2); ctx.fill()
      ctx.fillStyle=cHL; ctx.globalAlpha=0.18; ctx.beginPath(); ctx.ellipse(0,-1.5,7,2,0,0,Math.PI*2); ctx.fill()
      ctx.globalAlpha=1
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
      ctx.strokeStyle='#f59e0b'; ctx.lineWidth=1.8; ctx.lineCap='round'; ctx.lineJoin='round'
      ctx.beginPath(); ctx.arc(0,-17,3.5,0,Math.PI*2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0,-13.5); ctx.lineTo(0,-11); ctx.stroke()
      ctx.strokeRect(-6,-11,12,15)
      ctx.beginPath(); ctx.moveTo(-2,-11); ctx.lineTo(-2,4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(2,-11); ctx.lineTo(2,4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-12,-3); ctx.lineTo(12,-3); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-3,4); ctx.lineTo(-3,17); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(3,4); ctx.lineTo(3,17); ctx.stroke()
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
    case 'ball_bw': case 'ball_blue': case 'ball_red': {
      const br=12
      const patchClr=a.type==='ball_bw'?'#1a1a1a':a.type==='ball_blue'?'#1d4ed8':'#dc2626'
      ctx.fillStyle='#f0f0f0'; ctx.strokeStyle='#555'; ctx.lineWidth=1
      ctx.beginPath(); ctx.arc(0,0,br,0,Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.save()
      ctx.beginPath(); ctx.arc(0,0,br,0,Math.PI*2); ctx.clip()
      ctx.fillStyle=patchClr; ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=0.5
      ctx.beginPath()
      for(let i=0;i<5;i++){const ang=(i*Math.PI*2)/5-Math.PI/2;const px=br*0.3*Math.cos(ang);const py=br*0.3*Math.sin(ang);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py)}
      ctx.closePath(); ctx.fill(); ctx.stroke()
      for(let k=0;k<5;k++){
        const kang=(k*Math.PI*2)/5-Math.PI/2
        const cx=br*0.7*Math.cos(kang); const cy=br*0.7*Math.sin(kang)
        ctx.beginPath()
        for(let j=0;j<5;j++){const jang=(j*Math.PI*2)/5+kang+Math.PI/5;ctx.lineTo(cx+br*0.27*Math.cos(jang),cy+br*0.27*Math.sin(jang))}
        ctx.closePath(); ctx.fill(); ctx.stroke()
      }
      ctx.restore()
      ctx.fillStyle='rgba(255,255,255,0.55)'
      ctx.beginPath(); ctx.ellipse(-br*0.28,-br*0.32,br*0.2,br*0.13,-Math.PI/4,0,Math.PI*2); ctx.fill()
      break
    }
  }
  ctx.restore()
}


function drawAccessoryHandles(ctx: CanvasRenderingContext2D, a: PlacedAccessory) {
  const hw = ACC_LOCAL_HALF * a.scale
  const hh = ACC_LOCAL_HALF * a.scale
  const rad = (a.rotation ?? 0) * Math.PI / 180
  const isGoal = a.type.startsWith('goal')
  ctx.save()
  ctx.translate(a.x, a.y)
  if (!isGoal) ctx.rotate(rad)
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4])
  ctx.strokeRect(-hw, -hh, hw * 2, hh * 2); ctx.setLineDash([])
  ctx.strokeStyle = 'rgba(59,130,246,0.5)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(0, -(hh + ROT_EXTRA)); ctx.stroke()
  ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(0, -(hh + ROT_EXTRA), HANDLE_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(0, -(hh + ROT_EXTRA), 3, -Math.PI * 0.7, Math.PI * 0.7); ctx.stroke()
  const corners: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#22c55e'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(cx, cy, HANDLE_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  })
  ctx.restore()
}

function getAccHandleHit(pos: Point, a: PlacedAccessory): 'rotation' | 'corner' | 'body' | null {
  const dx = pos.x - a.x; const dy = pos.y - a.y
  const isGoal = a.type.startsWith('goal')
  const rad = isGoal ? 0 : (a.rotation ?? 0) * Math.PI / 180
  const cos = Math.cos(rad); const sin = Math.sin(rad)
  const lx = dx * cos + dy * sin; const ly = -dx * sin + dy * cos
  const hw = ACC_LOCAL_HALF * a.scale; const hh = ACC_LOCAL_HALF * a.scale
  const HIT = 12
  if (Math.hypot(lx, ly + hh + ROT_EXTRA) <= HIT) return 'rotation'
  const corners: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
  for (const [cx, cy] of corners) { if (Math.hypot(lx - cx, ly - cy) <= HIT) return 'corner' }
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
  const alpha = (s.opacity ?? 100) / 100
  ctx.globalAlpha = alpha
  ctx.strokeStyle = s.color; ctx.fillStyle = s.fillColor ?? s.color; ctx.lineWidth = s.width
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
      { const cp = s.cp ?? getCurveCP(s.start, s.end)
        ctx.beginPath(); ctx.moveTo(s.start.x, s.start.y)
        ctx.quadraticCurveTo(cp.x, cp.y, s.end.x, s.end.y); ctx.stroke(); break }
    case 'curvearrow':
      if (!s.start || !s.end) return
      { const cp = s.cp ?? getCurveCP(s.start, s.end)
        ctx.beginPath(); ctx.moveTo(s.start.x, s.start.y)
        ctx.quadraticCurveTo(cp.x, cp.y, s.end.x, s.end.y); ctx.stroke()
        ctx.setLineDash([])
        drawArrowhead(ctx, cp, s.end); break }
    case 'circle':
      if (!s.start || !s.end) return
      { const rx = Math.abs(s.end.x - s.start.x) / 2, ry = Math.abs(s.end.y - s.start.y) / 2
        const cx = Math.min(s.start.x, s.end.x) + rx, cy = Math.min(s.start.y, s.end.y) + ry
        ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx,1), Math.max(ry,1), 0, 0, Math.PI*2)
        ctx.globalAlpha = alpha * 0.28; ctx.fill()
        ctx.globalAlpha = alpha; ctx.stroke(); break }
    case 'rect':
      if (!s.start || !s.end) return
      { const w = s.end.x - s.start.x, h = s.end.y - s.start.y
        ctx.globalAlpha = alpha * 0.28; ctx.fillRect(s.start.x, s.start.y, w, h)
        ctx.globalAlpha = alpha; ctx.strokeRect(s.start.x, s.start.y, w, h); break }
    case 'text':
      if (!s.start || !s.text) return
      ctx.setLineDash([])
      ctx.fillStyle = s.color
      ctx.font = `bold ${s.width*5+10}px sans-serif`; ctx.fillText(s.text, s.start.x, s.start.y); break
  }
  ctx.setLineDash([])
  ctx.globalAlpha = 1
}

function drawTextHandle(ctx: CanvasRenderingContext2D, s: Shape) {
  if (s.type !== 'text' || !s.start || !s.text) return
  const fs = s.width*5+10; const estW = s.text.length*fs*0.58+12
  ctx.strokeStyle='rgba(255,255,100,0.55)'; ctx.lineWidth=1; ctx.setLineDash([4,3])
  ctx.strokeRect(s.start.x-4, s.start.y-fs-2, estW, fs+8); ctx.setLineDash([])
}

const CP_HIT_R = 22

function drawCurveHandle(ctx: CanvasRenderingContext2D, s: Shape) {
  if (!s.start || !s.end) return
  const cp = s.cp ?? getCurveCP(s.start, s.end)
  ctx.save()
  // guide lines from endpoints to CP
  ctx.strokeStyle = 'rgba(250,204,21,0.35)'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  ctx.moveTo(s.start.x, s.start.y)
  ctx.lineTo(cp.x, cp.y)
  ctx.lineTo(s.end.x, s.end.y)
  ctx.stroke()
  ctx.setLineDash([])
  // CP handle circle
  ctx.beginPath()
  ctx.arc(cp.x, cp.y, 9, 0, Math.PI * 2)
  ctx.fillStyle = '#facc15'
  ctx.fill()
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // small arrow hint inside
  ctx.fillStyle = '#1f2937'
  ctx.font = 'bold 8px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('↔', cp.x, cp.y)
  ctx.restore()
}

function drawPlacedPlayer(ctx: CanvasRenderingContext2D, p: PlacedPlayer, dragging: boolean, highlighted: boolean = false) {
  const t = TEAMS[p.team]
  if (highlighted) {
    // Pulsing glow rings (outer → inner, fading in)
    ctx.save();
    ([{r: PLAYER_R+20, a: 0.08, w: 5}, {r: PLAYER_R+13, a: 0.18, w: 4}, {r: PLAYER_R+7, a: 0.38, w: 3}]).forEach(({r, a, w}) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2)
      ctx.strokeStyle = `rgba(250,204,21,${a})`; ctx.lineWidth = w; ctx.stroke()
    })
    // Solid bright ring just outside player
    ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R + 4, 0, Math.PI*2)
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5; ctx.stroke()
    ctx.restore()
  }
  ctx.shadowColor='rgba(0,0,0,0.45)'; ctx.shadowBlur=dragging?12:6; ctx.shadowOffsetY=dragging?4:2
  ctx.beginPath(); ctx.arc(p.x,p.y,PLAYER_R,0,Math.PI*2); ctx.fillStyle=t.bg; ctx.fill()
  ctx.strokeStyle=highlighted?'#facc15':dragging?'#fff':t.border; ctx.lineWidth=highlighted?2.5:dragging?2.5:2; ctx.stroke()
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
   LISTS
═══════════════════════════════════════ */

const PITCH_OPTIONS: { id: PitchType; label: string }[] = [
  { id:'full', label:'Campo completo' },
  { id:'half', label:'Medio campo' },
  { id:'blank', label:'Sin líneas' },
]

const ACCESSORY_LIST: { type: AccessoryType; label: string }[] = [
  { type:'cone', label:'Conos' },
  { type:'ladder', label:'Escalera' },
  { type:'hurdle', label:'Valla' },
  { type:'mannequin', label:'Muñeco' },
  { type:'barrier', label:'Barrera' },
]

const GOAL_LIST: { type: AccessoryType; label: string; initRot: number }[] = [
  { type:'goal_front',  label:'Frontal',      initRot:   0 },
  { type:'goal_3d_r',   label:'3D Derecha',   initRot: -28 },
  { type:'goal_3d_l',   label:'3D Izquierda', initRot:  28 },
  { type:'goal_side',   label:'Lateral',      initRot:  90 },
  { type:'goal_mini',   label:'Mini',         initRot: -22 },
  { type:'goal_arc',    label:'Portátil',     initRot: -18 },
]

const MUSHROOM_LIST: { type: AccessoryType; label: string }[] = [
  { type:'mushroom_blue',   label:'Seta Azul' },
  { type:'mushroom_red',    label:'Seta Roja' },
  { type:'mushroom_yellow', label:'Seta Amarilla' },
]

const BALL_LIST: { type: AccessoryType; label: string }[] = [
  { type:'ball_bw',   label:'Balón B/N' },
  { type:'ball_blue', label:'Balón Azul' },
  { type:'ball_red',  label:'Balón Rojo' },
]

/* ═══════════════════════════════════════
   TACTICAL BOARD COMPONENT
═══════════════════════════════════════ */

interface TacticalBoardProps {
  onCapture?: (png: string) => void
  onRegisterCapture?: (fn: () => string | null) => void
}

export default function TacticalBoard({ onCapture, onRegisterCapture }: TacticalBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<DrawTool>('freehand')
  const [color, setColor] = useState('#ffffff')
  const [fillColor, setFillColor] = useState('#2563eb')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [shapeOpacity, setShapeOpacity] = useState(100)
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
  const [mobilePanel, setMobilePanel] = useState<'left' | 'canvas' | 'right'>('canvas')
  const [mushroomMenuOpen, setMushroomMenuOpen] = useState(false)
  const [placedPlayers, setPlacedPlayers] = useState<PlacedPlayer[]>([])
  const [selPlayer, setSelPlayer] = useState<SelPlayer | null>(null)
  const [placedAccessories, setPlacedAccessories] = useState<PlacedAccessory[]>([])
  const [selAcc, setSelAcc] = useState<SelAcc | null>(null)
  const [selectedAccUid, setSelectedAccUid] = useState<string | null>(null)
  const playerDragRef = useRef<{ uid: string; ox: number; oy: number } | null>(null)
  const accDragRef = useRef<{ uid: string; startX: number; startY: number; accX: number; accY: number; mode?: 'move'|'resize'|'rotate'; startDist?: number; startAngle?: number; startRot?: number; startScale?: number } | null>(null)
  const textDragRef = useRef<{ idx: number; ox: number; oy: number } | null>(null)
  const cpDragRef = useRef<{ idx: number } | null>(null)
  const [highlightedPlayers, setHighlightedPlayers] = useState<Set<string>>(new Set())
  const [highlightMode, setHighlightMode] = useState(false)
  const [openTeams, setOpenTeams] = useState<Set<TeamId>>(new Set())
  // Sequence / keyframe animation
  const [seqMode, setSeqMode] = useState(false)
  const [animFrames, setAnimFrames] = useState<AnimFrame[]>([])
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0)
  const [seqPlaying, setSeqPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [seqDuration, setSeqDuration] = useState(1.5)
  const seqRafRef = useRef<number | null>(null)
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
    shapes.forEach((s,i)=>{
      drawShape(ctx,s)
      if(i===draggedTextIdx) drawTextHandle(ctx,s)
      if((s.type==='curve'||s.type==='curvearrow')&&s.start&&s.end) drawCurveHandle(ctx,s)
    })
    if(currentShape) drawShape(ctx,currentShape)
    placedAccessories.forEach(a=>{
      drawAccessory(ctx,a,accDragRef.current?.uid===a.uid)
      if(selectedAccUid===a.uid) drawAccessoryHandles(ctx,a)
    })
    placedPlayers.forEach(p=>drawPlacedPlayer(ctx,p,playerDragRef.current?.uid===p.uid,highlightedPlayers.has(p.uid)))
  }, [shapes,currentShape,placedPlayers,placedAccessories,draggedTextIdx,pitchType,selectedAccUid,highlightedPlayers])

  useEffect(() => { redraw() }, [redraw])

  /* ── Sequence helpers ─────────────────────────────── */

  const snap = useCallback(() => ({
    players: JSON.parse(JSON.stringify(placedPlayers)) as PlacedPlayer[],
    accessories: JSON.parse(JSON.stringify(placedAccessories)) as PlacedAccessory[],
  }), [placedPlayers, placedAccessories])

  // Enter sequence mode: auto-create Frame 1 from current board
  const enterSeqMode = useCallback(() => {
    const { players, accessories } = snap()
    setAnimFrames([{ id: uuidv4(), label: 'F1', players, accessories }])
    setCurrentFrameIdx(0)
    setSeqMode(true)
  }, [snap])

  // Exit sequence mode: restore current frame's positions, clear frames
  const exitSeqMode = useCallback(() => {
    if (seqRafRef.current !== null) cancelAnimationFrame(seqRafRef.current)
    setSeqPlaying(false)
    setSeqMode(false)
    setAnimFrames([])
    setCurrentFrameIdx(0)
  }, [])

  // Add next frame cloning current positions (user then moves players)
  const addNextFrame = useCallback(() => {
    const { players, accessories } = snap()
    setAnimFrames(prev => {
      const next = [
        ...prev.slice(0, currentFrameIdx + 1),
        { id: uuidv4(), label: `F${currentFrameIdx + 2}`, players, accessories },
        ...prev.slice(currentFrameIdx + 1),
      ].map((f, i) => ({ ...f, label: `F${i + 1}` }))
      return next
    })
    setCurrentFrameIdx(idx => idx + 1)
  }, [snap, currentFrameIdx])

  // Save current positions into current frame then navigate
  const goToFrame = useCallback((idx: number, frames: AnimFrame[]) => {
    if (idx < 0 || idx >= frames.length) return
    const { players: cp, accessories: ca } = snap()
    setAnimFrames(prev => prev.map((f, i) =>
      i === currentFrameIdx ? { ...f, players: cp, accessories: ca } : f
    ))
    setCurrentFrameIdx(idx)
    setPlacedPlayers(JSON.parse(JSON.stringify(frames[idx].players)))
    setPlacedAccessories(JSON.parse(JSON.stringify(frames[idx].accessories)))
  }, [snap, currentFrameIdx])

  const deleteFrame = useCallback((idx: number) => {
    if (animFrames.length <= 1) return
    const next = animFrames.filter((_, i) => i !== idx).map((f, i) => ({ ...f, label: `F${i + 1}` }))
    const newIdx = Math.min(idx, next.length - 1)
    setAnimFrames(next)
    setCurrentFrameIdx(newIdx)
    setPlacedPlayers(JSON.parse(JSON.stringify(next[newIdx].players)))
    setPlacedAccessories(JSON.parse(JSON.stringify(next[newIdx].accessories)))
  }, [animFrames])

  const drawFrameState = useCallback((players: PlacedPlayer[], accessories: PlacedAccessory[]) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    drawPitch(ctx, canvas.width, canvas.height, pitchType)
    shapes.forEach(s => drawShape(ctx, s))
    accessories.forEach(a => drawAccessory(ctx, a, false))
    players.forEach(p => drawPlacedPlayer(ctx, p, false))
  }, [shapes, pitchType])

  const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

  const lerpFrames = (a: AnimFrame, b: AnimFrame, t: number): [PlacedPlayer[], PlacedAccessory[]] => {
    const et = easeInOut(Math.min(t, 1))
    const players: PlacedPlayer[] = a.players.map(pa => {
      const pb = b.players.find(p => p.uid === pa.uid) ?? pa
      return { ...pa, x: pa.x + (pb.x - pa.x) * et, y: pa.y + (pb.y - pa.y) * et }
    })
    b.players.forEach(pb => { if (!a.players.find(p => p.uid === pb.uid)) players.push(pb) })
    const accessories: PlacedAccessory[] = a.accessories.map(aa => {
      const ab = b.accessories.find(ac => ac.uid === aa.uid) ?? aa
      return { ...aa, x: aa.x + (ab.x - aa.x) * et, y: aa.y + (ab.y - aa.y) * et }
    })
    b.accessories.forEach(ab => { if (!a.accessories.find(ac => ac.uid === ab.uid)) accessories.push(ab) })
    return [players, accessories]
  }

  const runSequence = useCallback((withRecord: boolean) => {
    // Save current positions to current frame before playing
    const { players: cp, accessories: ca } = snap()
    const frames = animFrames.map((f, i) =>
      i === currentFrameIdx ? { ...f, players: cp, accessories: ca } : f
    )
    if (frames.length < 2) return
    if (seqRafRef.current !== null) cancelAnimationFrame(seqRafRef.current)

    const canvas = canvasRef.current; if (!canvas) return
    const transMs = seqDuration * 1000
    const totalMs = (frames.length - 1) * transMs
    const startTime = performance.now()

    let mediaRecorder: MediaRecorder | null = null
    const chunks: Blob[] = []

    if (withRecord) {
      const stream = canvas.captureStream(30)
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
        .find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm'
      mediaRecorder = new MediaRecorder(stream, { mimeType: mime })
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'animacion-tactica.webm'; a.click()
        URL.revokeObjectURL(url)
        setIsRecording(false)
      }
      mediaRecorder.start(100)
      setIsRecording(true)
    }

    setSeqPlaying(true)

    const tick = (now: number) => {
      const elapsed = now - startTime
      if (elapsed >= totalMs) {
        const last = frames[frames.length - 1]
        drawFrameState(last.players, last.accessories)
        setSeqPlaying(false)
        if (mediaRecorder) setTimeout(() => mediaRecorder!.stop(), 400)
        return
      }
      const fi = Math.min(Math.floor(elapsed / transMs), frames.length - 2)
      const t = (elapsed - fi * transMs) / transMs
      const [players, accessories] = lerpFrames(frames[fi], frames[fi + 1], t)
      drawFrameState(players, accessories)
      seqRafRef.current = requestAnimationFrame(tick)
    }

    seqRafRef.current = requestAnimationFrame(tick)
  }, [animFrames, currentFrameIdx, snap, seqDuration, drawFrameState])

  const stopSequence = useCallback(() => {
    if (seqRafRef.current !== null) cancelAnimationFrame(seqRafRef.current)
    setSeqPlaying(false)
    redraw()
  }, [redraw])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas=canvasRef.current!; const rect=canvas.getBoundingClientRect()
    const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX
    const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY
    return { x:(clientX-rect.left)*(canvas.width/rect.width), y:(clientY-rect.top)*(canvas.height/rect.height) }
  }

  const nearPlayer = (pos: Point) => placedPlayers.find(p=>Math.hypot(p.x-pos.x,p.y-pos.y)<=PLAYER_R+8)
  const nearAccessory = (pos: Point) => [...placedAccessories].reverse().find(a => getAccHandleHit(pos, a) !== null)

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (seqPlaying) return
    const pos=getPos(e)
    // Highlight mode: toggle player highlight on click
    if(highlightMode && e.button!==2){
      const hitP=nearPlayer(pos)
      if(hitP){
        setHighlightedPlayers(prev=>{
          const n=new Set(prev); n.has(hitP.uid)?n.delete(hitP.uid):n.add(hitP.uid); return n
        })
        return
      }
    }
    // CP handle hit — check before everything else
    if(e.button!==2){
      for(let i=shapes.length-1;i>=0;i--){
        const s=shapes[i]
        if((s.type==='curve'||s.type==='curvearrow')&&s.start&&s.end){
          const cp=s.cp??getCurveCP(s.start,s.end)
          if(Math.hypot(pos.x-cp.x,pos.y-cp.y)<=CP_HIT_R){
            cpDragRef.current={idx:i}
            if(!s.cp) setShapes(prev=>prev.map((sh,idx)=>idx===i?{...sh,cp}:sh))
            return
          }
        }
      }
    }
    if(e.button===2){
      const hitP=nearPlayer(pos); if(hitP){ setPlacedPlayers(prev=>prev.filter(p=>p.uid!==hitP.uid)); return }
      const hitA=nearAccessory(pos); if(hitA){ setPlacedAccessories(prev=>prev.filter(a=>a.uid!==hitA.uid)); setSelectedAccUid(null); return }
      return
    }
    const hitP=nearPlayer(pos); if(hitP){ playerDragRef.current={uid:hitP.uid,ox:pos.x-hitP.x,oy:pos.y-hitP.y}; return }
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
    if(selAcc){ const gDef=GOAL_LIST.find(g=>g.type===selAcc.type); setPlacedAccessories(prev=>[...prev,{uid:uuidv4(),type:selAcc.type,x:pos.x,y:pos.y,rotation:gDef?.initRot??0,color:selAcc.color,scale:1}]); return }
    if(tool==='text'){ setTextPos(pos); return }
    setIsDrawing(true)
    setCurrentShape({type:tool,color,fillColor,opacity:shapeOpacity,width:strokeWidth,dashed,start:pos,end:pos,points:tool==='freehand'?[pos]:undefined})
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos=getPos(e)
    if(cpDragRef.current!==null){
      const{idx}=cpDragRef.current
      setShapes(prev=>prev.map((s,i)=>i===idx?{...s,cp:pos}:s))
      return
    }
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
    if(cpDragRef.current!==null){ cpDragRef.current=null; return }
    if(textDragRef.current){ textDragRef.current=null; setDraggedTextIdx(null); return }
    if(playerDragRef.current){ playerDragRef.current=null; return }
    if(accDragRef.current){ accDragRef.current=null; return }
    if(!isDrawing||!currentShape) return
    // Store auto-CP so it becomes draggable after drawing
    const final: Shape = (currentShape.type==='curve'||currentShape.type==='curvearrow')&&currentShape.start&&currentShape.end
      ? {...currentShape, cp: currentShape.cp??getCurveCP(currentShape.start,currentShape.end)}
      : currentShape
    setIsDrawing(false); setShapes(prev=>[...prev,final]); setCurrentShape(null)
  }

  const onTouchStartRef = useRef<(e: any) => void>(() => {})
  const onTouchMoveRef  = useRef<(e: any) => void>(() => {})
  const onTouchEndRef   = useRef<(e: any) => void>(() => {})

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => { e.preventDefault(); onMouseDown(e as any) }
  const onTouchMove  = (e: React.TouchEvent<HTMLCanvasElement>) => { e.preventDefault(); onMouseMove(e as any) }
  const onTouchEnd   = (e: React.TouchEvent<HTMLCanvasElement>) => { e.preventDefault(); onMouseUp() }

  // Keep refs fresh so the passive listeners see current handlers
  onTouchStartRef.current = onTouchStart as any
  onTouchMoveRef.current  = onTouchMove  as any
  onTouchEndRef.current   = onTouchEnd   as any

  const handleAddText = () => {
    if(!textPos||!textInput.trim()) return
    setShapes(prev=>[...prev,{type:'text',color,fillColor,opacity:shapeOpacity,width:strokeWidth,start:textPos,text:textInput}])
    setTextInput(''); setTextPos(null)
  }

  useEffect(() => {
    onRegisterCapture?.(() => canvasRef.current?.toDataURL('image/png') ?? null)
  }, [onRegisterCapture])

  // Non-passive touch listeners so e.preventDefault() works on iOS Safari
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const tsHandler = (e: TouchEvent) => { e.preventDefault(); onTouchStartRef.current(e as any) }
    const tmHandler = (e: TouchEvent) => { e.preventDefault(); onTouchMoveRef.current(e as any) }
    const teHandler = (e: TouchEvent) => { e.preventDefault(); onTouchEndRef.current(e as any) }
    canvas.addEventListener('touchstart', tsHandler, { passive: false })
    canvas.addEventListener('touchmove',  tmHandler, { passive: false })
    canvas.addEventListener('touchend',   teHandler, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', tsHandler)
      canvas.removeEventListener('touchmove',  tmHandler)
      canvas.removeEventListener('touchend',   teHandler)
    }
  }, [])

  const captureBoard = () => {
    const canvas=canvasRef.current; if(!canvas) return
    onCapture?.(canvas.toDataURL('image/png'))
  }

  const exportPNG = () => {
    const canvas=canvasRef.current; if(!canvas) return
    const a=document.createElement('a'); a.download='pizarra-tactica.png'; a.href=canvas.toDataURL('image/png'); a.click()
  }

  const CurveIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 12 Q7 1 13 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/></svg>
  )
  const CurveArrowIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 12 Q7 1 13 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M10.5 4.5 L13 7 L10.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )

  const DRAW_TOOLS: { id: DrawTool; icon: React.ReactNode; label: string }[] = [
    {id:'freehand',   icon:<Pencil className="w-3.5 h-3.5"/>,    label:'Libre'},
    {id:'line',       icon:<Minus className="w-3.5 h-3.5"/>,     label:'Línea'},
    {id:'arrow',      icon:<ArrowRight className="w-3.5 h-3.5"/>,label:'Flecha'},
    {id:'curve',      icon:<CurveIcon/>,                          label:'Curva'},
    {id:'curvearrow', icon:<CurveArrowIcon/>,                     label:'Flecha curva'},
    {id:'circle',     icon:<Circle className="w-3.5 h-3.5"/>,    label:'Círculo'},
    {id:'rect',       icon:<Square className="w-3.5 h-3.5"/>,    label:'Rect.'},
    {id:'text',       icon:<Type className="w-3.5 h-3.5"/>,      label:'Texto'},
  ]

  const isOnPitch = (team: TeamId, n: number) => placedPlayers.some(p=>p.team===team&&p.number===n)
  const countOnPitch = (team: TeamId) => placedPlayers.filter(p=>p.team===team).length
  const cursorClass = (selPlayer||selAcc)?'cursor-cell':draggedTextIdx!==null?'cursor-grabbing':'cursor-crosshair'

  return (
    <div className="w-full bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="text-white font-semibold text-sm tracking-wide">Pizarra Táctica</h3>

      {/* Tabs móvil — ocultos en desktop */}
      <div className="lg:hidden flex gap-2 border-b border-gray-700">
        {(['left','canvas','right'] as const).map((p,i)=>(
          <button key={p} type="button" onClick={() => setMobilePanel(p)}
            className={`flex-1 px-2 py-2 text-xs font-semibold border-b-2 transition-colors ${mobilePanel === p ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>
            {['Herramientas','Campo','Controles'][i]}
          </button>
        ))}
      </div>

      {/* Layout: 3 columnas en desktop, 1 panel visible en móvil según tab */}
      <div className="flex gap-3 items-start">

        {/* LEFT */}
        <div className={`flex w-36 flex-shrink-0 flex-col gap-3 ${mobilePanel === 'left' ? '' : 'hidden'} lg:!flex`}>
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
                    <div className="flex flex-wrap gap-1 px-3 pb-3 pt-0.5">
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
            <div className="px-3 py-2 border-t border-white/5 flex flex-col gap-1.5">
              <button type="button"
                onClick={()=>{ setHighlightMode(m=>!m); setSelPlayer(null) }}
                className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${highlightMode?'bg-yellow-400/20 text-yellow-300 ring-1 ring-yellow-400/50':'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                <Zap className={`w-3 h-3 flex-shrink-0 ${highlightMode?'text-yellow-300':''}`}/>
                {highlightMode?'Resaltando…':'Resaltar jugadora'}
              </button>
              {highlightedPlayers.size>0&&(
                <button type="button"
                  onClick={()=>setHighlightedPlayers(new Set())}
                  className="flex items-center gap-1 text-[10px] text-yellow-400/60 hover:text-yellow-300 transition-colors">
                  <RotateCcw className="w-2.5 h-2.5"/> Quitar resaltados ({highlightedPlayers.size})
                </button>
              )}
              <button type="button" onClick={()=>setPlacedPlayers([])}
                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-red-400 transition-colors">
                <UserX className="w-3 h-3"/> Quitar todas del campo
              </button>
            </div>
          </div>

          <div className="bg-gray-900/60 rounded-xl overflow-hidden border border-white/5">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold px-3 pt-2.5 pb-2">Biblioteca de accesorios</p>
            <div className="flex flex-wrap gap-1.5 px-3 pb-3">
              {ACCESSORY_LIST.map(acc => {
                const isSel = selAcc?.type === acc.type
                return (
                  <button key={acc.type} type="button"
                    onClick={() => { setSelAcc(isSel ? null : { type: acc.type }); setSelPlayer(null); setBallMenuOpen(false); setGoalMenuOpen(false); setMushroomMenuOpen(false) }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${isSel ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-sm' : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'}`}>
                    {acc.label}
                  </button>
                )
              })}
              <button type="button"
                onClick={() => { setMushroomMenuOpen(v => !v); setGoalMenuOpen(false); setBallMenuOpen(false); setSelPlayer(null) }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${MUSHROOM_LIST.some(m => selAcc?.type === m.type) ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-sm' : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'}`}>
                Setas <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${mushroomMenuOpen ? 'rotate-180' : ''}`}/>
              </button>
              {mushroomMenuOpen && MUSHROOM_LIST.map(m => {
                const isSel = selAcc?.type === m.type
                return (
                  <button key={m.type} type="button"
                    onClick={() => { setSelAcc(isSel ? null : { type: m.type }); setMushroomMenuOpen(false) }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${isSel ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-sm' : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'}`}>
                    {m.label}
                  </button>
                )
              })}
              <button type="button"
                onClick={() => { setGoalMenuOpen(v => !v); setBallMenuOpen(false); setMushroomMenuOpen(false); setSelPlayer(null) }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${GOAL_LIST.some(g => selAcc?.type === g.type) ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-sm' : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'}`}>
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
              <button type="button"
                onClick={() => { setBallMenuOpen(v => !v); setGoalMenuOpen(false); setMushroomMenuOpen(false); setSelPlayer(null) }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${BALL_LIST.some(b => selAcc?.type === b.type) ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-sm' : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'}`}>
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
        </div>

        {/* CENTER — canvas único, siempre en DOM */}
        <div className={`flex flex-1 flex-col gap-3 min-w-0 ${mobilePanel === 'canvas' ? '' : 'hidden'} lg:!flex`} style={{touchAction:'none'}}>
          <canvas ref={canvasRef} width={900} height={600}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            onContextMenu={e=>{e.preventDefault();onMouseDown(e)}}
            className={`w-full h-auto rounded-lg border border-white/10 select-none ${seqPlaying ? 'cursor-default' : cursorClass}`}
            style={{touchAction:'none', aspectRatio:'3/2'}}/>

          {/* ── Panel de animación ─────────────────────────── */}
          {seqMode && (
            <div className="bg-gray-950/90 backdrop-blur-sm rounded-xl border border-purple-500/30 overflow-hidden">

              {/* ① Frame strip */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-purple-300 text-[10px] font-bold uppercase tracking-widest">
                    {isRecording ? '⏺ Grabando video…' : seqPlaying ? '▶ Reproduciendo…' : `Posición ${currentFrameIdx + 1} de ${animFrames.length}`}
                  </span>
                  <button onClick={exitSeqMode} disabled={seqPlaying || isRecording}
                    className="text-white/30 hover:text-white text-[10px] font-semibold transition-colors disabled:opacity-20">
                    Salir ✕
                  </button>
                </div>

                {/* Frame navigation */}
                <div className="flex items-center gap-1">
                  <button onClick={() => goToFrame(currentFrameIdx - 1, animFrames)}
                    disabled={currentFrameIdx <= 0 || seqPlaying}
                    className="w-7 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/10 text-white/50 hover:bg-white/20 disabled:opacity-20 transition-all">
                    <ChevronLeft className="w-4 h-4"/>
                  </button>

                  <div className="flex-1 flex gap-1 overflow-x-auto py-0.5">
                    {animFrames.map((f, i) => (
                      <button key={f.id}
                        onClick={() => !seqPlaying && goToFrame(i, animFrames)}
                        disabled={seqPlaying}
                        className={`flex-shrink-0 h-8 px-3 rounded-lg text-[11px] font-bold transition-all ${
                          i === currentFrameIdx
                            ? 'bg-purple-500 text-white ring-1 ring-purple-300/60 shadow-md'
                            : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white'
                        }`}>
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <button onClick={() => goToFrame(currentFrameIdx + 1, animFrames)}
                    disabled={currentFrameIdx >= animFrames.length - 1 || seqPlaying}
                    className="w-7 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/10 text-white/50 hover:bg-white/20 disabled:opacity-20 transition-all">
                    <ChevronRight className="w-4 h-4"/>
                  </button>
                </div>

                {/* Add / Delete frame */}
                <div className="flex gap-1.5">
                  <button onClick={addNextFrame} disabled={seqPlaying}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white/70 hover:text-white rounded-lg text-xs font-semibold transition-all">
                    <Plus className="w-3.5 h-3.5"/> Capturar posición
                  </button>
                  <button onClick={() => deleteFrame(currentFrameIdx)}
                    disabled={seqPlaying || animFrames.length <= 1}
                    className="w-9 flex items-center justify-center rounded-lg bg-red-500/20 hover:bg-red-500/40 disabled:opacity-20 text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>

                {!seqPlaying && !isRecording && (
                  <p className="text-white/25 text-[10px] text-center leading-relaxed">
                    Mueve jugadoras/balones en el campo · pulsa <span className="text-purple-300 font-semibold">Capturar posición</span> para añadir frame
                  </p>
                )}
              </div>

              <div className="h-px bg-white/8"/>

              {/* ② Playback & Export */}
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-white text-xs">
                  <span className="opacity-40 whitespace-nowrap">Velocidad</span>
                  <input type="range" min="0.5" max="4" step="0.5" value={seqDuration}
                    onChange={e => setSeqDuration(+e.target.value)}
                    className="flex-1 accent-purple-400 cursor-pointer"/>
                  <span className="opacity-60 w-8 text-right">{seqDuration}s/pos.</span>
                </div>

                <button onClick={() => seqPlaying ? stopSequence() : runSequence(false)}
                  disabled={animFrames.length < 2 || isRecording}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white/70 hover:text-white rounded-lg text-xs font-semibold transition-all">
                  {seqPlaying
                    ? <><RotateCcw className="w-3.5 h-3.5"/> Detener</>
                    : <><Play className="w-3.5 h-3.5"/> Previsualizar</>}
                </button>

                <button onClick={() => runSequence(true)}
                  disabled={animFrames.length < 2 || seqPlaying || isRecording}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white disabled:opacity-30 disabled:shadow-none">
                  {isRecording
                    ? <><span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block"/> Grabando…</>
                    : <><Download className="w-4 h-4"/> Grabar y Exportar Video</>}
                </button>
              </div>

            </div>
          )}

          {tool==='text'&&!selPlayer&&(
            <div className="flex gap-2">
              <input type="text" value={textInput} onChange={e=>setTextInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleAddText()}
                placeholder={textPos?'Escribe y pulsa Enter…':'Haz clic en el campo para posicionar…'}
                className="flex-1 bg-white/10 text-white text-xs rounded-lg px-3 py-2 border border-white/20 placeholder-white/40 focus:outline-none focus:border-rfpaf-blue"/>
              {textPos&&<button type="button" onClick={handleAddText} className="px-3 py-1.5 bg-rfpaf-blue text-white text-xs rounded-lg font-medium">Añadir</button>}
            </div>
          )}
          <p className="text-white/25 text-[10px] text-center">
            {selPlayer?`Colocando ${TEAMS[selPlayer.team].label} · Jugadora ${selPlayer.number} — clic en campo`:
              draggedTextIdx!==null?'Moviendo texto…':'Jugadoras y textos arrastrables · Clic derecho para quitar jugadora'}
          </p>
        </div>

        {/* RIGHT */}
        <div className={`flex w-36 flex-shrink-0 flex-col gap-3 ${mobilePanel === 'right' ? '' : 'hidden'} lg:!flex`}>
          <div className="bg-gray-900/50 rounded-xl p-3 space-y-2">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Tipo de campo</p>
            <div className="flex flex-col gap-1">
              {PITCH_OPTIONS.map(opt=>(
                <button key={opt.id} type="button" onClick={()=>setPitchType(opt.id)}
                  className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-left ${pitchType===opt.id?'bg-rfpaf-blue text-white shadow-sm':'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-3 space-y-2">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Herramientas de dibujo</p>
            <div className="flex flex-col gap-2">
              {(selPlayer || selAcc) && (
                <button type="button" onClick={() => { setSelPlayer(null); setSelAcc(null) }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/30 text-yellow-300 hover:bg-yellow-500/50 transition-all">
                  <UserX className="w-3.5 h-3.5"/> Cancelar
                </button>
              )}
              <div className="flex flex-wrap gap-1">
                {DRAW_TOOLS.map(t=>(
                  <button key={t.id} type="button" onClick={()=>{setTool(t.id);setSelPlayer(null);setSelAcc(null)}}
                    title={t.label}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all ${tool===t.id&&!selPlayer?'bg-rfpaf-blue text-white shadow-sm':'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}>
                    {t.icon}
                  </button>
                ))}
              </div>
              {/* Trazo */}
              <div className="space-y-1">
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Trazo</p>
                <input type="color" value={color} onChange={e=>setColor(e.target.value)}
                  className="w-full h-9 rounded-lg border-2 border-white/20 cursor-pointer bg-transparent"
                  style={{padding:'2px'}}/>
              </div>
              {/* Relleno */}
              <div className="space-y-1">
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Relleno</p>
                <input type="color" value={fillColor} onChange={e=>setFillColor(e.target.value)}
                  className="w-full h-9 rounded-lg border-2 border-white/20 cursor-pointer bg-transparent"
                  style={{padding:'2px'}}/>
              </div>
              {/* Grosor */}
              <div className="space-y-1">
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Grosor: {strokeWidth}</p>
                <input type="range" min={1} max={14} value={strokeWidth}
                  onChange={e=>setStrokeWidth(+e.target.value)}
                  className="w-full accent-rfpaf-blue cursor-pointer"/>
              </div>
              {/* Opacidad */}
              <div className="space-y-1">
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Opacidad: {shapeOpacity}%</p>
                <input type="range" min={10} max={100} step={5} value={shapeOpacity}
                  onChange={e=>setShapeOpacity(+e.target.value)}
                  className="w-full accent-rfpaf-blue cursor-pointer"/>
              </div>
              {/* Discontinua */}
              <button type="button" onClick={()=>setDashed(d=>!d)}
                className={`w-full flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${dashed?'bg-rfpaf-blue text-white shadow-sm':'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <line x1="1" y1="7" x2="4" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="6" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="11" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Discontinua</span>
              </button>
              <div className="flex gap-1">
                <button type="button" onClick={()=>setShapes(prev=>prev.slice(0,-1))} title="Deshacer"
                  className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all">
                  <Undo2 className="w-3.5 h-3.5"/>
                </button>
                <button type="button" onClick={()=>{setShapes([]);setPlacedPlayers([]);setPlacedAccessories([])}} title="Limpiar todo"
                  className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs bg-red-500/30 text-red-300 hover:bg-red-500/50 hover:text-white transition-all">
                  <Eraser className="w-3.5 h-3.5"/>
                </button>
              </div>
              <button type="button" onClick={() => seqMode ? exitSeqMode() : enterSeqMode()}
                className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all ${seqMode ? 'bg-purple-500 text-white shadow-lg ring-1 ring-purple-300/50' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}>
                <Clapperboard className="w-4 h-4"/> {seqMode ? 'Animando…' : 'Animar'}
              </button>
              <button type="button" onClick={exportPNG}
                className="w-full flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all">
                <Download className="w-3.5 h-3.5"/> PNG
              </button>
            </div>
          </div>

          {onCapture && (
            <button type="button" onClick={captureBoard}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600/80 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors">
              <Camera className="w-4 h-4"/> Captura
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
