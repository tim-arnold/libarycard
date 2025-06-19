# Enhanced Book Features Specification

**Version**: 1.0  
**Created**: June 19, 2025  
**Status**: Planning  
**Priority**: High  

## Executive Summary

This specification outlines the implementation of multi-select book selection and star rating features for LibraryCard. The goal is to transform the current "one book at a time" workflow into an efficient "select multiple, add in bulk" system while maintaining backward compatibility and adding location-scoped rating capabilities.

## 🎯 Core Objectives

1. **Multi-Select Capability**: Enable users to select multiple books across all input methods (search, ISBN scanning)
2. **Bulk Operations**: Provide efficient bulk addition with shared shelf/tag selection
3. **Star Rating System**: Implement location-scoped rating system for book discovery
4. **Seamless UX**: Maintain existing single-book workflow while adding bulk capabilities

## 🏗️ System Architecture

### 1. Shopping Cart State Management

#### BookSelectionContext Interface
```typescript
interface SelectedBook {
  key: string                    // Unique identifier (ISBN or title)
  book: EnhancedBook            // Full book data
  source: 'search' | 'isbn' // Source of selection
  timestamp: number             // Selection timestamp
  tempId?: string              // Temporary ID for books without ISBN
}

interface SelectionState {
  selectedBooks: Map<string, SelectedBook>  // Selected books by key
  isSelectionMode: boolean                  // Bulk selection mode active
  bulkShelfId: number | null               // Shared shelf for bulk add
  bulkTags: string                         // Shared tags for bulk add
  maxSelections: number                    // Limit (default 50)
}

interface SelectionActions {
  toggleSelectionMode(): void
  addToSelection(book: EnhancedBook, source: string): void
  removeFromSelection(key: string): void
  clearSelections(): void
  setBulkShelf(shelfId: number): void
  setBulkTags(tags: string): void
  bulkAddBooks(): Promise<BulkAddResult>
}
```

#### Context Provider Implementation
```typescript
// BookSelectionProvider.tsx
export const BookSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SelectionState>(initialState)
  
  // State persistence with consent-aware storage
  useEffect(() => {
    const savedState = getStorageItem('bookSelections', 'functional')
    if (savedState) {
      setState(JSON.parse(savedState))
    }
  }, [])
  
  // Auto-save state changes
  useEffect(() => {
    setStorageItem('bookSelections', JSON.stringify(state), 'functional')
  }, [state])
  
  const actions: SelectionActions = {
    // Implementation details...
  }
  
  return (
    <BookSelectionContext.Provider value={{ state, actions }}>
      {children}
    </BookSelectionContext.Provider>
  )
}
```

### 2. UI Component Architecture

#### Selection Mode Components
```typescript
// SelectionModeToggle.tsx
interface SelectionModeToggleProps {
  isActive: boolean
  selectedCount: number
  onToggle: () => void
}

// CartIndicator.tsx
interface CartIndicatorProps {
  selectedCount: number
  onCartClick: () => void
  isVisible: boolean
}

// BookCardSelection.tsx
interface BookCardSelectionProps {
  book: EnhancedBook
  source: 'search' | 'isbn'
  isSelected: boolean
  isSelectionMode: boolean
  onSelect: (book: EnhancedBook) => void
  onDeselect: (key: string) => void
}

// BulkReviewModal.tsx
interface BulkReviewModalProps {
  isOpen: boolean
  selectedBooks: SelectedBook[]
  onClose: () => void
  onBulkAdd: () => Promise<void>
  onRemoveBook: (key: string) => void
}
```

#### Integration Points
- **BookSearch.tsx**: Add selection checkboxes to search result cards
- **ISBNScanner.tsx**: Add selection option to scanned book preview
- **AddBooks.tsx**: Add cart indicator and selection mode toggle
- **Header**: Add global cart indicator with count

### 3. Bulk Operations API

#### Backend Endpoint Design
```typescript
// POST /api/books/bulk
interface BulkAddRequest {
  books: Array<{
    book: EnhancedBook
    tempId?: string
  }>
  shelfId: number
  tags: string[]
  userId: string
}

interface BulkAddResponse {
  success: boolean
  results: Array<{
    tempId?: string
    bookId?: number
    isbn?: string
    title: string
    status: 'success' | 'error' | 'duplicate'
    message?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
    duplicates: number
  }
}
```

#### Error Handling Strategy
- **Partial failures**: Continue processing remaining books
- **Duplicate detection**: Use existing enhanced duplicate detection
- **Rollback**: No rollback - partial success is acceptable
- **User feedback**: Clear reporting of success/failure per book

## 🌟 Star Rating System

