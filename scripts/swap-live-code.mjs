// Performs the talk's live code swap on the text of src/App.tsx, the way the presenter does it
// with Cmd+/: the active useCity block gets commented out and the commented one uncommented.

const RULER = /^\/\/ =+$/
const SECTION = /^\/\/ -+$/

/** Index of the first line at or after `from` that matches `pattern`. */
const indexFrom = (lines, from, pattern) => {
  const index = lines.findIndex((line, i) => i >= from && pattern.test(line))
  if (index < 0) throw new Error(`App.tsx: no line matching ${pattern} after line ${from + 1}`)
  return index
}

/** The lines between a banner's title and the next marker, as [start, end). */
const blockAfter = (lines, title, endMarker) => {
  const titleAt = lines.findIndex((line) => line.startsWith(title))
  if (titleAt < 0) throw new Error(`App.tsx: no "${title}" banner`)
  const start = indexFrom(lines, titleAt, RULER) + 1
  return [start, indexFrom(lines, start, endMarker)]
}

/** Comments every line, or uncomments every line if they all are comments already. Like Cmd+/. */
const toggle = (lines) => {
  const code = lines.filter((line) => line.trim() !== '')
  const isCommented = code.length > 0 && code.every((line) => line.startsWith('//'))
  return lines.map((line) => {
    if (line.trim() === '') return line
    return isCommented ? line.replace(/^\/\/ ?/, '') : `// ${line}`
  })
}

export function swapLiveCode(source) {
  const lines = source.split('\n')
  const [useEffectStart, useEffectEnd] = blockAfter(lines, '// USEEFFECT', RULER)
  const [effectStart, effectEnd] = blockAfter(lines, '// EFFECT', SECTION)
  return [
    ...lines.slice(0, useEffectStart),
    ...toggle(lines.slice(useEffectStart, useEffectEnd)),
    ...lines.slice(useEffectEnd, effectStart),
    ...toggle(lines.slice(effectStart, effectEnd)),
    ...lines.slice(effectEnd),
  ].join('\n')
}
