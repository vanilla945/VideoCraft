import type { MediaAsset } from '../../shared/types'

interface DuplicateGroup {
  groupId: string
  assetIds: string[]
  bestAssetId: string
  reason: string
}

interface MediaGroup {
  label: string          // '人物特写' | '风景' | '产品' | ...
  assetIds: string[]
}

class MediaPoolService {
  findDuplicates(assets: MediaAsset[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = []
    const processed = new Set<string>()

    for (const a of assets) {
      if (processed.has(a.id)) continue

      // Find similar assets by file size and duration proximity
      const similar = assets.filter(b =>
        b.id !== a.id &&
        !processed.has(b.id) &&
        Math.abs(b.metadata.fileSize - a.metadata.fileSize) < 1024 * 1024 && // within 1MB
        Math.abs(b.metadata.duration - a.metadata.duration) < 3              // within 3 seconds
      )

      if (similar.length > 0) {
        const allIds = [a.id, ...similar.map(s => s.id)]
        allIds.forEach(id => processed.add(id))

        // Pick best: prefer higher bitrate and frame rate
        const all = [a, ...similar]
        const best = all.sort((x, y) =>
          (y.metadata.bitRate + y.metadata.frameRate * 1000) -
          (x.metadata.bitRate + x.metadata.frameRate * 1000)
        )[0]

        groups.push({
          groupId: `dup_${groups.length}`,
          assetIds: allIds,
          bestAssetId: best.id,
          reason: `画质最优: ${best.fileName} (${best.metadata.width}×${best.metadata.height}, ${(best.metadata.bitRate / 1000000).toFixed(1)}Mbps)`,
        })
      } else {
        processed.add(a.id)
      }
    }

    return groups
  }

  recommendBest(assets: MediaAsset[]): MediaAsset | null {
    if (assets.length === 0) return null
    return assets.sort((a, b) =>
      (b.metadata.bitRate + b.metadata.frameRate * 10000 + b.metadata.width * b.metadata.height / 100) -
      (a.metadata.bitRate + a.metadata.frameRate * 10000 + a.metadata.width * a.metadata.height / 100)
    )[0]
  }

  groupByCategory(assets: MediaAsset[], sceneLabels?: Map<string, string>): MediaGroup[] {
    const groupMap = new Map<string, string[]>()

    for (const asset of assets) {
      const label = sceneLabels?.get(asset.id) || '未分类'
      if (!groupMap.has(label)) groupMap.set(label, [])
      groupMap.get(label)!.push(asset.id)
    }

    return Array.from(groupMap.entries()).map(([label, assetIds]) => ({
      label,
      assetIds,
    }))
  }
}

export const mediaPoolService = new MediaPoolService()
