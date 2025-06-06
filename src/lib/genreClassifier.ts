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
  // Science Fiction mappings
  'science fiction': ['Science Fiction'],
  'sci-fi': ['Science Fiction'],
  'space opera': ['Space Opera', 'Science Fiction'],
  'dystopian': ['Dystopian', 'Science Fiction'],
  
  // Fantasy mappings
  'fantasy': ['Fantasy'],
  'urban fantasy': ['Urban Fantasy', 'Fantasy'],
  'epic fantasy': ['Fantasy'],
  
  // Mystery & Crime
  'mystery': ['Mystery & Crime'],
  'detective': ['Mystery & Crime'],
  'crime': ['Mystery & Crime'],
  'cozy mystery': ['Cozy Mystery', 'Mystery & Crime'],
  'true crime': ['True Crime'],
  
  // Thriller & Suspense
  'thriller': ['Thriller & Suspense'],
  'suspense': ['Thriller & Suspense'],
  'psychological thriller': ['Psychological Thriller', 'Thriller & Suspense'],
  
  // Romance
  'romance': ['Romance'],
  'paranormal romance': ['Paranormal Romance', 'Romance'],
  
  // Other Fiction
  'horror': ['Horror'],
  'historical fiction': ['Historical Fiction'],
  'historical': ['Historical Fiction'],
  'literary fiction': ['Literary Fiction'],
  'adventure': ['Adventure'],
  'young adult': ['Young Adult'],
  'children': ['Children\'s'],
  'graphic novel': ['Graphic Novel'],
  'comics': ['Graphic Novel'],
  
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
  openLibrarySubjects?: string[]
): string[] {
  const genres = new Set<string>()
  
  // Process Google Books categories
  if (googleCategories) {
    for (const category of googleCategories) {
      const normalizedCategory = category.toLowerCase()
      
      // Check each mapping pattern
      for (const [pattern, mappedGenres] of Object.entries(GOOGLE_BOOKS_MAPPINGS)) {
        if (normalizedCategory.includes(pattern)) {
          mappedGenres.forEach(genre => genres.add(genre))
        }
      }
    }
  }
  
  // Process OpenLibrary subjects (be more selective to avoid noise)
  if (openLibrarySubjects) {
    for (const subject of openLibrarySubjects) {
      const normalizedSubject = subject.toLowerCase()
      
      // Check each mapping pattern
      for (const [pattern, mappedGenres] of Object.entries(OPENLIBRARY_MAPPINGS)) {
        if (normalizedSubject.includes(pattern)) {
          mappedGenres.forEach(genre => genres.add(genre))
        }
      }
    }
  }
  
  // Convert Set back to Array and sort
  const result = Array.from(genres).sort()
  
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
  // Test Google Books verbose categories
  const googleTest = classifyGenres([
    'Fiction, science fiction, action & adventure',
    'Fiction, science fiction, general'
  ])
  console.log('Google Books test:', googleTest)
  
  // Test OpenLibrary subjects
  const openLibraryTest = classifyGenres(undefined, [
    'Dragons', 'Magic', 'Fantasy literature', 'Epic fantasy',
    'Swords and sorcery', 'Medieval times', 'Wizards'
  ])
  console.log('OpenLibrary test:', openLibraryTest)
  
  // Test combined
  const combinedTest = classifyGenres(
    ['Fiction, romance, paranormal'],
    ['Vampires', 'Love stories', 'Supernatural']
  )
  console.log('Combined test:', combinedTest)
}