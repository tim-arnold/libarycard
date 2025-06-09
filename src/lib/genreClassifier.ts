/**
 * Genre Classification System
 * 
 * This module provides a curated approach to book genre classification,
 * taking the messy, verbose genres from Google Books and OpenLibrary
 * and mapping them to clean, meaningful categories.
 */

// Our curated list of meaningful, user-friendly genres
export const CURATED_GENRES = [
  // Fiction Genres
  'Fantasy',
  'Science Fiction',
  'Mystery & Crime',
  'Thriller & Suspense', 
  'Romance',
  'Horror',
  'Historical Fiction',
  'Literary Fiction',
  'Adventure',
  'Young Adult',
  'Children\'s',
  'Graphic Novel',
  'Dystopian',
  'Urban Fantasy',
  'Space Opera',
  'Cozy Mystery',
  'Psychological Thriller',
  'Paranormal Romance',
  
  // Non-Fiction Genres
  'Biography & Memoir',
  'History',
  'Science & Nature',
  'Technology',
  'Business & Economics',
  'Self-Help',
  'Health & Fitness',
  'Travel',
  'Cooking',
  'Art & Design',
  'Philosophy',
  'Religion & Spirituality',
  'Politics',
  'True Crime',
  'Essays',
  'Reference'
] as const

// Mapping patterns for Google Books categories (often too broad)
const GOOGLE_BOOKS_MAPPINGS: Record<string, string[]> = {
  // Science Fiction mappings - enhanced with common Google Books patterns
  'science fiction': ['Science Fiction'],
  'sci-fi': ['Science Fiction'],
  'space opera': ['Space Opera', 'Science Fiction'],
  'dystopian': ['Dystopian', 'Science Fiction'],
  'fiction / science fiction': ['Science Fiction'], // Google Books verbose format
  'science fiction / general': ['Science Fiction'],
  'science fiction / action': ['Science Fiction'],
  'science fiction / adventure': ['Science Fiction'],
  'science fiction / space opera': ['Space Opera', 'Science Fiction'],
  'science fiction / dystopian': ['Dystopian', 'Science Fiction'],
  'science fiction / time travel': ['Science Fiction'],
  'science fiction / cyberpunk': ['Science Fiction'],
  'science fiction / alien contact': ['Science Fiction'],
  
  // Fantasy mappings - enhanced with Google Books patterns
  'fantasy': ['Fantasy'],
  'urban fantasy': ['Urban Fantasy', 'Fantasy'],
  'epic fantasy': ['Fantasy'],
  'fiction / fantasy': ['Fantasy'], // Google Books verbose format
  'fantasy / general': ['Fantasy'],
  'fantasy / epic': ['Fantasy'],
  'fantasy / urban': ['Urban Fantasy', 'Fantasy'],
  'fantasy / contemporary': ['Urban Fantasy', 'Fantasy'],
  'fantasy / historical': ['Fantasy'],
  
  // Mystery & Crime - enhanced with Google Books patterns
  'mystery': ['Mystery & Crime'],
  'detective': ['Mystery & Crime'],
  'crime': ['Mystery & Crime'],
  'cozy mystery': ['Cozy Mystery', 'Mystery & Crime'],
  'true crime': ['True Crime'],
  'fiction / mystery': ['Mystery & Crime'], // Google Books verbose format
  'mystery / detective': ['Mystery & Crime'],
  'mystery / cozy': ['Cozy Mystery', 'Mystery & Crime'],
  'mystery / police procedural': ['Mystery & Crime'],
  'fiction / crime': ['Mystery & Crime'],
  
  // Thriller & Suspense - enhanced with Google Books patterns
  'thriller': ['Thriller & Suspense'],
  'suspense': ['Thriller & Suspense'],
  'psychological thriller': ['Psychological Thriller', 'Thriller & Suspense'],
  'fiction / thriller': ['Thriller & Suspense'], // Google Books verbose format
  'thriller / suspense': ['Thriller & Suspense'],
  'thriller / psychological': ['Psychological Thriller', 'Thriller & Suspense'],
  'fiction / suspense': ['Thriller & Suspense'],
  
  // Romance - enhanced with Google Books patterns
  'romance': ['Romance'],
  'paranormal romance': ['Paranormal Romance', 'Romance'],
  'fiction / romance': ['Romance'], // Google Books verbose format
  'romance / contemporary': ['Romance'],
  'romance / historical': ['Romance'],
  'romance / paranormal': ['Paranormal Romance', 'Romance'],
  'romance / fantasy': ['Paranormal Romance', 'Romance'],
  
  // Other Fiction - enhanced with Google Books patterns
  'horror': ['Horror'],
  'fiction / horror': ['Horror'], // Google Books verbose format
  'historical fiction': ['Historical Fiction'],
  'historical': ['Historical Fiction'],
  'fiction / historical': ['Historical Fiction'],
  'literary fiction': ['Literary Fiction'],
  'fiction / literary': ['Literary Fiction'],
  'adventure': ['Adventure'],
  'fiction / action': ['Adventure'],
  'fiction / adventure': ['Adventure'],
  'young adult': ['Young Adult'],
  'juvenile fiction': ['Young Adult'],
  'fiction / young adult': ['Young Adult'],
  'children': ['Children\'s'],
  'juvenile literature': ['Children\'s'],
  'fiction / children': ['Children\'s'],
  'graphic novel': ['Graphic Novel'],
  'comics': ['Graphic Novel'],
  'fiction / graphic novels': ['Graphic Novel'],
  
  // Non-Fiction
  'biography': ['Biography & Memoir'],
  'memoir': ['Biography & Memoir'],
  'autobiography': ['Biography & Memoir'],
  'history': ['History'],
  'science': ['Science & Nature'],
  'nature': ['Science & Nature'],
  'technology': ['Technology'],
  'business': ['Business & Economics'],
  'economics': ['Business & Economics'],
  'self-help': ['Self-Help'],
  'health': ['Health & Fitness'],
  'fitness': ['Health & Fitness'],
  'travel': ['Travel'],
  'cooking': ['Cooking'],
  'art': ['Art & Design'],
  'design': ['Art & Design'],
  'philosophy': ['Philosophy'],
  'religion': ['Religion & Spirituality'],
  'spirituality': ['Religion & Spirituality'],
  'politics': ['Politics'],
  'essays': ['Essays'],
  'reference': ['Reference']
}

