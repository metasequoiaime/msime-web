/** Shared text slots keep gallery cards aligned when names wrap or descriptions are absent. */
export function CatalogTitle({ name }: { name: string }) {
  return <h3 className="m-0 min-w-0 line-clamp-2 font-heading text-base leading-6 font-bold text-ink [overflow-wrap:anywhere] sm:min-h-12" title={name}>{name}</h3>;
}

export function CatalogDescription({ description }: { description: string }) {
  return <p className="m-0 mt-2 min-h-[3.4em] line-clamp-2 text-[13.5px] leading-[1.7] text-body [overflow-wrap:anywhere]" title={description || undefined}>{description}</p>;
}
