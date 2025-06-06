import type { Book, EnhancedBook } from '@/lib/types'
import { classifyGenres } from '@/lib/genreClassifier'

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

export async function fetchEnhancedBookData(isbn: string): Promise<EnhancedBook | null> {
  try {
    // First get basic data from Google Books
    const googleResponse = await fetch(`${GOOGLE_BOOKS_API}?q=isbn:${isbn}`)
    const googleData = await googleResponse.json()

    if (!googleData.items || googleData.items.length === 0) {
      return null
    }

    const bookInfo = googleData.items[0].volumeInfo

    // Create base book object from Google Books
    const enhancedBook: EnhancedBook = {
      id: `${isbn}-${Date.now()}`,
      isbn,
      title: bookInfo.title || 'Unknown Title',
      authors: bookInfo.authors || ['Unknown Author'],
      description: bookInfo.description,
      thumbnail: bookInfo.imageLinks?.thumbnail || bookInfo.imageLinks?.smallThumbnail,
      publishedDate: bookInfo.publishedDate,
      categories: bookInfo.categories,
      publisherInfo: bookInfo.publisher,
      pageCount: bookInfo.pageCount,
      averageRating: bookInfo.averageRating,
      ratingsCount: bookInfo.ratingsCount
    }

    // Try to enhance with OpenLibrary data
    try {
      // Search OpenLibrary for the book
      const searchResponse = await fetch(`https://openlibrary.org/search.json?isbn=${isbn}&limit=1`)
      const searchData = await searchResponse.json()
      
      if (searchData.docs && searchData.docs.length > 0) {
        const olDoc = searchData.docs[0]
        const workKey = olDoc.key
        
        if (workKey) {
          enhancedBook.openLibraryKey = workKey
          
          // Get detailed work information
          const workResponse = await fetch(`https://openlibrary.org${workKey}.json`)
          const workData = await workResponse.json()
          
          if (workData.subjects) {
            // Store raw subjects for reference
            enhancedBook.subjects = workData.subjects
            
            // Use our curated genre classification system
            const classifiedGenres = classifyGenres(
              enhancedBook.categories, // Google Books categories
              workData.subjects        // OpenLibrary subjects
            )
            
            if (classifiedGenres.length > 0) {
              enhancedBook.enhancedGenres = classifiedGenres
            }
            
            // Extract series information
            const seriesSubjects = workData.subjects.filter((subject: string) => 
              subject.toLowerCase().startsWith('series:')
            )
            
            if (seriesSubjects.length > 0) {
              const seriesInfo = seriesSubjects[0].replace(/^series:\s*/i, '')
              enhancedBook.series = seriesInfo
            }
          }
          
          // Use OpenLibrary description if it's more detailed
          if (workData.description) {
            const olDescription = typeof workData.description === 'string' 
              ? workData.description 
              : workData.description.value
            
            if (olDescription && olDescription.length > (enhancedBook.description?.length || 0)) {
              enhancedBook.extendedDescription = olDescription
            }
          }
        }
      }
    } catch (olError) {
      console.log('OpenLibrary enhancement failed, using Google Books data only:', olError)
    }

    // If we don't have enhanced genres yet, try to classify from Google Books categories alone
    if (!enhancedBook.enhancedGenres && enhancedBook.categories) {
      const classifiedGenres = classifyGenres(enhancedBook.categories)
      if (classifiedGenres.length > 0) {
        enhancedBook.enhancedGenres = classifiedGenres
      }
    }

    return enhancedBook
  } catch (error) {
    console.error('Error fetching enhanced book data:', error)
    return null
  }
}

export async function fetchEnhancedBookFromSearch(googleBookItem: any): Promise<EnhancedBook | null> {
  const isbn = googleBookItem.volumeInfo.industryIdentifiers?.find(
    (id: any) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
  )?.identifier

  if (isbn) {
    return await fetchEnhancedBookData(isbn)
  }

  // Fallback to basic Google Books data if no ISBN
  const enhancedBook: EnhancedBook = {
    id: googleBookItem.id,
    isbn: googleBookItem.id, // Use Google Books ID as fallback
    title: googleBookItem.volumeInfo.title,
    authors: googleBookItem.volumeInfo.authors || ['Unknown Author'],
    description: googleBookItem.volumeInfo.description,
    thumbnail: googleBookItem.volumeInfo.imageLinks?.thumbnail,
    publishedDate: googleBookItem.volumeInfo.publishedDate,
    categories: googleBookItem.volumeInfo.categories,
    publisherInfo: googleBookItem.volumeInfo.publisher,
    pageCount: googleBookItem.volumeInfo.pageCount,
    averageRating: googleBookItem.volumeInfo.averageRating,
    ratingsCount: googleBookItem.volumeInfo.ratingsCount
  }

  // Apply genre classification to the fallback data too
  if (enhancedBook.categories) {
    const classifiedGenres = classifyGenres(enhancedBook.categories)
    if (classifiedGenres.length > 0) {
      enhancedBook.enhancedGenres = classifiedGenres
    }
  }

  return enhancedBook
}