// Mapping patterns for OpenLibrary subjects (often too granular)
const OPENLIBRARY_MAPPINGS: Record<string, string[]> = {
  // Popular specific terms that should map to broader genres
  'dragons': ['Fantasy'],
  'magic': ['Fantasy'],
  'wizards': ['Fantasy'],
  'elves': ['Fantasy'],
  'space travel': ['Science Fiction'],
  'robots': ['Science Fiction'],
  'artificial intelligence': ['Science Fiction'],
  'time travel': ['Science Fiction'],
  'murder': ['Mystery & Crime'],
  'detective stories': ['Mystery & Crime'],
  'serial killers': ['True Crime'],
  'love stories': ['Romance'],
  'vampires': ['Paranormal Romance', 'Horror'],
  'werewolves': ['Paranormal Romance', 'Horror'],
  'zombies': ['Horror'],
  'ghosts': ['Horror'],
  'world war': ['History'],
  'biography': ['Biography & Memoir'],
  'cookbooks': ['Cooking'],
  'photography': ['Art & Design'],
  'meditation': ['Religion & Spirituality'],
  'entrepreneurship': ['Business & Economics'],
  'startups': ['Business & Economics']
}

/**
 * Classifies genres from Google Books categories and OpenLibrary subjects
 * into our curated genre list
 */
