type DocHeaderImageProps = {
  src: string
  height: number
  fit: 'contain' | 'cover'
}

/** Cover image shown above the document, in the preview and in the PDF. */
export function DocHeaderImage({ src, height, fit }: DocHeaderImageProps) {
  return (
    <img
      alt=''
      className='doc-header-image'
      src={src}
      style={{ height, objectFit: fit }}
    />
  )
}
