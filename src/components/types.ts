export type Status = 'idle' | 'loading' | 'failed'
export type Impl = 'useEffect' | 'Effect'
/** Every implementation a card can show. Only the Search race has the Atom version. */
export type CardImpl = Impl | 'Atom'