### 1. Database Schema

#### Schema Updates
```sql
-- Add rating columns to books table
ALTER TABLE books ADD COLUMN user_rating INTEGER; -- 1-5 stars, NULL = unrated
ALTER TABLE books ADD COLUMN average_rating REAL; -- calculated average per location
ALTER TABLE books ADD COLUMN rating_count INTEGER DEFAULT 0; -- number of ratings
ALTER TABLE books ADD COLUMN rating_updated_at DATETIME; -- last rating update

-- Index for performance
CREATE INDEX idx_books_rating ON books(average_rating DESC, rating_count DESC);
CREATE INDEX idx_books_user_rating ON books(user_rating DESC);

-- Optional: Detailed rating history table
CREATE TABLE IF NOT EXISTS book_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(book_id, user_id)
);
```

### 2. Rating Logic

#### Location-Scoped Ratings
- Ratings are isolated per location (leveraging existing multi-user architecture)
- Users can only rate books in locations they have access to
- Average rating calculated across all users in that location
- Personal rating vs location average clearly distinguished

#### API Endpoints
```typescript
// POST /api/books/{id}/rate
interface RateBookRequest {
  rating: number // 1-5
  bookId: number
  userId: string
}

// GET /api/books/{id}/ratings
interface BookRatingsResponse {
  userRating: number | null
  averageRating: number | null
  ratingCount: number
  locationId: number
}
```

### 3. UI Implementation

#### Rating Components
```typescript
// StarRating.tsx - Display component
interface StarRatingProps {
  rating: number | null
  averageRating?: number | null
  ratingCount?: number
  size?: 'small' | 'medium' | 'large'
  showCount?: boolean
  showAverage?: boolean
}

// StarRatingInput.tsx - Interactive component
interface StarRatingInputProps {
  currentRating: number | null
  onRatingChange: (rating: number) => void
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
}

// RatingModal.tsx - Full rating interface
interface RatingModalProps {
  book: EnhancedBook
  isOpen: boolean
  onClose: () => void
  onRatingSubmit: (rating: number) => Promise<void>
}
```

#### Integration Points
- **BookGrid/BookList/BookCompact**: Display star ratings below book info
- **BookPreview**: Show detailed rating info and allow rating
- **More Details Modal**: Full rating interface with history
- **BookFilters**: Add rating-based sorting options

## 📋 Implementation Phases

### Phase 1: Selection Infrastructure (Week 1)
**Goal**: Basic multi-select functionality in search results

#### Tasks:
1. **Context Setup**
   - Create BookSelectionContext and provider
   - Add provider to AddBooks component
   - Implement basic state management

2. **Search Integration**
   - Add selection checkboxes to BookSearch cards
   - Implement selection/deselection logic
   - Add visual indicators for selected state

3. **Cart Indicator**
   - Create cart indicator component in AddBooks header
   - Show selected count and cart icon
   - Add cart preview on hover/click

4. **Mode Toggle**
   - Add selection mode toggle button
   - Handle mode switching gracefully
   - Persist mode preference

**Deliverables**:
- Working multi-select in search results
- Basic cart indicator
- Selection mode toggle

### Phase 2: Bulk Operations (Week 2)
**Goal**: Complete bulk addition workflow

#### Tasks:
1. **Bulk Review Interface**
   - Create BulkReviewModal component
   - Display all selected books with thumbnails
   - Allow individual book removal from selection

2. **Shared Controls**
   - Single shelf selector for all books
   - Single tags input for all books
   - Validation and error handling

3. **Bulk API**
   - Implement /api/books/bulk endpoint
   - Handle partial failures gracefully
   - Return detailed success/failure report

4. **Progress & Feedback**
   - Add loading states during bulk operations
   - Show progress for large selections
   - Display detailed results to user

**Deliverables**:
- Complete bulk addition workflow
- Bulk API endpoint
- Progress indication and error handling

### Phase 3: Complete Integration (Week 3)
**Goal**: Multi-select across all input methods

#### Tasks:
1. **ISBN Scanner Integration**
   - Add selection option to ISBN scanner results
   - Handle single-book selections gracefully
   - Maintain existing instant-add workflow

2. **UX Polish**
   - Add animations for selection state changes
   - Improve visual feedback
   - Add keyboard shortcuts (Ctrl+A, etc.)

3. **Edge Cases**
   - Handle duplicate selections across sources
   - Session persistence and recovery
   - Mobile UX optimization

**Deliverables**:
- Multi-select across all input methods
- Polished UX with animations
- Mobile optimization

### Phase 4: Star Rating System (Week 4)
**Goal**: Complete rating system implementation

