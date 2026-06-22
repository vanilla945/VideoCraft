import { MediaBrowser } from '../media/MediaBrowser'

export function Sidebar(): JSX.Element {
  return (
    <aside className="w-64 bg-gray-850 border-r border-gray-700 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">素材库</h2>
      </div>
      <MediaBrowser />
    </aside>
  )
}
