import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { Resolution } from '../../shared/types'

interface TitleTemplate {
  id: string
  name: string
  htmlContent: string
  duration: number
  resolution: Resolution
}

const BUILTIN_TEMPLATES: TitleTemplate[] = [
  {
    id: 'standard',
    name: '标准片头',
    duration: 3,
    resolution: { width: 1920, height: 1080 },
    htmlContent: `<div style="width:1920px;height:1080px;background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;align-items:center;justify-content:center;font-family:sans-serif"><h1 style="color:#fff;font-size:64px;text-align:center;animation:fadeIn 1s ease-in">{{TITLE}}</h1><style>@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}</style></div>`,
  },
  {
    id: 'tech',
    name: '科技感',
    duration: 3,
    resolution: { width: 1920, height: 1080 },
    htmlContent: `<div style="width:1920px;height:1080px;background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-family:monospace"><h1 style="color:#00ff88;font-size:72px;text-shadow:0 0 20px #00ff8866;animation:glitch 0.5s infinite">{{TITLE}}</h1><style>@keyframes glitch{0%{transform:translate(0)}20%{transform:translate(-3px,3px)}40%{transform:translate(3px,-3px)}60%{transform:translate(-3px,-3px)}80%{transform:translate(3px,3px)}100%{transform:translate(0)}}</style></div>`,
  },
  {
    id: 'warm',
    name: '温馨',
    duration: 4,
    resolution: { width: 1920, height: 1080 },
    htmlContent: `<div style="width:1920px;height:1080px;background:linear-gradient(#fdf2e9,#fadbd8);display:flex;align-items:center;justify-content:center;font-family:serif"><h1 style="color:#333;font-size:56px;animation:gentle 1.5s ease-out">{{TITLE}}</h1><style>@keyframes gentle{from{opacity:0;letter-spacing:20px}to{opacity:1;letter-spacing:normal}}</style></div>`,
  },
  {
    id: 'minimal',
    name: '简约',
    duration: 2,
    resolution: { width: 1920, height: 1080 },
    htmlContent: `<div style="width:1920px;height:1080px;background:#fff;display:flex;align-items:center;justify-content:center;font-family:sans-serif"><h1 style="color:#111;font-size:48px;font-weight:300;animation:slide 0.8s ease-out">{{TITLE}}</h1><style>@keyframes slide{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}</style></div>`,
  },
  {
    id: 'bold',
    name: '大字标题',
    duration: 2.5,
    resolution: { width: 1920, height: 1080 },
    htmlContent: `<div style="width:1920px;height:1080px;background:#ff6b35;display:flex;align-items:center;justify-content:center;font-family:sans-serif"><h1 style="color:#fff;font-size:80px;font-weight:900;text-transform:uppercase;animation:popIn 0.6s cubic-bezier(0.68,-0.55,0.265,1.55)">{{TITLE}}</h1><style>@keyframes popIn{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}</style></div>`,
  },
]

class HTMLTitleRendererService {
  getTemplates(): TitleTemplate[] {
    return BUILTIN_TEMPLATES
  }

  getTemplate(id: string): TitleTemplate | undefined {
    return BUILTIN_TEMPLATES.find(t => t.id === id)
  }

  renderTitle(templateId: string, title: string, subtitle?: string): string {
    const template = this.getTemplate(templateId) || BUILTIN_TEMPLATES[0]
    let html = template.htmlContent.replace(/\{\{TITLE\}\}/g, title)
    if (subtitle) {
      html = html.replace('</h1>', `<br/><span style="font-size:32px;opacity:0.8">${subtitle}</span></h1>`)
    }
    return html
  }

  generateHTML(templateId: string, params: Record<string, string>): string {
    const template = this.getTemplate(templateId) || BUILTIN_TEMPLATES[0]
    let html = template.htmlContent
    for (const [key, value] of Object.entries(params)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    return html
  }
}

export const htmlTitleRenderer = new HTMLTitleRendererService()
