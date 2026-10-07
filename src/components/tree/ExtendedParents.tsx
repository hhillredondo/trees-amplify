import { Fragment, type ReactNode } from 'react'
import ErrorMessage from '@/components/ErrorMessage'
import { useDirectRelationsOfMany } from '@/hooks/useTreesApi'
import type { Member } from '@/types'
import { byBirthDate } from '@/utils/dateOnly'
import MemberCard from './MemberCard'

interface Props {
  readonly partitionKey: string
  readonly parents: Member[]
  readonly onFocus: (memberId: string) => void
  readonly onViewDetails: (memberId: string) => void
}

interface Lineage {
  readonly parent: Member
  readonly grandparents: Member[]
  readonly auntsUncles: Member[]
}

type Side = 'left' | 'right'
type RenderCard = (member: Member) => ReactNode

const LINE = 'border-[var(--color-border)]'

// Columns: aunts/uncles | grandparent | couple line | grandparent above parent | parents line | mirrored.
// Card columns are fixed at MemberCard's min width so the grid stays symmetric about the page centre
// whatever is missing on either side.
const TWO_PARENT_GRID =
  'grid items-center grid-cols-[minmax(0,1fr)_15rem_4.5rem_15rem_4.5rem_15rem_4.5rem_15rem_minmax(0,1fr)]'

const PLACEMENT = {
  left: {
    pair: ['col-start-2', 'col-start-4'],
    coupleLine: 'col-start-3',
    parent: 'col-start-4',
    elbowTop: 'ml-auto border-l-2',
    elbowBottom: 'self-start',
    auntsUncles: 'col-start-1 col-span-3',
  },
  right: {
    pair: ['col-start-6', 'col-start-8'],
    coupleLine: 'col-start-7',
    parent: 'col-start-6',
    elbowTop: 'border-r-2',
    elbowBottom: 'self-end',
    auntsUncles: 'col-start-7 col-span-3',
  },
} as const

export default function ExtendedParents({
  partitionKey,
  parents,
  onFocus,
  onViewDetails,
}: Props) {
  const results = useDirectRelationsOfMany(
    partitionKey,
    parents.map((p) => p.id),
  )
  const failed = results.filter((r) => r.isError)

  const lineages: Lineage[] = parents.map((parent, i) => ({
    parent,
    grandparents: results[i].data?.parents ?? [],
    auntsUncles: [...(results[i].data?.siblings ?? [])].sort(byBirthDate),
  }))

  const card: RenderCard = (member) => (
    <MemberCard
      member={member}
      onClick={() => onFocus(member.id)}
      onViewDetails={() => onViewDetails(member.id)}
    />
  )

  return (
    <>
      {failed.length > 0 && (
        <div className="w-full max-w-[28rem] mb-6">
          <ErrorMessage
            title="Couldn't load grandparents and aunts/uncles"
            message={failed[0].error?.message ?? 'Request failed'}
            onRetry={() => failed.forEach((r) => r.refetch())}
          />
        </div>
      )}
      {lineages.length === 2 ? (
        <div className={`w-full ${TWO_PARENT_GRID}`}>
          <LineageCells lineage={lineages[0]} side="left" card={card} />
          <LineageCells lineage={lineages[1]} side="right" card={card} />
          <div className={`col-start-5 row-start-3 mx-3 border-t-2 border-dashed ${LINE}`} />
          <Connector className="col-start-5 row-start-4" />
        </div>
      ) : (
        <SingleLineage lineage={lineages[0]} card={card} />
      )}
    </>
  )
}

function LineageCells({
  lineage,
  side,
  card,
}: {
  readonly lineage: Lineage
  readonly side: Side
  readonly card: RenderCard
}) {
  const place = PLACEMENT[side]
  const { parent, grandparents, auntsUncles } = lineage

  return (
    <>
      {grandparents.length === 2 && (
        <>
          <div className={`${place.pair[0]} row-start-1`}>
            {card(grandparents[0])}
          </div>
          <div className={`${place.coupleLine} row-start-1 mx-3 border-t-2 border-dashed ${LINE}`} />
          <div className={`${place.pair[1]} row-start-1`}>
            {card(grandparents[1])}
          </div>
          {/* Elbow from the middle of the couple line to the centre of the parent below */}
          <div
            className={`${place.coupleLine} row-start-2 self-start mt-3 w-1/2 h-5 border-b-2 ${place.elbowTop} ${LINE}`}
          />
          <div className={`${place.parent} row-start-2 my-3 flex flex-col items-center`}>
            <div className={`${place.elbowBottom} w-1/2 h-5 border-b-2 ${LINE}`} />
            <div className="w-0.5 h-5 bg-[var(--color-border)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-border)]" />
          </div>
        </>
      )}
      {grandparents.length === 1 && (
        <>
          <div className={`${place.parent} row-start-1`}>
            {card(grandparents[0])}
          </div>
          <Connector className={`${place.parent} row-start-2`} />
        </>
      )}
      <div className={`${place.parent} row-start-3`}>{card(parent)}</div>
      <AuntsUncles
        members={auntsUncles}
        side={side}
        card={card}
        className={`${place.auntsUncles} row-start-3`}
      />
    </>
  )
}

function SingleLineage({
  lineage,
  card,
}: {
  readonly lineage: Lineage
  readonly card: RenderCard
}) {
  const { parent, grandparents, auntsUncles } = lineage

  return (
    <>
      {grandparents.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            {grandparents.map((grandparent, i) => (
              <Fragment key={grandparent.id}>
                {i > 0 && <div className={`w-12 border-t-2 border-dashed ${LINE}`} />}
                {card(grandparent)}
              </Fragment>
            ))}
          </div>
          <Connector />
        </>
      )}
      <div className="w-full grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
        <AuntsUncles members={auntsUncles} side="left" card={card} />
        {card(parent)}
      </div>
      <Connector />
    </>
  )
}

function AuntsUncles({
  members,
  side,
  card,
  className = '',
}: {
  readonly members: Member[]
  readonly side: Side
  readonly card: RenderCard
  readonly className?: string
}) {
  const isLeft = side === 'left'

  // rtl on the left side makes the scroll start next to the parent, not at the far end
  return (
    <div
      className={`overflow-x-auto spouse-scroll-container ${className}`}
      style={isLeft ? { direction: 'rtl' } : undefined}
    >
      <div className="flex gap-4 min-w-max" style={isLeft ? { direction: 'ltr' } : undefined}>
        {members.map((member) => (
          <div
            key={member.id}
            className={`flex items-center gap-4 ${isLeft ? '' : 'flex-row-reverse'}`}
          >
            {card(member)}
            <div className={`w-10 border-t-2 border-dashed ${LINE}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Connector({ className = '' }: { readonly className?: string }) {
  return (
    <div className={`flex flex-col items-center my-3 ${className}`}>
      <div className="w-0.5 h-10 bg-[var(--color-border)]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-border)]" />
    </div>
  )
}