#### Tasks:
1. **Database Migration**
   - Add rating columns to books table
   - Create migration script
   - Update TypeScript interfaces

2. **Rating API**
   - Implement rating endpoints
   - Add rating calculation logic
   - Handle rating updates

3. **UI Components**
   - Create StarRating display component
   - Create StarRatingInput interactive component
   - Create RatingModal for detailed rating

4. **Integration**
   - Add ratings to all book views
   - Add rating-based sorting
   - Handle rating permissions

**Deliverables**:
- Complete star rating system
- Rating display across all views
- Rating-based sorting and filtering

## 🎨 UX Design Principles

### 1. Progressive Enhancement
- **Graceful degradation**: Individual book workflow always works
- **Optional features**: Bulk mode is enhancement, not requirement
- **Familiar patterns**: Shopping cart metaphor for selections

### 2. Visual Design
- **Clear selection state**: Checkboxes with visual feedback
- **Non-intrusive cart**: Floating cart indicator
- **Consistent iconography**: Use existing Material UI icons
- **Color coding**: Success green, warning orange, error red

### 3. Performance Considerations
- **Optimistic updates**: Immediate UI feedback
- **Lazy loading**: Only load bulk components when needed
- **Efficient state**: Minimal data in selection state
- **Memory management**: Clear selections after use

### 4. Accessibility
- **Keyboard navigation**: Full keyboard support for selections
- **Screen readers**: Proper ARIA labels for selection state
- **High contrast**: Clear visual distinction for selections
- **Focus management**: Logical tab order

## 🔧 Technical Considerations

### 1. State Management
- **Context vs Redux**: Use React Context for simplicity
- **Persistence**: Consent-aware localStorage for selections
- **Memory cleanup**: Clear old selections automatically
- **Performance**: Use Map for O(1) selection operations

### 2. API Design
- **Batch processing**: Handle large selections efficiently
- **Error isolation**: Individual book failures don't stop batch
- **Rate limiting**: Reasonable limits on bulk operations
- **Duplicate handling**: Leverage existing duplicate detection

### 3. Database Performance
- **Efficient queries**: Batch inserts for bulk operations
- **Indexing**: Proper indexes for rating queries
- **Migration strategy**: Backward-compatible schema changes
- **Data validation**: Server-side validation for all operations

### 4. Testing Strategy
- **Unit tests**: Individual component testing
- **Integration tests**: Full workflow testing
- **Performance tests**: Large selection handling
- **Accessibility tests**: Screen reader compatibility

## 📊 Success Metrics

### 1. User Experience Metrics
- **Adoption rate**: Percentage of users using bulk features
- **Time savings**: Average time to add multiple books
- **Error rate**: Bulk operation failure rate
- **User satisfaction**: Feedback on bulk workflow

### 2. Technical Metrics
- **Performance**: Bulk operation response times
- **Error handling**: Partial failure recovery rate
- **Memory usage**: Selection state memory footprint
- **API efficiency**: Bulk vs individual operation efficiency

### 3. Business Metrics
- **Book addition volume**: Increase in books added per session
- **Session length**: Time spent adding books
- **Feature usage**: Multi-select vs single-book usage
- **Rating engagement**: Percentage of books rated

## 🚀 Future Enhancements

### 1. Advanced Selection Features
- **Smart filters**: Select all books by author/genre
- **Saved selections**: Bookmark common book collections
- **Import/export**: Share selections between users
- **Collaborative selections**: Multi-user selection sessions

### 2. Enhanced Ratings
- **Review system**: Text reviews alongside ratings
- **Rating trends**: Track rating changes over time
- **Recommendation engine**: Suggest books based on ratings
- **External ratings**: Import ratings from Goodreads/Amazon

### 3. Bulk Operations Expansion
- **Bulk editing**: Change shelf/tags for multiple existing books
- **Bulk export**: Export multiple books to various formats
- **Bulk removal**: Remove multiple books at once
- **Bulk checkout**: Check out multiple books simultaneously

## 📚 Implementation Resources

### 1. Component Dependencies
- Material UI: Checkbox, ToggleButton, Modal, Progress
- React: Context, useState, useEffect, useMemo
- TypeScript: Interfaces, generics, strict typing

### 2. Testing Tools
- Jest: Unit testing
- React Testing Library: Component testing
- Cypress: E2E testing
- Lighthouse: Performance testing

### 3. Documentation Updates
- Component documentation
- API documentation
- User guide updates
- Migration guide

---

**Document Version**: 1.0  
**Last Updated**: June 19, 2025  
**Next Review**: After Phase 1 implementation  
**Approval Required**: Technical lead, Product owner