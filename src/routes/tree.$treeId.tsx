import { useEffect, useMemo } from 'react'
import { createRoute, Outlet } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useTrees } from '@/hooks/useTreesApi'
import { setPartitionKey } from '@/services/flaskService'
import { resolveShortId } from '@/utils/shortId'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tree/$treeId',
  component: TreeLayout,
})

function TreeLayout() {
  const { treeId: shortId } = Route.useParams()
  const { data: treesData } = useTrees()

  const allTreeIds = useMemo(
    () => treesData?.trees.map((t) => t.tree_id) ?? [],
    [treesData],
  )
  const tree = useMemo(() => {
    const realId = resolveShortId(shortId, allTreeIds)
    return treesData?.trees.find((t) => t.tree_id === realId)
  }, [shortId, allTreeIds, treesData])

  useEffect(() => {
    if (tree?.partition_key) {
      setPartitionKey(tree.partition_key)
    }
  }, [tree?.partition_key])

  return <Outlet />
}
