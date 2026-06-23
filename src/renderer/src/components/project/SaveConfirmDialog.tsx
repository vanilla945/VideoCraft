import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

interface SaveConfirmDialogProps {
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function SaveConfirmDialog({ onSave, onDiscard, onCancel }: SaveConfirmDialogProps): JSX.Element {
  return (
    <Dialog open={true} onClose={onCancel} title="保存当前项目？">
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          当前项目有未保存的更改。是否保存后再创建新项目？
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>取消</Button>
          <Button variant="secondary" onClick={onDiscard}>不保存</Button>
          <Button variant="primary" onClick={onSave}>保存并继续</Button>
        </div>
      </div>
    </Dialog>
  )
}
