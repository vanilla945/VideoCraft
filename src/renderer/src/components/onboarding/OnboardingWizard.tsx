import { useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

const STEPS = [
  {
    title: '欢迎使用 VideoCraft',
    description: '一款 AI 驱动的视频剪辑桌面应用，专为视频编辑新手设计。',
    icon: '🎬'
  },
  {
    title: '导入素材',
    description: '点击工具栏的"导入媒体"按钮，选择你拍摄的视频文件。支持 MP4、MOV 等常见格式。',
    icon: '📁'
  },
  {
    title: 'AI 智能剪辑',
    description:
      '导入后，AI 会自动分析你的视频内容。选择剪辑模板和风格，AI 会生成完整的剪辑计划——包括片段选择、配文和配乐建议。',
    icon: '🤖'
  },
  {
    title: '手工调整',
    description:
      '你可以在时间轴上拖拽调整每个片段，编辑文字内容，更换背景音乐。完全掌控最终效果。',
    icon: '✂️'
  },
  {
    title: '一键导出',
    description: '确认无误后，点击"导出视频"即可生成最终的 MP4 文件。支持横屏和竖屏格式。',
    icon: '🚀'
  }
]

interface OnboardingWizardProps {
  open: boolean
  onClose: () => void
}

export function OnboardingWizard({ open, onClose }: OnboardingWizardProps): JSX.Element {
  const [step, setStep] = useState(0)

  const handleNext = (): void => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      onClose()
    }
  }

  const handleClose = (): void => {
    setStep(0)
    onClose()
  }

  const current = STEPS[step]

  return (
    <Dialog open={open} onClose={handleClose} title="快速上手">
      <div className="text-center py-4">
        <div className="text-5xl mb-4">{current.icon}</div>
        <h3 className="text-lg font-semibold text-white mb-2">{current.title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{current.description}</p>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-1.5 mt-4 mb-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? 'w-6 bg-blue-500' : i < step ? 'w-1.5 bg-blue-400/50' : 'w-1.5 bg-gray-600'
            }`}
          />
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          跳过引导
        </Button>
        <Button variant="primary" size="sm" onClick={handleNext}>
          {step < STEPS.length - 1 ? '下一步' : '开始使用'}
        </Button>
      </div>
    </Dialog>
  )
}
