import type { Book } from '@/components/ISBNScanner'

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'

export async function fetchBookData(isbn: string): Promise<Book | null> {
  try {
    const response = await fetch(`${GOOGLE_BOOKS_API}?q=isbn:${isbn}`)
    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      return null
    }

    const bookInfo = data.items[0].volumeInfo

    const book: Book = {
      id: `${isbn}-${Date.now()}`,
      isbn,
      title: bookInfo.title || 'Unknown Title',
      authors: bookInfo.authors || ['Unknown Author'],
      description: bookInfo.description,
      thumbnail: bookInfo.imageLinks?.thumbnail || bookInfo.imageLinks?.smallThumbnail,
      publishedDate: bookInfo.publishedDate,
      categories: bookInfo.categories
    }

    return book
  } catch (error) {
    console.error('Error fetching book data:', error)
    
    try {
      const openLibraryResponse = await fetch(`https://openlibrary.org/isbn/${isbn}.json`)
      const openLibraryData = await openLibraryResponse.json()
      
      if (openLibraryData.title) {
        const book: Book = {
          id: `${isbn}-${Date.now()}`,
          isbn,
          title: openLibraryData.title,
          authors: openLibraryData.authors?.map((author: any) => author.name) || ['Unknown Author'],
          description: openLibraryData.description?.value || openLibraryData.description,
          publishedDate: openLibraryData.publish_date,
          categories: openLibraryData.subjects?.slice(0, 3)
        }
        
        if (openLibraryData.covers && openLibraryData.covers[0]) {
          book.thumbnail = `https://covers.openlibrary.org/b/id/${openLibraryData.covers[0]}-M.jpg`
        }
        
        return book
      }
    } catch (openLibraryError) {
      console.error('OpenLibrary fallback failed:', openLibraryError)
    }
    
    return null
  }
}