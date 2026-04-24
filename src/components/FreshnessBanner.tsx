type Props = {
  portfolioUpdatedAt: string
  marketUpdatedAt: string
}

export default function FreshnessBanner({
  portfolioUpdatedAt,
  marketUpdatedAt,
}: Props) {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Dernière mise à jour portefeuille</div>
          <div className="font-medium">{portfolioUpdatedAt}</div>
        </div>

        <div>
          <div className="text-gray-500">Dernière mise à jour marché</div>
          <div className="font-medium">{marketUpdatedAt}</div>
        </div>
      </div>
    </div>
  )
}