export function classifyGenres(
  googleCategories?: string[],
  openLibrarySubjects?: string[],
  debug?: boolean
): string[] {
  const genres = new Set<string>()
  const debugInfo: { input: string; matches: string[]; source: string }[] = []
  
  // Process Google Books categories
  if (googleCategories) {
    for (const category of googleCategories) {
      // Split comma-separated categories (Google Books sometimes does this)
      const categoryParts = category.split(',').map(part => part.trim())
      
      for (const categoryPart of categoryParts) {
        const normalizedCategory = categoryPart.toLowerCase()
        const matches: string[] = []
        
        // Check each mapping pattern
        for (const [pattern, mappedGenres] of Object.entries(GOOGLE_BOOKS_MAPPINGS)) {
          if (normalizedCategory.includes(pattern)) {
            mappedGenres.forEach(genre => {
              genres.add(genre)
              matches.push(genre)
            })
          }
        }
        
        if (debug && matches.length > 0) {
          debugInfo.push({
            input: categoryPart,
            matches,
            source: 'Google Books'
          })
        }
      }
    }
  }
  
  // Process OpenLibrary subjects (be more selective to avoid noise)
  if (openLibrarySubjects) {
    for (const subject of openLibrarySubjects) {
      const normalizedSubject = subject.toLowerCase()
      const matches: string[] = []
      
      // Check each mapping pattern
      for (const [pattern, mappedGenres] of Object.entries(OPENLIBRARY_MAPPINGS)) {
        if (normalizedSubject.includes(pattern)) {
          mappedGenres.forEach(genre => {
            genres.add(genre)
            matches.push(genre)
          })
        }
      }
      
      if (debug) {
        debugInfo.push({
          input: subject,
          matches,
          source: 'OpenLibrary'
        })
      }
    }
  }
  
  // Convert Set back to Array and sort
  const result = Array.from(genres).sort()
  
  if (debug) {
    console.log('🎭 Genre Classification Debug:', {
      googleCategories,
      openLibrarySubjects,
      debugInfo,
      finalGenres: result
    })
  }
  
  // Limit to max 5 genres to avoid overwhelming users
  return result.slice(0, 5)
}

/**
 * Get a primary genre (most important/relevant) from classified genres
 */
export function getPrimaryGenre(classifiedGenres: string[]): string | null {
  if (classifiedGenres.length === 0) return null
  
  // Priority order for primary genre selection
  const priorityOrder = [
    'Science Fiction',
    'Fantasy', 
    'Mystery & Crime',
    'Thriller & Suspense',
    'Romance',
    'Horror',
    'Historical Fiction',
    'Young Adult',
    'Biography & Memoir',
    'History'
  ]
  
  // Find the first genre that matches our priority order
  for (const priority of priorityOrder) {
    if (classifiedGenres.includes(priority)) {
      return priority
    }
  }
  
  // If no priority match, return the first classified genre
  return classifiedGenres[0]
}

/**
 * Example usage and testing function
 */
export function testGenreClassification() {
  // Test Google Books verbose categories (with debug)
  console.log('🧪 Testing Google Books verbose patterns:')
  const googleTest = classifyGenres([
    'Fiction / Science Fiction / General',
    'Fiction / Science Fiction / Action & Adventure',
    'Fiction, science fiction, space opera',
    'Fiction / Fantasy / Epic'
  ], undefined, true)
  console.log('Result:', googleTest)
  
  // Test comma-separated categories
  console.log('\n🧪 Testing comma-separated categories:')
  const commaTest = classifyGenres([
    'Fiction, science fiction, action & adventure',
    'Romance, paranormal romance, fantasy'
  ], undefined, true)
  console.log('Result:', commaTest)
  
  // Test OpenLibrary subjects
  console.log('\n🧪 Testing OpenLibrary subjects:')
  const openLibraryTest = classifyGenres(undefined, [
    'Dragons', 'Magic', 'Fantasy literature', 'Epic fantasy',
    'Swords and sorcery', 'Medieval times', 'Wizards'
  ], true)
  console.log('Result:', openLibraryTest)
  
  // Test combined
  console.log('\n🧪 Testing combined sources:')
  const combinedTest = classifyGenres(
    ['Fiction / Romance / Paranormal'],
    ['Vampires', 'Love stories', 'Supernatural']
  , true)
  console.log('Result:', combinedTest)
}