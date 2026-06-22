import { useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import type { ProjectConfig } from '@shared/types'

interface ProjectSettingsProps {
  onClose: () => void
  onCreate: (config: ProjectConfig) => Promise<void>
}

export function ProjectSettingsDialog({ onClose, onCreate }: ProjectSettingsProps): JSX.Element {
  const [name, setName] = useState('未命名项目')
  const [width, setWidth] = useState(1920)
  const [height, setHeight] = useState(1080)
  const [frameRate, setFrameRate] = useState(30)

  const handleCreate = async (): Promise<void> => {
    await onCreate({
      name,
      resolution: { width, height },
      frameRate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  return (
    <Dialog open={true} onClose={onClose} title="新建项目">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">项目名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">分辨率</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-gray-500">×</span>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">帧率</label>
            <select
              value={frameRate}
              onChange={(e) => setFrameRate(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value={24}>24 fps</option>
              <option value={25}>25 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleCreate}>创建项目</Button>
        </div>
      </div>
    </Dialog>
  )
}
